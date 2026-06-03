-- Add encadrant_valide field (default true = all existing themes already confirmed)
ALTER TABLE "themes" ADD COLUMN "encadrant_valide" BOOLEAN NOT NULL DEFAULT true;

-- Add new notification types
ALTER TYPE "TypeNotification" ADD VALUE IF NOT EXISTS 'ENCADRANT_CONFIRM_REQUEST';
ALTER TYPE "TypeNotification" ADD VALUE IF NOT EXISTS 'ENCADRANT_CONFIRM_RESPONSE';
