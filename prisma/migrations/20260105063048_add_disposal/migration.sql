-- CreateEnum
CREATE TYPE "DisposalPaymentStatus" AS ENUM ('DUE', 'PAID', 'FAILED', 'REFUNDED');

-- AlterTable
ALTER TABLE "disposals" ADD COLUMN     "disposal_payment" "DisposalPaymentStatus" DEFAULT 'DUE';

-- AlterTable
ALTER TABLE "user_earnings" ALTER COLUMN "fee_percent" SET DEFAULT 5.0;
