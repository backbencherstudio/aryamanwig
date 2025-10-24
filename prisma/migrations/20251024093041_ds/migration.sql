-- AlterTable
ALTER TABLE "disposals" ALTER COLUMN "scheduled_at" DROP NOT NULL,
ALTER COLUMN "final_total_amount" DROP NOT NULL;
