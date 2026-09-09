-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "gst_inclusive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "net_in_paise" INTEGER NOT NULL DEFAULT 0;
