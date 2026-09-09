-- AlterTable
ALTER TABLE "listings" ADD COLUMN "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "featured_at" TIMESTAMP(3);
