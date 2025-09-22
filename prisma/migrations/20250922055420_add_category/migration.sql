-- CreateEnum
CREATE TYPE "Condition" AS ENUM ('NEW', 'OLD');

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "product_title" TEXT NOT NULL,
    "product_description" TEXT NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 1,
    "price" DECIMAL(10,2) NOT NULL,
    "photos" TEXT[],
    "location" TEXT,
    "size" TEXT,
    "color" TEXT,
    "time" TIMESTAMP(3),
    "condition" "Condition" DEFAULT 'NEW',
    "status" SMALLINT DEFAULT 1,
    "user_id" TEXT,
    "category_id" TEXT,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "category_name" TEXT NOT NULL,
    "category_description" TEXT,
    "status" SMALLINT DEFAULT 1,
    "category_owner" TEXT,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_category_name_key" ON "categories"("category_name");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_category_owner_fkey" FOREIGN KEY ("category_owner") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
