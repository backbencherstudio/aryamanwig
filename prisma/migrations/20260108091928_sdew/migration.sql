-- DropForeignKey
ALTER TABLE "wishlists" DROP CONSTRAINT "wishlists_product_id_fkey";

-- DropForeignKey
ALTER TABLE "wishlists" DROP CONSTRAINT "wishlists_user_id_fkey";

-- AddForeignKey
ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
