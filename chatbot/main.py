import asyncio
import logging
import os
import tempfile
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from config import MAX_FILE_SIZE_MB, LLM_MODEL
from hybrid_retriever import get_vectorstore, invalidate_cache, build_retriever
from ingest import ingest_file
from rag_pipeline import run_rag, stream_rag
from reranker import rerank

logging.basicConfig(level=logging.INFO, format="%(levelname)s:%(name)s:%(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    from config import GROQ_API_KEY, LLAMAPARSE_API_KEY
    logger.info(f"GROQ_API_KEY chargée : {'oui' if GROQ_API_KEY else 'NON — clé manquante !'}")
    logger.info(f"LLAMAPARSE_API_KEY chargée : {'oui' if LLAMAPARSE_API_KEY else 'NON — clé manquante !'}")
    logger.info("Initialisation du vectorstore et des modèles…")
    get_vectorstore()
    logger.info(f"Service RAG prêt — LLM : {LLM_MODEL}")
    yield


app = FastAPI(title="RAG anti-hallucination — e-PFE", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_ALLOWED_EXT = {".pdf", ".txt"}
_MAX_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024


class ChatRequest(BaseModel):
    question: str
    session_id: str = ""


async def _save_upload(file: UploadFile) -> tuple[str, str]:
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in _ALLOWED_EXT:
        raise HTTPException(status_code=400, detail="Seuls les fichiers PDF et TXT sont acceptés")
    content = await file.read()
    if len(content) > _MAX_BYTES:
        raise HTTPException(status_code=413, detail=f"Fichier trop grand (max {MAX_FILE_SIZE_MB} Mo)")
    tmp_path = os.path.join(tempfile.gettempdir(), f"{uuid.uuid4()}{ext}")
    with open(tmp_path, "wb") as f:
        f.write(content)
    return tmp_path, ext


# ── Endpoint principal (non-streaming) ────────────────────────────────────────

@app.post("/chat")
def chat(body: ChatRequest):
    q = body.question.strip()
    if not q:
        raise HTTPException(status_code=400, detail="Question manquante")
    try:
        return run_rag(q)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ── Endpoint streaming SSE ────────────────────────────────────────────────────

@app.post("/chatbot/ask-stream")
async def ask_stream(body: dict):
    q = (body.get("question") or "").strip()
    if not q:
        raise HTTPException(status_code=400, detail="Question manquante")
    return StreamingResponse(
        stream_rag(q),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ── Gestion de documents ──────────────────────────────────────────────────────

@app.post("/chatbot/embed-document")
async def embed_document(document_id: str, file: UploadFile = File(...)):
    tmp_path: str | None = None
    try:
        tmp_path, _ = await _save_upload(file)
        nb = await asyncio.to_thread(
            ingest_file, tmp_path, file.filename or "document", document_id
        )
        return {"nb_chunks": nb}
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.exception("Erreur embed_document")
        raise HTTPException(status_code=500, detail=f"Erreur traitement : {exc}")
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)


@app.delete("/chatbot/document/{document_id}")
async def delete_document(document_id: str):
    vs = get_vectorstore()
    vs._collection.delete(where={"document_id": {"$eq": document_id}})
    invalidate_cache()
    return {"message": "Chunks supprimés"}


@app.get("/chatbot/health")
@app.get("/health")
def health():
    vs = get_vectorstore()
    try:
        count = vs._collection.count()
    except Exception:
        count = 0
    return {"status": "ok", "model": LLM_MODEL, "docs_count": count}


# ── Debug : voir ce que le RAG récupère ──────────────────────────────────────

@app.get("/debug/search")
def debug_search(q: str, rerank: bool = True):
    from reranker import rerank as do_rerank
    retriever = build_retriever()
    if retriever is None:
        return {"error": "Aucun document indexé"}

    docs = retriever.invoke(q)
    raw = [
        {
            "content_type": d.metadata.get("content_type", "?"),
            "source": d.metadata.get("source", "?"),
            "preview": d.page_content[:200],
        }
        for d in docs
    ]

    reranked_out = []
    if rerank:
        reranked = do_rerank(q, docs)
        reranked_out = [
            {
                "score": round(score, 4),
                "content_type": d.metadata.get("content_type", "?"),
                "preview": d.page_content[:300],
            }
            for d, score in reranked
        ]

    return {"question": q, "retrieved": raw, "reranked": reranked_out}


# ── Ingest direct (test sans Node.js) ────────────────────────────────────────

@app.post("/ingest")
async def ingest(file: UploadFile = File(...)):
    tmp_path, _ = await _save_upload(file)
    try:
        nb = await asyncio.to_thread(
            ingest_file, tmp_path, file.filename or "document", None
        )
        return {"status": "ok", "chunks_added": nb}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
