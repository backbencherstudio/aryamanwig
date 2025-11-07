/*
  Warnings:

  - You are about to drop the column `attachmentId` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the `attachments` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_attachmentId_fkey";

-- AlterTable
ALTER TABLE "Message" DROP COLUMN "attachmentId",
ADD COLUMN     "attachments" TEXT[];

-- DropTable
DROP TABLE "attachments";
