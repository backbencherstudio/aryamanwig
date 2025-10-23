/*
  Warnings:

  - The `status` column on the `products` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "products" DROP COLUMN "status",
ADD COLUMN     "status" "ProductStatus" NOT NULL DEFAULT 'PENDING';
