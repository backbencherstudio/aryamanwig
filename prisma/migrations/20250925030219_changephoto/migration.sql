/*
  Warnings:

  - You are about to drop the column `photos` on the `products` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "products" DROP COLUMN "photos",
ADD COLUMN     "photo" TEXT;
