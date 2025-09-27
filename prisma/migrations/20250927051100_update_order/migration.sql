/*
  Warnings:

  - You are about to drop the column `nmae` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the `product_owners` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `grand_total` to the `orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `seller_id` to the `orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shipping_name` to the `orders` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "product_owners" DROP CONSTRAINT "product_owners_order_id_fkey";

-- DropForeignKey
ALTER TABLE "product_owners" DROP CONSTRAINT "product_owners_order_item_id_fkey";

-- DropForeignKey
ALTER TABLE "product_owners" DROP CONSTRAINT "product_owners_owner_id_fkey";

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "nmae",
ADD COLUMN     "grand_total" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "order_status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "seller_id" TEXT NOT NULL,
ADD COLUMN     "shipping_name" TEXT NOT NULL,
ADD COLUMN     "userId" TEXT;

-- DropTable
DROP TABLE "product_owners";

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
