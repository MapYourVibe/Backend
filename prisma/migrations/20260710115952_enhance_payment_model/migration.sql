-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'AUTHORIZED';

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'INR',
ADD COLUMN     "failure_reason" TEXT,
ADD COLUMN     "gateway_response" JSONB,
ADD COLUMN     "gateway_signature" TEXT,
ADD COLUMN     "payment_method" TEXT;
