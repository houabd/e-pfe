/*
  Warnings:

  - The values [RESP_FILIERE] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `embedding` on the `rag_chunks` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('CHEF_DEPT', 'CHEF_EQUIPE', 'RESP_SPECIALITE', 'TECHNICIEN', 'ENSEIGNANT', 'ETUDIANT');
ALTER TABLE "users" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "Role_old";
COMMIT;

-- DropIndex
DROP INDEX "rag_chunks_embedding_hnsw_idx";

-- AlterTable
ALTER TABLE "rag_chunks" DROP COLUMN "embedding";
