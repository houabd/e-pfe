import logging

from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage

from config import LLM_MODEL

logger = logging.getLogger(__name__)

_SYSTEM = """Tu es un assistant qui reformule les questions des étudiants
en termes techniques utilisés dans le guide LMD algérien.

Reformule cette question en mots clés techniques du document.
Voici le vocabulaire exact à utiliser :

- "passer d'une année" -> "passage L1 L2 L3 M1 M2 progression"
- "redoubler" -> "redoublement doublement"
- "notes" -> "crédits validation UE semestre"
- "rattrapage" -> "session rattrapage dettes antérieures"
- "master" -> "admission master inscription M1 M2"
- "absences" -> "assiduité TD TP justifiée non justifiée"
- "diplôme" -> "licence master doctorat crédits capitalisés"
- "moyenne" -> "compensation validation 10/20"
- "types de cours" -> "UEF UEM UED UET unités enseignement"
- "changer de filière" -> "réorientation passerelle parcours"
- "mémoire" -> "mémoire fin études soutenance jury"
- "doctorat" -> "troisième cycle thèse directeur recherche"
- "PFE" -> "Projet de Fin d'Études soutenance encadrant jury"

Retourne UNIQUEMENT les mots clés, pas une phrase complète."""


def rewrite_query(question: str) -> str:
    """Rewrites the query to LMD keywords for better retrieval. Falls back to original on failure."""
    try:
        llm = ChatGroq(model=LLM_MODEL, temperature=0, max_tokens=80)
        messages = [
            SystemMessage(content=_SYSTEM),
            HumanMessage(content=f"Question originale : {question}\nMots clés :"),
        ]
        response = llm.invoke(messages)
        rewritten = response.content.strip()
        if rewritten and len(rewritten) > 5:
            print(f"[REWRITER] Original  : {question}")
            print(f"[REWRITER] Reformulé : {rewritten}")
            return rewritten
    except Exception as exc:
        logger.warning(f"Query rewriter failed, using original query. Reason: {exc}")
    return question
