/*
  Warnings:

  - You are about to drop the column `reservation_id` on the `orders` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_reservation_id_fkey";

-- DropIndex
DROP INDEX "orders_reservation_id_key";

-- AlterTable
ALTER TABLE "order_reservations" ADD COLUMN     "order_id" TEXT;

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "reservation_id";

-- AddForeignKey
ALTER TABLE "order_reservations" ADD CONSTRAINT "order_reservations_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
