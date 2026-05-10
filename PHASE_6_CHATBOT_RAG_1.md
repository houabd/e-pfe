# Phase 6 — Chatbot RAG (FastAPI Python) & Finalisation (Semaine 17-19)

## Objectifs
Microservice RAG en Python indépendant, intégré au backend Node.js via proxy, interface chat streamée sans hallucinations, et finalisation de l'application.

---

## Décisions architecturales RAG

| Paramètre | Valeur | Raison |
|-----------|--------|--------|
| Framework RAG | FastAPI + Python | Écosystème IA Python plus riche, pymupdf supérieur pour PDFs |
| Chunking | 800 chars, overlap 150 | Meilleur pour le français académique |
| Lib chunking | `langchain-text-splitters` | `RecursiveCharacterTextSplitter` > chunking manuel |
| Embedding | `nomic-embed-text` 768d | Gratuit, local, Ollama |
| Seuil similarité | 0.40 | Calibré pour nomic 768d (pas 0.50) |
| topK | 3 | Moins de bruit = moins d'hallucinations |
| Reformulation | Désactivée | Trop lente sur CPU, gain marginal |
| Streaming | SSE via `StreamingResponse` | Masque la latence Ollama |
| max_tokens | 300 | Suffisant PFE + plus rapide |
| temperature | 0.1 | Déterministe = moins d'hallucinations |
| keep_alive Ollama | 60 min | Évite rechargement modèle entre requêtes |
| LLM recommandé | `llama3.2` | Meilleur rapport qualité/vitesse sur CPU |

---

## Architecture du microservice

```
Frontend React
      │
      ▼
Node.js/Express (port 3001)   ← point d'entrée unique pour le frontend
      │  auth + RBAC + multer
      │  proxy SSE transparent
      ▼
FastAPI Python (port 8000)    ← microservice RAG
      ├── POST /chatbot/ask-stream
      ├── POST /chatbot/embed-document
      ├── DELETE /chatbot/document/:id
      └── GET  /health
            │
      ┌─────┴──────┐
      ▼            ▼
   Ollama      PostgreSQL
(nomic-embed  (pgvector —
  + llama3.2)  même BD que
               le backend)
```

---

## Étape 6.0 — Prérequis (Semaine 17 — Jour 1 matin, 1h)

- [ ] Vérifier pgvector disponible sur PostgreSQL
- [ ] Télécharger les modèles Ollama :
  ```bash
  ollama pull llama3.2
  ollama pull nomic-embed-text
  ```
- [ ] Créer le dossier `rag-service/` à la racine du monorepo
- [ ] Ajouter `RAG_SERVICE_URL=http://localhost:8000` dans `.env`

---

## Étape 6.1 — Structure et configuration du microservice Python (Semaine 17 — Jour 1 matin, 30 min)

**Structure du microservice :**
```
rag-service/
├── main.py
├── config.py
├── database.py
├── services/
│   ├── pdf_extractor.py
│   ├── chunker.py
│   ├── embedder.py
│   ├── vector_store.py
│   └── rag_pipeline.py
├── routers/
│   └── chatbot.py
├── requirements.txt
└── Dockerfile
```

- [ ] Créer `requirements.txt` :
  ```
  fastapi==0.115.0
  uvicorn[standard]==0.30.0
  pydantic==2.7.0
  pydantic-settings==2.3.0
  pymupdf==1.24.0
  langchain-text-splitters==0.2.0
  ollama==0.2.0
  asyncpg==0.29.0
  pgvector==0.3.0
  python-multipart==0.0.9
  ```
- [ ] Créer `config.py` avec `pydantic-settings` (lecture depuis `.env`) :
  - `database_url`, `ollama_host`, `embedding_model`, `llm_model`
  - `chunk_size=800`, `chunk_overlap=150`, `top_k=3`, `similarity_threshold=0.40`, `max_tokens=300`

---

## Étape 6.2 — Base de données (Semaine 17 — Jour 1 matin, 30 min)

- [ ] Ajouter dans `prisma/schema.prisma` :
  ```prisma
  model DocumentRag {
    id          String     @id @default(uuid())
    titre       String
    file_path   String
    uploaded_by String
    nb_chunks   Int        @default(0)
    created_at  DateTime   @default(now())
    uploader    User       @relation(fields: [uploaded_by], references: [id])
    chunks      RagChunk[]
    @@map("documents_rag")
  }

  model RagChunk {
    id          String      @id @default(uuid())
    document_id String
    content     String
    chunk_index Int
    document    DocumentRag @relation(
                  fields: [document_id], references: [id], onDelete: Cascade)
    @@map("rag_chunks")
  }
  ```
- [ ] Appliquer la migration Prisma :
  ```bash
  npx prisma migrate dev --name add_rag_tables
  ```
- [ ] Ajouter la colonne `embedding` via migration SQL brute (pgvector non supporté nativement par Prisma) :
  ```sql
  CREATE EXTENSION IF NOT EXISTS vector;
  ALTER TABLE rag_chunks ADD COLUMN IF NOT EXISTS embedding vector(768);
  CREATE INDEX IF NOT EXISTS rag_chunks_embedding_idx
    ON rag_chunks USING hnsw (embedding vector_cosine_ops);
  ```
- [ ] Créer `database.py` — pool `asyncpg` avec `register_vector` (pgvector) :
  - `get_pool()` — crée le pool au premier appel (min=2, max=10)
  - `close_pool()` — ferme proprement à l'arrêt du service

---

## Étape 6.3 — Services Python (Semaine 17 — Jour 1 après-midi + Jour 2 matin, 3h)

### 6.3.1 — Extraction PDF (`services/pdf_extractor.py`)
- [ ] `pymupdf (fitz)` — extraction page par page, jointure avec `\n\n`
- [ ] Gère les PDFs multi-colonnes et mise en page complexe (supérieur à pdf-parse Node.js)
- [ ] Lever `ValueError` explicite si texte < 50 chars (PDF scanné sans OCR)

### 6.3.2 — Chunking (`services/chunker.py`)
- [ ] `RecursiveCharacterTextSplitter` :
  - `chunk_size=800`, `chunk_overlap=150`
  - `separators=["\n\n", "\n", ". ", " "]` — priorité aux paragraphes puis phrases
- [ ] Filtrer les chunks < 80 caractères après split

### 6.3.3 — Embedding (`services/embedder.py`)
- [ ] `ollama.AsyncClient` avec `nomic-embed-text`
- [ ] `embed_single(text)` → `list[float]`
- [ ] `embed_batch(texts, batch_size=20)` → `list[list[float]]`

### 6.3.4 — Vector store (`services/vector_store.py`)
- [ ] `save_chunks(document_id, chunks, embeddings)` :
  - Transaction asyncpg — insert dans `rag_chunks` avec embedding
  - Update `nb_chunks` dans `documents_rag`
- [ ] `search(question_embedding)` — requête SQL cosine distance :
  ```sql
  SELECT rc.content, dr.titre AS document_titre,
    ROUND((1 - (rc.embedding <=> $1))::numeric, 4) AS similarity
  FROM rag_chunks rc
  JOIN documents_rag dr ON dr.id = rc.document_id
  WHERE rc.embedding IS NOT NULL
  ORDER BY rc.embedding <=> $1
  LIMIT $2
  ```
  - Filtre post-requête : `similarity >= 0.40`
- [ ] `delete_document_chunks(document_id)` — `DELETE FROM rag_chunks WHERE document_id = $1`

### 6.3.5 — Pipeline RAG (`services/rag_pipeline.py`)
- [ ] System prompt strict anti-hallucination :
  ```
  Tu es l'assistant virtuel du département d'informatique.
  Tu aides sur les PFE (règlements, procédures, thèmes, encadrants).
  Réponds en français, de façon claire et concise.
  Si les documents fournis ne contiennent pas la réponse, dis EXPLICITEMENT :
  "Je n'ai pas cette information dans ma base de connaissance.
  Contactez le département directement."
  Ne fabrique JAMAIS d'informations. Pas de supposition.
  ```
- [ ] `ask_stream(question)` → `AsyncGenerator[dict, None]` :
  1. `embed_single(question)` — question brute, pas de reformulation
  2. `vector_store.search(embedding)` — topK=3, seuil=0.40
  3. Construire `contextBlock` si chunks trouvés, sinon question seule
  4. `ollama.chat(stream=True, temperature=0.1, num_predict=300)`
  5. `yield { type: "chunk", content }` pour chaque token reçu
  6. `yield { type: "done", sources, chunks_used }` à la fin du stream
  7. `yield { type: "error", message }` si exception levée

---

## Étape 6.4 — Router FastAPI et point d'entrée (Semaine 17 — Jour 2 après-midi, 1h30)

### `routers/chatbot.py`
- [ ] `POST /chatbot/ask-stream` → `StreamingResponse` SSE :
  - `media_type="text/event-stream"`
  - Headers : `Cache-Control: no-cache`, `X-Accel-Buffering: no`
  - Générateur async qui yield `data: {json}\n\n` pour chaque event du pipeline
- [ ] `POST /chatbot/embed-document?document_id=...` — upload PDF + pipeline complet :
  - Sauvegarder le fichier reçu
  - `extract` → `chunk` → `embed_batch` → `save_chunks`
  - Retourner `{ nb_chunks }`
  - Supprimer fichier + lever `HTTPException(400)` si extraction échoue
- [ ] `DELETE /chatbot/document/{document_id}` → `delete_document_chunks`
- [ ] `GET /health` → `{ status: "ok" }`

### `main.py`
- [ ] `lifespan` async context manager :
  - Démarrage : `await get_pool()` + `asyncio.create_task(keep_ollama_warm())`
  - Arrêt propre : `await close_pool()`
- [ ] `keep_ollama_warm()` — appel Ollama toutes les 55 min avec `keep_alive="60m"` et `num_predict=1`
  - Évite le rechargement du modèle après inactivité (cause principale de lenteur perçue)
- [ ] `app.include_router(chatbot_router)`

---

## Étape 6.5 — Adapter le backend Node.js (proxy) (Semaine 18 — Jour 1 matin, 1h)

Node.js conserve la gestion des droits (RBAC), des fichiers (multer), et de la BD (Prisma). Il délègue uniquement le traitement RAG au microservice Python.

### `chatbot.service.ts` — 3 fonctions à implémenter

- [ ] `uploadDocument(file, uploadedBy)` :
  1. Créer le document dans `documents_rag` via Prisma (`nb_chunks: 0`)
  2. Envoyer le fichier à FastAPI `POST /chatbot/embed-document?document_id=...`
  3. Mettre à jour `nb_chunks` avec la valeur retournée par FastAPI
  4. Retourner `{ id, titre, nb_chunks }`

- [ ] `deleteDocument(id)` :
  1. Appeler FastAPI `DELETE /chatbot/document/:id` (supprime les chunks pgvector)
  2. Supprimer le document en BD via Prisma (cascade sur les chunks)
  3. Supprimer le fichier PDF du disque

- [ ] `proxyAskStream(question, res)` :
  - Appeler FastAPI `POST /chatbot/ask-stream`
  - Lire le `ReadableStream` token par token et écrire directement dans `res`
  - Gérer `res.writableEnded` (client déconnecté en cours de stream)

### `chatbot.routes.ts` — route ask-stream mise à jour

- [ ] Remplacer le générateur local par l'appel proxy :
  ```typescript
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()
  await chatbotService.proxyAskStream(req.body.question, res)
  ```

> ⚠️ Le frontend React (`ChatbotPage.tsx` et `chatbot.api.ts`) ne change pas — il continue d'appeler `/chatbot/ask-stream` sur Node.js exactement comme avant.

---

## Étape 6.6 — Docker Compose (Semaine 18 — Jour 1 après-midi, 30 min)

- [ ] Ajouter dans `docker-compose.yml` :
  ```yaml
  rag-service:
    build: ./rag-service
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: ${DATABASE_URL}
      OLLAMA_HOST: http://ollama:11434
      EMBEDDING_MODEL: nomic-embed-text
      LLM_MODEL: llama3.2
    depends_on:
      - postgres
      - ollama
    volumes:
      - ./uploads/rag:/app/uploads/rag

  ollama:
    image: ollama/ollama
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama

  volumes:
    ollama_data:
  ```
- [ ] Créer `rag-service/Dockerfile` :
  ```dockerfile
  FROM python:3.12-slim
  WORKDIR /app
  COPY requirements.txt .
  RUN pip install --no-cache-dir -r requirements.txt
  COPY . .
  CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
  ```
- [ ] Ajouter `RAG_SERVICE_URL=http://rag-service:8000` dans `.env` production

---

## Étape 6.7 — Interface React — Page admin upload (Semaine 18 — Jour 2 matin, 1h30)

> Le composant chat (`ChatbotPage.tsx`) et l'API (`chatbot.api.ts`) existants sont conservés sans modification.

**Page admin upload documents RAG :**
- [ ] Liste des documents (titre, nb_chunks, date upload, uploadé par)
- [ ] Badge `⚠️ Sans embeddings` si `nb_chunks === 0`
- [ ] Drag & drop PDF (un fichier à la fois, PDF uniquement)
- [ ] Barre de progression upload
- [ ] Message succès avec nb_chunks générés
- [ ] Bouton supprimer avec dialog de confirmation
- [ ] Message d'erreur clair si PDF scanné ou extraction échouée

---

## Étape 6.8 — Polissage et Tests (Semaine 18 — Jour 2 après-midi + Jour 3, 1.5 jours)

**Tests unitaires (Jest)**
- [ ] Service affectation (algorithme semi-auto, cas limites)
- [ ] Service choix (max 3, classement, binôme commun, rechoisir si refusé)
- [ ] Service binôme (une seule demande en parallèle autorisée)

**Tests d'intégration**
- [ ] Endpoints critiques (auth, thèmes, choix, affectation)
- [ ] Pipeline RAG : upload PDF → question → réponse avec sources

**Tests E2E (Playwright)**
- [ ] Workflow étudiant : login → binôme → choix thèmes → attente validation
- [ ] Workflow enseignant : accepter/refuser demande
- [ ] Workflow admin : affectation manuelle + semi-auto

**Polissage**
- [ ] Responsive design (mobile-friendly sur toutes les pages)
- [ ] États vides (aucun thème, session fermée, aucun document RAG)
- [ ] Messages d'erreur en français partout
- [ ] Accessibilité de base (contraste, navigation clavier)

---

## Checklist de validation finale du chatbot

```
□ GET http://localhost:8000/health → { status: "ok" }
□ Upload d'un PDF règlement → nb_chunks > 0 dans la réponse
□ Question sur le contenu → réponse correcte avec sources affichées
□ Question hors contexte → "Je n'ai pas cette information dans ma base de connaissance."
□ Streaming visible token par token dans l'UI
□ Bouton Stop fonctionne (AbortController côté frontend)
□ Log keepalive visible au démarrage du service Python
□ Deuxième question rapide (modèle déjà chaud en RAM)
□ docker-compose up → tout démarre sans erreur
```

---

## Planning Phase 6

| Jour | Matin | Après-midi |
|------|-------|-----------|
| Sem. 17 — Jour 1 | Étapes 6.0 + 6.1 + 6.2 | Étapes 6.3.1 → 6.3.3 |
| Sem. 17 — Jour 2 | Étapes 6.3.4 + 6.3.5 | Étape 6.4 |
| Sem. 18 — Jour 1 | Étape 6.5 (Node.js proxy) | Étape 6.6 (Docker) |
| Sem. 18 — Jour 2 | Étape 6.7 (UI admin upload) | Étape 6.8 (Tests) |
| Sem. 18 — Jour 3 | Étape 6.8 suite (E2E + polissage) | Validation finale chatbot |

---

## Livrable Phase 6

Microservice RAG Python opérationnel. Chatbot streamé sans hallucinations, accessible à tous les rôles et aux visiteurs. Page admin upload fonctionnelle. Application complète testée et prête pour le déploiement.
