-- Add co_encadrant_id and modification_autorisee to themes table
-- Using IF NOT EXISTS to handle environments that already have these columns (e.g. via db push)

ALTER TABLE "themes" ADD COLUMN IF NOT EXISTS "co_encadrant_id" TEXT;
ALTER TABLE "themes" ADD COLUMN IF NOT EXISTS "modification_autorisee" BOOLEAN NOT NULL DEFAULT false;

-- Foreign key: co_encadrant -> users (only if not already present)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'themes_co_encadrant_id_fkey'
  ) THEN
    ALTER TABLE "themes"
      ADD CONSTRAINT "themes_co_encadrant_id_fkey"
      FOREIGN KEY ("co_encadrant_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Notification types for co-encadrant flow (already added in encadrant_valide migration, safe to re-run)
ALTER TYPE "TypeNotification" ADD VALUE IF NOT EXISTS 'ENCADRANT_CONFIRM_REQUEST';
ALTER TYPE "TypeNotification" ADD VALUE IF NOT EXISTS 'ENCADRANT_CONFIRM_RESPONSE';
