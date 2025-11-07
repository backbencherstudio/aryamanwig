/*
  Warnings:

  - The `status` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "USERSTATUS" AS ENUM ('ACTIVE', 'PENDING', 'INACTIVE', 'DELETED');

-- AlterTable
ALTER TABLE "users" DROP COLUMN "status",
ADD COLUMN     "status" "USERSTATUS" NOT NULL DEFAULT 'PENDING';
