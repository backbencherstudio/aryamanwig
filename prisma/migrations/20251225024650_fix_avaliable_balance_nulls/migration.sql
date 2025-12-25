/*
  Warnings:

  - Made the column `avaliable_balance` on table `users` required. This step will fail if there are existing NULL values in that column.

*/
-- Update existing NULL values to 0.0 before making the column NOT NULL
UPDATE "users" SET "avaliable_balance" = 0.0 WHERE "avaliable_balance" IS NULL;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "avaliable_balance" SET NOT NULL,
ALTER COLUMN "avaliable_balance" SET DEFAULT 0.0;
