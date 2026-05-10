-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CHEF_DEPT', 'CHEF_EQUIPE', 'RESP_FILIERE', 'RESP_SPECIALITE', 'TECHNICIEN', 'ENSEIGNANT', 'ETUDIANT');

-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('CHOIX', 'AFFECTATION');

-- CreateEnum
CREATE TYPE "ThemeType" AS ENUM ('CLASSIQUE', 'STARTUP');

-- CreateEnum
CREATE TYPE "SousTypeTheme" AS ENUM ('RECHERCHE', 'PROFESSIONNEL', 'LES_DEUX');

-- CreateEnum
CREATE TYPE "StatutValidation" AS ENUM ('NON_VALIDE', 'VALIDE');

-- CreateEnum
CREATE TYPE "StatutChoix" AS ENUM ('PENDING', 'ACCEPTED', 'REFUSED');

-- CreateEnum
CREATE TYPE "StatutBinome" AS ENUM ('PENDING', 'ACCEPTED', 'REFUSED');

-- CreateEnum
CREATE TYPE "TypeAffectation" AS ENUM ('LIBRE', 'AUTO');

-- CreateEnum
CREATE TYPE "RoleJury" AS ENUM ('PRESIDENT', 'EXAMINATEUR');

-- CreateEnum
CREATE TYPE "TypeNotification" AS ENUM ('BINOME_REQUEST', 'BINOME_RESPONSE', 'THEME_CHOSEN', 'THEME_RESPONSE', 'AFFECTATION', 'THEME_VALIDATED', 'SOUTENANCE_PLANIFIEE', 'NEW_DOCUMENT', 'SESSION_UPDATE');

-- CreateTable
CREATE TABLE "specialites" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "specialites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "type" "SessionType" NOT NULL,
    "date_debut" TIMESTAMP(3) NOT NULL,
    "date_fin" TIMESTAMP(3) NOT NULL,
    "annee_universitaire" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "specialite_id" TEXT,
    "date_naissance" TIMESTAMP(3) NOT NULL,
    "matricule" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "annee_universitaire" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "themes" (
    "id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "mots_cles" TEXT[],
    "necessite_stage" BOOLEAN NOT NULL DEFAULT false,
    "type_pfe" "ThemeType" NOT NULL,
    "sous_types" "SousTypeTheme"[],
    "propose_par_id" TEXT NOT NULL,
    "encadrant_id" TEXT,
    "encadrant_externe" JSONB,
    "besoin_encadrant" BOOLEAN NOT NULL DEFAULT false,
    "cherche_binome" BOOLEAN NOT NULL DEFAULT false,
    "statut_validation" "StatutValidation" NOT NULL DEFAULT 'NON_VALIDE',
    "is_affecte" BOOLEAN NOT NULL DEFAULT false,
    "is_soutenu" BOOLEAN NOT NULL DEFAULT false,
    "session_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "themes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "theme_specialites" (
    "theme_id" TEXT NOT NULL,
    "specialite_id" TEXT NOT NULL,

    CONSTRAINT "theme_specialites_pkey" PRIMARY KEY ("theme_id","specialite_id")
);

-- CreateTable
CREATE TABLE "binomes" (
    "id" TEXT NOT NULL,
    "etud1_id" TEXT NOT NULL,
    "etud2_id" TEXT NOT NULL,
    "statut" "StatutBinome" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "binomes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "theme_choix" (
    "id" TEXT NOT NULL,
    "etudiant_id" TEXT NOT NULL,
    "binome_id" TEXT,
    "theme_id" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL,
    "statut" "StatutChoix" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "theme_choix_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affectations" (
    "id" TEXT NOT NULL,
    "theme_id" TEXT NOT NULL,
    "encadrant_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "affecte_par" TEXT NOT NULL,
    "type" "TypeAffectation" NOT NULL DEFAULT 'LIBRE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affectations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affectation_etudiants" (
    "id" TEXT NOT NULL,
    "affectation_id" TEXT NOT NULL,
    "etudiant_id" TEXT NOT NULL,
    "binome_id" TEXT,

    CONSTRAINT "affectation_etudiants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "startup_membres" (
    "id" TEXT NOT NULL,
    "affectation_id" TEXT NOT NULL,
    "etudiant_id" TEXT NOT NULL,
    "role_equipe" TEXT,

    CONSTRAINT "startup_membres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "soutenances" (
    "id" TEXT NOT NULL,
    "theme_id" TEXT NOT NULL,
    "date_soutenance" TIMESTAMP(3) NOT NULL,
    "heure" TEXT NOT NULL,
    "salle" TEXT NOT NULL,
    "annee_universitaire" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "soutenances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "soutenance_jury" (
    "id" TEXT NOT NULL,
    "soutenance_id" TEXT NOT NULL,
    "enseignant_id" TEXT NOT NULL,
    "role" "RoleJury" NOT NULL,

    CONSTRAINT "soutenance_jury_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "TypeNotification" NOT NULL,
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents_rag" (
    "id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_rag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "specialites_nom_key" ON "specialites"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_matricule_key" ON "users"("matricule");

-- CreateIndex
CREATE INDEX "users_specialite_id_idx" ON "users"("specialite_id");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_is_active_idx" ON "users"("is_active");

-- CreateIndex
CREATE INDEX "themes_session_id_idx" ON "themes"("session_id");

-- CreateIndex
CREATE INDEX "themes_statut_validation_idx" ON "themes"("statut_validation");

-- CreateIndex
CREATE INDEX "themes_is_affecte_idx" ON "themes"("is_affecte");

-- CreateIndex
CREATE INDEX "themes_type_pfe_idx" ON "themes"("type_pfe");

-- CreateIndex
CREATE INDEX "binomes_etud1_id_idx" ON "binomes"("etud1_id");

-- CreateIndex
CREATE INDEX "binomes_etud2_id_idx" ON "binomes"("etud2_id");

-- CreateIndex
CREATE INDEX "theme_choix_etudiant_id_idx" ON "theme_choix"("etudiant_id");

-- CreateIndex
CREATE INDEX "theme_choix_theme_id_idx" ON "theme_choix"("theme_id");

-- CreateIndex
CREATE UNIQUE INDEX "affectations_theme_id_key" ON "affectations"("theme_id");

-- CreateIndex
CREATE INDEX "affectations_session_id_idx" ON "affectations"("session_id");

-- CreateIndex
CREATE INDEX "affectations_encadrant_id_idx" ON "affectations"("encadrant_id");

-- CreateIndex
CREATE INDEX "affectation_etudiants_affectation_id_idx" ON "affectation_etudiants"("affectation_id");

-- CreateIndex
CREATE INDEX "affectation_etudiants_etudiant_id_idx" ON "affectation_etudiants"("etudiant_id");

-- CreateIndex
CREATE INDEX "startup_membres_affectation_id_idx" ON "startup_membres"("affectation_id");

-- CreateIndex
CREATE UNIQUE INDEX "soutenances_theme_id_key" ON "soutenances"("theme_id");

-- CreateIndex
CREATE INDEX "soutenance_jury_soutenance_id_idx" ON "soutenance_jury"("soutenance_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_is_read_idx" ON "notifications"("is_read");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_specialite_id_fkey" FOREIGN KEY ("specialite_id") REFERENCES "specialites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "themes" ADD CONSTRAINT "themes_propose_par_id_fkey" FOREIGN KEY ("propose_par_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "themes" ADD CONSTRAINT "themes_encadrant_id_fkey" FOREIGN KEY ("encadrant_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "themes" ADD CONSTRAINT "themes_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "theme_specialites" ADD CONSTRAINT "theme_specialites_theme_id_fkey" FOREIGN KEY ("theme_id") REFERENCES "themes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "theme_specialites" ADD CONSTRAINT "theme_specialites_specialite_id_fkey" FOREIGN KEY ("specialite_id") REFERENCES "specialites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "binomes" ADD CONSTRAINT "binomes_etud1_id_fkey" FOREIGN KEY ("etud1_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "binomes" ADD CONSTRAINT "binomes_etud2_id_fkey" FOREIGN KEY ("etud2_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "theme_choix" ADD CONSTRAINT "theme_choix_etudiant_id_fkey" FOREIGN KEY ("etudiant_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "theme_choix" ADD CONSTRAINT "theme_choix_binome_id_fkey" FOREIGN KEY ("binome_id") REFERENCES "binomes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "theme_choix" ADD CONSTRAINT "theme_choix_theme_id_fkey" FOREIGN KEY ("theme_id") REFERENCES "themes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affectations" ADD CONSTRAINT "affectations_theme_id_fkey" FOREIGN KEY ("theme_id") REFERENCES "themes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affectations" ADD CONSTRAINT "affectations_encadrant_id_fkey" FOREIGN KEY ("encadrant_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affectations" ADD CONSTRAINT "affectations_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affectations" ADD CONSTRAINT "affectations_affecte_par_fkey" FOREIGN KEY ("affecte_par") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affectation_etudiants" ADD CONSTRAINT "affectation_etudiants_affectation_id_fkey" FOREIGN KEY ("affectation_id") REFERENCES "affectations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affectation_etudiants" ADD CONSTRAINT "affectation_etudiants_etudiant_id_fkey" FOREIGN KEY ("etudiant_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affectation_etudiants" ADD CONSTRAINT "affectation_etudiants_binome_id_fkey" FOREIGN KEY ("binome_id") REFERENCES "binomes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "startup_membres" ADD CONSTRAINT "startup_membres_affectation_id_fkey" FOREIGN KEY ("affectation_id") REFERENCES "affectations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "startup_membres" ADD CONSTRAINT "startup_membres_etudiant_id_fkey" FOREIGN KEY ("etudiant_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "soutenances" ADD CONSTRAINT "soutenances_theme_id_fkey" FOREIGN KEY ("theme_id") REFERENCES "themes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "soutenance_jury" ADD CONSTRAINT "soutenance_jury_soutenance_id_fkey" FOREIGN KEY ("soutenance_id") REFERENCES "soutenances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "soutenance_jury" ADD CONSTRAINT "soutenance_jury_enseignant_id_fkey" FOREIGN KEY ("enseignant_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents_rag" ADD CONSTRAINT "documents_rag_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
