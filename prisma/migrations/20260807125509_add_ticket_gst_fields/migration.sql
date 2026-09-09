-- AlterTable
ALTER TABLE "ticket_types" ADD COLUMN     "gst_inclusive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "gst_percent" DECIMAL(5,2) NOT NULL DEFAULT 18.00;
