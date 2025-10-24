-- CreateEnum
CREATE TYPE "DisposalType" AS ENUM ('PICKUP', 'SEND_IN');

-- CreateEnum
CREATE TYPE "DisposalStatus" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DisposalItemSize" AS ENUM ('SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE');

-- CreateTable
CREATE TABLE "disposals" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "type" "DisposalType" NOT NULL,
    "status" "DisposalStatus" NOT NULL DEFAULT 'PENDING',
    "item_size" "DisposalItemSize" NOT NULL DEFAULT 'SMALL',
    "place_name" TEXT NOT NULL,
    "place_address" TEXT NOT NULL,
    "place_city" TIMESTAMP(3) NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "final_total_amount" DECIMAL(10,2) NOT NULL,
    "base_fee" DECIMAL(10,2),
    "item_total_fee" DECIMAL(10,2),
    "product_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "disposals_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "disposals" ADD CONSTRAINT "disposals_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disposals" ADD CONSTRAINT "disposals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
