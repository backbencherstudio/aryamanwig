/*
  Warnings:

  - The `photo` column on the `products` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "products" DROP COLUMN "photo",
ADD COLUMN     "photo" TEXT[];
