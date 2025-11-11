/*
  Warnings:

  - The `item_size` column on the `disposals` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "disposals" DROP COLUMN "item_size",
ADD COLUMN     "item_size" "ProductItemSize";

-- DropEnum
DROP TYPE "DisposalItemSize";
