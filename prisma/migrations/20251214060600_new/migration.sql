/*
  Warnings:

  - You are about to drop the column `boost_payment_status` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `boost_price` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `boost_tier` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `boost_until` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `is_boosted` on the `products` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "BoostStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED');

-- DropForeignKey
ALTER TABLE "payment_transactions" DROP CONSTRAINT "payment_transactions_boost_id_fkey";

-- AlterTable
ALTER TABLE "products" DROP COLUMN "boost_payment_status",
DROP COLUMN "boost_price",
DROP COLUMN "boost_tier",
DROP COLUMN "boost_until",
DROP COLUMN "is_boosted";

-- CreateTable
CREATE TABLE "boosts" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "user_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "tier" "BoostTier" NOT NULL,
    "status" "BoostStatus" NOT NULL DEFAULT 'ACTIVE',
    "payment_status" "BoostPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "price" DECIMAL(10,2) NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_date" TIMESTAMP(3),
    "until_date" TIMESTAMP(3),

    CONSTRAINT "boosts_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "boosts" ADD CONSTRAINT "boosts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boosts" ADD CONSTRAINT "boosts_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_boost_id_fkey" FOREIGN KEY ("boost_id") REFERENCES "boosts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
