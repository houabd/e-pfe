import logging
from sentence_transformers import CrossEncoder
from langchain_core.documents import Document
from config import RERANKER_MODEL, RERANKER_THRESHOLD, TOP_K_RERANKED

logger = logging.getLogger(__name__)

_model: CrossEncoder | None = None


def get_model() -> CrossEncoder:
    global _model
    if _model is None:
        logger.info(f"Chargement du reranker : {RERANKER_MODEL}")
        _model = CrossEncoder(RERANKER_MODEL)
    return _model


def rerank(query: str, docs: list[Document]) -> list[tuple[Document, float]]:
    if not docs:
        return []

    model = get_model()
    pairs = [(query, doc.page_content) for doc in docs]
    scores = model.predict(pairs)

    ranked = sorted(zip(docs, scores.tolist()), key=lambda x: x[1], reverse=True)

    kept = [(doc, float(score)) for doc, score in ranked if float(score) >= RERANKER_THRESHOLD]
    logger.info(f"Reranker : {len(kept)}/{len(docs)} chunks au-dessus du seuil {RERANKER_THRESHOLD}")
    for doc, score in kept:
        logger.debug(f"  score={score:.4f} | {doc.metadata.get('source','?')} | {doc.page_content[:60]!r}")

    return kept[:TOP_K_RERANKED]
