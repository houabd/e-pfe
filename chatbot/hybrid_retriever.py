import threading
import logging

from langchain_community.retrievers import BM25Retriever
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_core.documents import Document

from config import CHROMA_DIR, COLLECTION_NAME, EMBED_MODEL, TOP_K_RETRIEVAL

logger = logging.getLogger(__name__)

_embeddings: HuggingFaceEmbeddings | None = None
_vectorstore: Chroma | None = None
_retriever_cache = None
_cached_doc_count: int = -1
_lock = threading.Lock()


def get_embeddings() -> HuggingFaceEmbeddings:
    global _embeddings
    if _embeddings is None:
        logger.info(f"Chargement du modèle d'embeddings : {EMBED_MODEL}")
        _embeddings = HuggingFaceEmbeddings(model_name=EMBED_MODEL)
    return _embeddings


def get_vectorstore() -> Chroma:
    global _vectorstore
    if _vectorstore is None:
        _vectorstore = Chroma(
            collection_name=COLLECTION_NAME,
            embedding_function=get_embeddings(),
            persist_directory=CHROMA_DIR,
        )
    return _vectorstore


def _load_all_docs() -> list[Document]:
    vs = get_vectorstore()
    data = vs._collection.get(include=["documents", "metadatas"])
    texts = data.get("documents") or []
    metas = data.get("metadatas") or [{}] * len(texts)
    return [Document(page_content=t, metadata=m or {}) for t, m in zip(texts, metas)]


def _rrf_merge(results_list: list[list[Document]], top_k: int) -> list[Document]:
    """Reciprocal Rank Fusion — même algorithme qu'EnsembleRetriever, sans l'import fragile."""
    scores: dict[str, float] = {}
    docs_map: dict[str, Document] = {}
    for results in results_list:
        for rank, doc in enumerate(results):
            key = doc.page_content[:200]
            scores[key] = scores.get(key, 0.0) + 1.0 / (rank + 60)
            docs_map[key] = doc
    sorted_keys = sorted(scores, key=lambda x: scores[x], reverse=True)
    return [docs_map[k] for k in sorted_keys[:top_k]]


class _HybridRetriever:
    """BM25 + vecteur fusionnés par RRF."""

    def __init__(self, bm25: BM25Retriever, vector_ret, top_k: int):
        self._bm25 = bm25
        self._vector = vector_ret
        self._top_k = top_k

    def invoke(self, query: str) -> list[Document]:
        bm25_docs = self._bm25.invoke(query)
        vec_docs = self._vector.invoke(query)
        return _rrf_merge([bm25_docs, vec_docs], self._top_k)


def build_retriever() -> _HybridRetriever | None:
    global _retriever_cache, _cached_doc_count

    vs = get_vectorstore()
    current_count = vs._collection.count()

    with _lock:
        if _retriever_cache is not None and current_count == _cached_doc_count:
            return _retriever_cache

        all_docs = _load_all_docs()
        if not all_docs:
            _retriever_cache = None
            _cached_doc_count = current_count
            return None

        logger.info(f"Construction de l'index hybride sur {len(all_docs)} chunks")
        bm25 = BM25Retriever.from_documents(all_docs, k=TOP_K_RETRIEVAL)
        vector_ret = vs.as_retriever(search_kwargs={"k": TOP_K_RETRIEVAL})

        _retriever_cache = _HybridRetriever(bm25, vector_ret, TOP_K_RETRIEVAL * 2)
        _cached_doc_count = current_count

    return _retriever_cache


def invalidate_cache() -> None:
    global _retriever_cache, _cached_doc_count
    with _lock:
        _retriever_cache = None
        _cached_doc_count = -1
