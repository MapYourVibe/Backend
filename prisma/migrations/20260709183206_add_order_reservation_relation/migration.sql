/*
  Warnings:

  - A unique constraint covering the columns `[reservation_id]` on the table `orders` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `reservation_id` to the `orders` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "reservation_id" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "orders_reservation_id_key" ON "orders"("reservation_id");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "order_reservations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
