-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "status" SMALLINT DEFAULT 1,
    "review_receiver" TEXT,
    "review_sender" TEXT,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_review_sender_fkey" FOREIGN KEY ("review_sender") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
