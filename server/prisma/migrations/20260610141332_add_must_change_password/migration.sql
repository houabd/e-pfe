-- CreateEnum
CREATE TYPE "StatutDemandeModification" AS ENUM ('PENDING', 'ACCEPTED', 'REFUSED');

-- CreateEnum
CREATE TYPE "StatutProposition" AS ENUM ('PENDING', 'ACCEPTED', 'REFUSED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TypeNotification" ADD VALUE 'BINOME_AJOUTE';
ALTER TYPE "TypeNotification" ADD VALUE 'THEME_CHOSEN_HANDLED';
ALTER TYPE "TypeNotification" ADD VALUE 'STARTUP_MEMBRE_AJOUTE';
ALTER TYPE "TypeNotification" ADD VALUE 'STARTUP_INVITATION';
ALTER TYPE "TypeNotification" ADD VALUE 'STARTUP_PROPOSITION';
ALTER TYPE "TypeNotification" ADD VALUE 'STARTUP_PROPOSITION_ACCEPTEE';
ALTER TYPE "TypeNotification" ADD VALUE 'STARTUP_PROPOSITION_REFUSEE';
ALTER TYPE "TypeNotification" ADD VALUE 'MODIFICATION_DEMANDE';
ALTER TYPE "TypeNotification" ADD VALUE 'MODIFICATION_ACCEPTEE';
ALTER TYPE "TypeNotification" ADD VALUE 'MODIFICATION_REFUSEE';
ALTER TYPE "TypeNotification" ADD VALUE 'SOUTENANCE_MODIFIEE';
ALTER TYPE "TypeNotification" ADD VALUE 'SOUTENANCE_ANNULEE';
ALTER TYPE "TypeNotification" ADD VALUE 'THEME_SOUTENU';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "must_change_password" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "membres_externes" (
    "id" TEXT NOT NULL,
    "affectation_id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "specialite" TEXT,
    "universite" TEXT,
    "commentaire" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "membres_externes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "propositions_membre" (
    "id" TEXT NOT NULL,
    "affectation_id" TEXT NOT NULL,
    "proposeur_id" TEXT NOT NULL,
    "candidat_interne_id" TEXT,
    "candidat_externe" JSONB,
    "statut" "StatutProposition" NOT NULL DEFAULT 'PENDING',
    "etudiant_accepte" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "propositions_membre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demandes_modification_theme" (
    "id" TEXT NOT NULL,
    "theme_id" TEXT NOT NULL,
    "demandeur_id" TEXT NOT NULL,
    "motif" TEXT NOT NULL,
    "statut" "StatutDemandeModification" NOT NULL DEFAULT 'PENDING',
    "commentaire_admin" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "demandes_modification_theme_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "membres_externes_affectation_id_idx" ON "membres_externes"("affectation_id");

-- CreateIndex
CREATE INDEX "propositions_membre_affectation_id_idx" ON "propositions_membre"("affectation_id");

-- CreateIndex
CREATE INDEX "propositions_membre_proposeur_id_idx" ON "propositions_membre"("proposeur_id");

-- CreateIndex
CREATE INDEX "demandes_modification_theme_theme_id_idx" ON "demandes_modification_theme"("theme_id");

-- CreateIndex
CREATE INDEX "demandes_modification_theme_demandeur_id_idx" ON "demandes_modification_theme"("demandeur_id");

-- CreateIndex
CREATE INDEX "demandes_modification_theme_statut_idx" ON "demandes_modification_theme"("statut");

-- AddForeignKey
ALTER TABLE "membres_externes" ADD CONSTRAINT "membres_externes_affectation_id_fkey" FOREIGN KEY ("affectation_id") REFERENCES "affectations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "propositions_membre" ADD CONSTRAINT "propositions_membre_affectation_id_fkey" FOREIGN KEY ("affectation_id") REFERENCES "affectations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "propositions_membre" ADD CONSTRAINT "propositions_membre_proposeur_id_fkey" FOREIGN KEY ("proposeur_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "propositions_membre" ADD CONSTRAINT "propositions_membre_candidat_interne_id_fkey" FOREIGN KEY ("candidat_interne_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demandes_modification_theme" ADD CONSTRAINT "demandes_modification_theme_theme_id_fkey" FOREIGN KEY ("theme_id") REFERENCES "themes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demandes_modification_theme" ADD CONSTRAINT "demandes_modification_theme_demandeur_id_fkey" FOREIGN KEY ("demandeur_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
