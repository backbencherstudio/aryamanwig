/*
  Warnings:

  - You are about to drop the column `total_amount` on the `orders` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('DUE', 'PAID', 'FAILED', 'REFUNDED');

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "total_amount",
ADD COLUMN     "payment_status" "PaymentStatus" NOT NULL DEFAULT 'DUE';
