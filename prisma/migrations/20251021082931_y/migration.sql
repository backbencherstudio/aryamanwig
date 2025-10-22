/*
  Warnings:

  - You are about to drop the `_AttachmentToMessage` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_AttachmentToMessage" DROP CONSTRAINT "_AttachmentToMessage_A_fkey";

-- DropForeignKey
ALTER TABLE "_AttachmentToMessage" DROP CONSTRAINT "_AttachmentToMessage_B_fkey";

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "attachmentId" TEXT;

-- DropTable
DROP TABLE "_AttachmentToMessage";

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_attachmentId_fkey" FOREIGN KEY ("attachmentId") REFERENCES "attachments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
