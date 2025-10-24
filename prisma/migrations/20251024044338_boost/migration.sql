-- CreateEnum
CREATE TYPE "BoostTier" AS ENUM ('TIER_1', 'TIER_2', 'TIER_3');

-- CreateEnum
CREATE TYPE "BoostPaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "boost_payment_status" "BoostPaymentStatus",
ADD COLUMN     "boost_tier" "BoostTier";
