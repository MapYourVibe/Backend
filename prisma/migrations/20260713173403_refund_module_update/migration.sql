/*
  Warnings:

  - The values [ORGANIZER_CLOSED_DATE] on the enum `RefundReason` will be removed. If these variants are still used in the database, this will fail.
  - The values [VALID] on the enum `TicketStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `amount_in_paise` on the `payouts` table. All the data in the column will be lost.
  - The `status` column on the `payouts` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `amount_in_paise` on the `refunds` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[gateway_refund_id]` on the table `refunds` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[ticket_number]` on the table `tickets` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `gst_amount_in_paise` to the `order_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `gst_percent` to the `order_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `commission_amount_in_paise` to the `payouts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `commission_percent` to the `payouts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `gross_ticket_amount_in_paise` to the `payouts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `net_payout_in_paise` to the `payouts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `final_refund_amount_in_paise` to the `refunds` table without a default value. This is not possible if the table is not empty.
  - Added the required column `payment_id` to the `refunds` table without a default value. This is not possible if the table is not empty.
  - Added the required column `total_amount_in_paise` to the `refunds` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ticket_number` to the `tickets` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `tickets` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'RELEASED', 'FAILED');

-- AlterEnum
BEGIN;
CREATE TYPE "RefundReason_new" AS ENUM ('USER_REQUESTED', 'ORGANIZER_CANCELLED', 'EVENT_CANCELLED');
ALTER TABLE "refunds" ALTER COLUMN "reason" TYPE "RefundReason_new" USING ("reason"::text::"RefundReason_new");
ALTER TYPE "RefundReason" RENAME TO "RefundReason_old";
ALTER TYPE "RefundReason_new" RENAME TO "RefundReason";
DROP TYPE "public"."RefundReason_old";
COMMIT;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "RefundStatus" ADD VALUE 'PROCESSING';
ALTER TYPE "RefundStatus" ADD VALUE 'REJECTED';

-- AlterEnum
BEGIN;
CREATE TYPE "TicketStatus_new" AS ENUM ('ACTIVE', 'USED', 'CANCELLED', 'REFUNDED');
ALTER TABLE "public"."tickets" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "tickets" ALTER COLUMN "status" TYPE "TicketStatus_new" USING ("status"::text::"TicketStatus_new");
ALTER TYPE "TicketStatus" RENAME TO "TicketStatus_old";
ALTER TYPE "TicketStatus_new" RENAME TO "TicketStatus";
DROP TYPE "public"."TicketStatus_old";
ALTER TABLE "tickets" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;

-- AlterTable
ALTER TABLE "listings" ADD COLUMN     "allow_partial_refunds" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "convenience_fee_percent" DECIMAL(5,2) NOT NULL DEFAULT 10.00,
ADD COLUMN     "refund_allowed_until_days" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "refund_enabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "gst_amount_in_paise" INTEGER NOT NULL,
ADD COLUMN     "gst_percent" DECIMAL(5,2) NOT NULL;

-- AlterTable
ALTER TABLE "payouts" DROP COLUMN "amount_in_paise",
ADD COLUMN     "commission_amount_in_paise" INTEGER NOT NULL,
ADD COLUMN     "commission_percent" DECIMAL(5,2) NOT NULL,
ADD COLUMN     "gross_ticket_amount_in_paise" INTEGER NOT NULL,
ADD COLUMN     "gst_on_commission_in_paise" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "net_payout_in_paise" INTEGER NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "refunds" DROP COLUMN "amount_in_paise",
ADD COLUMN     "convenience_fee_in_paise" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "failure_reason" TEXT,
ADD COLUMN     "final_refund_amount_in_paise" INTEGER NOT NULL,
ADD COLUMN     "gateway_refund_id" TEXT,
ADD COLUMN     "gateway_response" JSONB,
ADD COLUMN     "payment_id" TEXT NOT NULL,
ADD COLUMN     "processed_at" TIMESTAMP(3),
ADD COLUMN     "total_amount_in_paise" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "ticket_number" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "platform_settings" (
    "id" TEXT NOT NULL,
    "booking_fee_percent" DECIMAL(5,2) NOT NULL DEFAULT 3.00,
    "refund_deduction_percent" DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    "tcs_percent" DECIMAL(5,2) NOT NULL DEFAULT 1.00,
    "booking_fee_gst_percent" DECIMAL(5,2) NOT NULL DEFAULT 18.00,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refund_items" (
    "id" TEXT NOT NULL,
    "refund_id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "ticket_price_in_paise" INTEGER NOT NULL,
    "deduction_in_paise" INTEGER NOT NULL,
    "refund_amount_in_paise" INTEGER NOT NULL,
    "gst_amount_in_paise" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refund_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "refund_items_refund_id_idx" ON "refund_items"("refund_id");

-- CreateIndex
CREATE INDEX "refund_items_ticket_id_idx" ON "refund_items"("ticket_id");

-- CreateIndex
CREATE UNIQUE INDEX "refund_items_refund_id_ticket_id_key" ON "refund_items"("refund_id", "ticket_id");

-- CreateIndex
CREATE INDEX "check_ins_scanned_by_idx" ON "check_ins"("scanned_by");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "payouts_organizer_id_idx" ON "payouts"("organizer_id");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_gateway_refund_id_key" ON "refunds"("gateway_refund_id");

-- CreateIndex
CREATE INDEX "refunds_order_id_idx" ON "refunds"("order_id");

-- CreateIndex
CREATE INDEX "refunds_payment_id_idx" ON "refunds"("payment_id");

-- CreateIndex
CREATE INDEX "refunds_initiated_by_idx" ON "refunds"("initiated_by");

-- CreateIndex
CREATE INDEX "refunds_status_idx" ON "refunds"("status");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_ticket_number_key" ON "tickets"("ticket_number");

-- CreateIndex
CREATE INDEX "tickets_order_id_idx" ON "tickets"("order_id");

-- CreateIndex
CREATE INDEX "tickets_order_item_id_idx" ON "tickets"("order_item_id");

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_initiated_by_fkey" FOREIGN KEY ("initiated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_items" ADD CONSTRAINT "refund_items_refund_id_fkey" FOREIGN KEY ("refund_id") REFERENCES "refunds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_items" ADD CONSTRAINT "refund_items_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
