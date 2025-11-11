-- AlterTable
ALTER TABLE "disposals" ADD COLUMN     "admin_approved" BOOLEAN DEFAULT false,
ADD COLUMN     "approved_at" TIMESTAMP(3);
