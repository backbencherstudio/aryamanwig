/*
  Warnings:

  - A unique constraint covering the columns `[last_message_id]` on the table `conversations` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "blocked_by_creator" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "blocked_by_participant" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "deleted_by_creator" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "deleted_by_creator_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by_participant" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "deleted_by_participant_at" TIMESTAMP(3),
ADD COLUMN     "last_message_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "conversations_last_message_id_key" ON "conversations"("last_message_id");

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_last_message_id_fkey" FOREIGN KEY ("last_message_id") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
