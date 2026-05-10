-- Resize embedding column from vector(1536) to vector(768)
DROP INDEX IF EXISTS "rag_chunks_embedding_hnsw_idx";
ALTER TABLE "rag_chunks" DROP COLUMN "embedding";
ALTER TABLE "rag_chunks" ADD COLUMN "embedding" vector(768);
CREATE INDEX "rag_chunks_embedding_hnsw_idx"
  ON "rag_chunks" USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
