-- AlterTable
ALTER TABLE "products" ADD COLUMN     "boost_until" TIMESTAMP(3),
ADD COLUMN     "is_boosted" BOOLEAN NOT NULL DEFAULT false;
