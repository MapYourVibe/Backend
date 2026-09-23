-- AlterTable: add group-entry support to tickets.
-- Applied directly via `prisma db execute` because migration history had
-- drifted from the live DB; this file records the change for future deploys.
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "entries_allowed" INTEGER NOT NULL DEFAULT 1;
