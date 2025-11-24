-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_boost_id_fkey" FOREIGN KEY ("boost_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
