# debug.py — à lancer depuis le dossier chatbot/
import sys
sys.path.append(".")

from hybrid_retriever import get_vectorstore

vs = get_vectorstore()

# Cherche les chunks liés au redoublement
results = vs.similarity_search_with_score(
    "redoublement notes CC effacées matière",
    k=5
)

if not results:
    print("❌ AUCUN chunk trouvé — le passage n'est pas indexé")
else:
    for i, (doc, score) in enumerate(results):
        print(f"\n--- Chunk {i+1} | Score: {score:.3f} ---")
        print(doc.page_content[:400])
        print(f"Metadata: {doc.metadata}")