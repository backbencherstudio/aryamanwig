/*
  Warnings:

  - You are about to drop the column `place_city` on the `disposals` table. All the data in the column will be lost.
  - You are about to drop the column `scheduled_at` on the `disposals` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "disposals" DROP COLUMN "place_city",
DROP COLUMN "scheduled_at",
ADD COLUMN     "latitude" DECIMAL(10,7),
ADD COLUMN     "longitude" DECIMAL(10,7);
