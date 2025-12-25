-- CreateEnum
CREATE TYPE "EarningStatus" AS ENUM ('PENDING', 'SCHEDULED', 'RELEASED');

-- AlterTable
ALTER TABLE "user_earnings" ADD COLUMN     "fee_amount" DECIMAL(10,2),
ADD COLUMN     "fee_percent" DECIMAL(65,30) NOT NULL DEFAULT 10.0,
ADD COLUMN     "net_amount" DECIMAL(10,2),
ADD COLUMN     "release_at" TIMESTAMP(3),
ADD COLUMN     "status" "EarningStatus" NOT NULL DEFAULT 'PENDING';
