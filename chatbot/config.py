import os
from pathlib import Path

BASE_DIR = Path(__file__).parent


def _load_env(path: Path) -> None:
    """Lecteur .env robuste : gère UTF-8 BOM, UTF-16, CRLF, guillemets."""
    if not path.exists():
        return
    for encoding in ("utf-8-sig", "utf-16", "utf-8", "latin-1"):
        try:
            text = path.read_text(encoding=encoding)
            break
        except (UnicodeDecodeError, UnicodeError):
            continue
    else:
        return
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


_load_env(BASE_DIR / ".env")

CHROMA_DIR      = str(BASE_DIR / "chroma_db")
COLLECTION_NAME = "epfc_docs"

EMBED_MODEL    = "paraphrase-multilingual-mpnet-base-v2"
RERANKER_MODEL = "cross-encoder/ms-marco-MiniLM-L-6-v2"

LLAMAPARSE_API_KEY = os.environ.get("LLAMAPARSE_API_KEY", "")
GROQ_API_KEY       = os.environ.get("GROQ_API_KEY", "")

LLM_MODEL = "llama-3.3-70b-versatile"

RERANKER_THRESHOLD = -5.0
TOP_K_RETRIEVAL    = 8
TOP_K_RERANKED     = 5

CHUNK_SIZE    = 1000
CHUNK_OVERLAP = 200

MAX_TOKENS       = 1500
MAX_FILE_SIZE_MB = 10
