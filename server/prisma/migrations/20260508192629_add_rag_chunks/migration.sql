-- DropForeignKey
ALTER TABLE "affectations" DROP CONSTRAINT "affectations_encadrant_id_fkey";

-- DropForeignKey
ALTER TABLE "affectations" DROP CONSTRAINT "affectations_theme_id_fkey";

-- AlterTable
ALTER TABLE "affectations" ALTER COLUMN "theme_id" DROP NOT NULL,
ALTER COLUMN "encadrant_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "documents_rag" ADD COLUMN     "nb_chunks" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "rag_chunks" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "embedding" vector(1536),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rag_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rag_chunks_document_id_idx" ON "rag_chunks"("document_id");

-- AddForeignKey
ALTER TABLE "affectations" ADD CONSTRAINT "affectations_theme_id_fkey" FOREIGN KEY ("theme_id") REFERENCES "themes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affectations" ADD CONSTRAINT "affectations_encadrant_id_fkey" FOREIGN KEY ("encadrant_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rag_chunks" ADD CONSTRAINT "rag_chunks_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents_rag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- HNSW index for fast cosine similarity search (pgvector)
CREATE INDEX IF NOT EXISTS "rag_chunks_embedding_hnsw_idx"
  ON "rag_chunks" USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
