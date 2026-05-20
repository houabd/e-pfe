import logging
from pathlib import Path

from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

from config import LLAMAPARSE_API_KEY, CHUNK_SIZE, CHUNK_OVERLAP

logger = logging.getLogger(__name__)


def _load_pdf(file_path: str) -> list[Document]:
    from llama_parse import LlamaParse
    from llama_index.core.node_parser import MarkdownNodeParser

    if not LLAMAPARSE_API_KEY:
        raise ValueError(
            "LLAMAPARSE_API_KEY non configurée. "
            "Créez un compte sur cloud.llamaindex.ai et ajoutez la clé dans chatbot/.env"
        )

    parser = LlamaParse(
        api_key=LLAMAPARSE_API_KEY,
        result_type="markdown",
        language="fr",
    )
    llama_docs = parser.load_data(file_path)

    if not llama_docs:
        raise ValueError("LlamaParse n'a rien extrait. Vérifiez le fichier PDF.")

    node_parser = MarkdownNodeParser()
    nodes = node_parser.get_nodes_from_documents(llama_docs)

    docs = []
    for node in nodes:
        content = node.get_content().strip()
        if content and len(content) >= 20:
            docs.append(Document(
                page_content=content,
                metadata={"content_type": "text"},
            ))

    if not docs:
        raise ValueError("Aucun contenu extrait après parsing Markdown")

    logger.info(f"LlamaParse : {len(llama_docs)} pages → {len(nodes)} nodes → {len(docs)} chunks")
    return docs


def _load_txt(file_path: str) -> list[Document]:
    text = Path(file_path).read_text(encoding="utf-8")
    if not text.strip():
        raise ValueError("Fichier texte vide")
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=["\n\n\n", "\n\n", "\n", ".", " ", ""],
    )
    return splitter.create_documents([text], metadatas=[{"content_type": "text"}])


def ingest_file(file_path: str, source_name: str, document_id: str | None = None) -> int:
    ext = Path(file_path).suffix.lower()

    if ext == ".pdf":
        docs = _load_pdf(file_path)
    elif ext == ".txt":
        docs = _load_txt(file_path)
    else:
        raise ValueError(f"Format non supporté : {ext}. Seuls PDF et TXT sont acceptés.")

    metadata = {"source": source_name}
    if document_id:
        metadata["document_id"] = document_id

    for doc in docs:
        doc.metadata.update(metadata)

    from hybrid_retriever import get_vectorstore, invalidate_cache
    vs = get_vectorstore()
    vs.add_documents(docs)
    invalidate_cache()

    logger.info(f"Ingéré : '{source_name}' → {len(docs)} chunks (document_id={document_id})")
    return len(docs)
