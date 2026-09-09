-- AlterTable
ALTER TABLE "users" ADD COLUMN     "email_otp_expires_at" TIMESTAMP(3),
ADD COLUMN     "email_otp_hash" TEXT,
ADD COLUMN     "email_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "otp_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reset_otp_expires_at" TIMESTAMP(3),
ADD COLUMN     "reset_otp_hash" TEXT;
