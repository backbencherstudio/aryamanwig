/*
  Warnings:

  - You are about to drop the column `token_verify` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ucodes" ADD COLUMN     "token_verify" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" DROP COLUMN "token_verify";
