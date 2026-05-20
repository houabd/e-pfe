import asyncio
import json
import logging
from typing import AsyncGenerator

from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.documents import Document

from hybrid_retriever import build_retriever
from reranker import rerank
from prompts import SYSTEM
from config import LLM_MODEL, GROQ_API_KEY, MAX_TOKENS

logger = logging.getLogger(__name__)

NO_DOCS = "Aucun document indexé pour le moment."
NO_INFO = "Je ne trouve pas cette information dans les documents fournis."


def _get_llm() -> ChatGroq:
    # Ne pas passer api_key explicitement : ChatGroq lit GROQ_API_KEY depuis os.environ
    return ChatGroq(
        model=LLM_MODEL,
        temperature=0,
        max_tokens=MAX_TOKENS,
    )


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
    retriever = build_retriever()
    if retriever is None:
        return {"answer": NO_DOCS, "sources": [], "confidence": 0.0}

    docs = retriever.invoke(question)
    reranked = rerank(question, docs)

    if not reranked:
        return {"answer": NO_INFO, "sources": [], "confidence": 0.0}

    context, sources, confidence = _build_context(reranked)
    logger.info(f"RAG : {len(reranked)} chunks retenus | confiance={confidence:.3f}")

    messages = [
        SystemMessage(content=SYSTEM),
        HumanMessage(content=_build_user_message(context, question)),
    ]
    response = _get_llm().invoke(messages)
    return {"answer": response.content, "sources": sources, "confidence": confidence}


async def stream_rag(question: str) -> AsyncGenerator[str, None]:
    retriever = await asyncio.to_thread(build_retriever)
    if retriever is None:
        yield f"data: {json.dumps({'type': 'error', 'message': NO_DOCS})}\n\n"
        return

    docs = await asyncio.to_thread(retriever.invoke, question)
    reranked = await asyncio.to_thread(rerank, question, docs)

    if not reranked:
        yield f"data: {json.dumps({'type': 'error', 'message': NO_INFO})}\n\n"
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

    yield f"data: {json.dumps({'type': 'done', 'sources': sources, 'chunks_used': chunks_used, 'confidence': confidence})}\n\n"
