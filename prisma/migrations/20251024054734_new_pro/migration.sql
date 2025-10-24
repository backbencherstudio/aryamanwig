-- CreateEnum
CREATE TYPE "ProductItemSize" AS ENUM ('SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE');

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "product_item_size" "ProductItemSize" NOT NULL DEFAULT 'SMALL';
