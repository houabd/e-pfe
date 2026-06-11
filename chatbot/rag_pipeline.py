import asyncio
import json
import logging
import re
from typing import AsyncGenerator

from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.documents import Document

from hybrid_retriever import build_retriever
from reranker import rerank
from query_rewriter import rewrite_query
from prompts import SYSTEM
from config import LLM_MODEL, GROQ_API_KEY, MAX_TOKENS

logger = logging.getLogger(__name__)

NO_DOCS = "Aucun document indexé pour le moment."
NO_INFO = "Je ne trouve pas cette information dans les documents fournis."

_CONVERSATIONAL_RE = re.compile(
    r'^(bonjour|bonsoir|salut|hello|hi|coucou|hey|salam|'
    r'merci|merci beaucoup|thank you|thanks|'
    r'au revoir|bye|goodbye|à bientôt|bonne journée|bonne soirée|bonne nuit|'
    r'comment vas-tu|comment allez-vous|ça va|'
    r'oui|non|ok|d\'accord|parfait|super|bien|'
    r'aide|help|que peux-tu faire|qui es-tu|tu es quoi|c\'est quoi)[.!?\s]*$',
    re.IGNORECASE,
)

def _is_conversational(question: str) -> bool:
    return bool(_CONVERSATIONAL_RE.match(question.strip()))


def _get_llm() -> ChatGroq:
    return ChatGroq(model=LLM_MODEL, temperature=0, max_tokens=MAX_TOKENS)


_CONVERSATIONAL_SYSTEM = (
    "Tu es un assistant universitaire algérien sympathique et professionnel, spécialisé dans "
    "le système LMD et les Projets de Fin d'Études (PFE) à l'Université de Béjaïa. "
    "Réponds aux salutations et messages simples de façon naturelle et chaleureuse. "
    "Rappelle brièvement que tu peux aider sur les questions relatives au PFE, au système LMD, "
    "aux soutenances, aux thèmes et à la plateforme e-PFC. "
    "Réponds dans la même langue que la question. Sois concis."
)

_FALLBACK_SYSTEM = (
    "Tu es un assistant universitaire algérien spécialisé dans le système LMD "
    "(Licence Master Doctorat) et les PFE. "
    "Réponds de manière générale, utile et concise en te basant sur tes connaissances "
    "du système universitaire algérien. Réponds dans la même langue que la question."
)


def _conversational_response(question: str) -> dict:
    try:
        llm = ChatGroq(model=LLM_MODEL, temperature=0.5, max_tokens=200)
        response = llm.invoke([
            SystemMessage(content=_CONVERSATIONAL_SYSTEM),
            HumanMessage(content=question),
        ])
        return {
            "answer": response.content,
            "sources": [],
            "confidence": 1.0,
            "source_type": "general",
            "warning": None,
        }
    except Exception as exc:
        logger.warning(f"Conversational response failed: {exc}")
        return {"answer": "Bonjour ! Comment puis-je vous aider ?", "sources": [], "confidence": 1.0, "source_type": None, "warning": None}


def _fallback_response(question: str) -> dict:
    print(f"[FALLBACK] Groq (connaissance générale) pour : {question}")
    try:
        llm = ChatGroq(model=LLM_MODEL, temperature=0.3, max_tokens=MAX_TOKENS)
        response = llm.invoke([
            SystemMessage(content=_FALLBACK_SYSTEM),
            HumanMessage(content=question),
        ])
        return {
            "answer": response.content,
            "sources": [],
            "confidence": 0.0,
            "source_type": "general",
            "warning": "Cette information ne figure pas dans les documents indexés. Voici une réponse générale :",
        }
    except Exception as exc:
        logger.warning(f"Fallback échoué : {exc}")
        return {
            "answer": NO_INFO,
            "sources": [],
            "confidence": 0.0,
            "source_type": None,
            "warning": None,
        }


def _build_context(reranked: list[tuple[Document, float]]) -> tuple[str, list[str], float]:
    confidence = max(score for _, score in reranked)
    sources = list(dict.fromkeys(
        doc.metadata.get("source", "Document inconnu") for doc, _ in reranked
    ))
    context = "\n\n".join(
        f"[Source: {doc.metadata.get('source', '?')}]\n{doc.page_content}"
        for doc, _ in reranked
    )
    return context, sources, confidence


def _build_user_message(context: str, question: str) -> str:
    return (
        f"Extraits de documents :\n\n"
        f"<context>\n{context}\n</context>\n\n"
        f"Question : {question}\n\n"
        f"⚠️ RAPPEL : Réponds UNIQUEMENT avec le texte ci-dessus. "
        f"Reproduis les sigles et termes techniques exactement (UEF, UEM, UED, UET…). "
        f"Si la réponse n'est pas dans <context>, écris : "
        f"\"Je ne trouve pas cette information dans les documents fournis.\""
    )


def run_rag(question: str) -> dict:
    if _is_conversational(question):
        return _conversational_response(question)

    retriever = build_retriever()
    if retriever is None:
        return {"answer": NO_DOCS, "sources": [], "confidence": 0.0}

    rewritten = rewrite_query(question)
    docs = retriever.invoke(rewritten)
    reranked = rerank(rewritten, docs)

    if not reranked:
        return _fallback_response(question)

    context, sources, confidence = _build_context(reranked)
    logger.info(f"RAG : {len(reranked)} chunks retenus | confiance={confidence:.3f}")

    messages = [
        SystemMessage(content=SYSTEM),
        HumanMessage(content=_build_user_message(context, question)),
    ]
    response = _get_llm().invoke(messages)
    return {
        "answer": response.content,
        "sources": sources,
        "confidence": confidence,
        "source_type": "pdf",
        "warning": None,
    }


async def stream_rag(question: str) -> AsyncGenerator[str, None]:
    if _is_conversational(question):
        try:
            llm = ChatGroq(model=LLM_MODEL, temperature=0.5, max_tokens=200)
            async for chunk in llm.astream([
                SystemMessage(content=_CONVERSATIONAL_SYSTEM),
                HumanMessage(content=question),
            ]):
                if chunk.content:
                    yield f"data: {json.dumps({'type': 'chunk', 'content': chunk.content})}\n\n"
            yield f"data: {json.dumps({'type': 'done', 'sources': [], 'chunks_used': 0, 'confidence': 1.0, 'source_type': 'general'})}\n\n"
        except Exception as exc:
            yield f"data: {json.dumps({'type': 'chunk', 'content': 'Bonjour ! Comment puis-je vous aider ?'})}\n\n"
            yield f"data: {json.dumps({'type': 'done', 'sources': [], 'chunks_used': 0, 'confidence': 1.0, 'source_type': 'general'})}\n\n"
        return

    retriever = await asyncio.to_thread(build_retriever)
    if retriever is None:
        yield f"data: {json.dumps({'type': 'error', 'message': NO_DOCS})}\n\n"
        return

    rewritten = await asyncio.to_thread(rewrite_query, question)
    docs = await asyncio.to_thread(retriever.invoke, rewritten)
    reranked = await asyncio.to_thread(rerank, rewritten, docs)

    if not reranked:
        fallback = await asyncio.to_thread(_fallback_response, question)
        yield f"data: {json.dumps({'type': 'fallback', 'content': fallback['answer'], 'warning': fallback['warning']})}\n\n"
        return

    context, sources, confidence = _build_context(reranked)
    chunks_used = len(reranked)

    messages = [
        SystemMessage(content=SYSTEM),
        HumanMessage(content=_build_user_message(context, question)),
    ]

    try:
        async for chunk in _get_llm().astream(messages):
            content = chunk.content
            if content:
                yield f"data: {json.dumps({'type': 'chunk', 'content': content})}\n\n"
    except Exception as exc:
        yield f"data: {json.dumps({'type': 'error', 'message': str(exc)})}\n\n"
        return

    yield f"data: {json.dumps({'type': 'done', 'sources': sources, 'chunks_used': chunks_used, 'confidence': confidence, 'source_type': 'pdf'})}\n\n"
