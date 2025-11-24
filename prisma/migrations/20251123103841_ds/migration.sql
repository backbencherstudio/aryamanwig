-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_disposal_id_fkey" FOREIGN KEY ("disposal_id") REFERENCES "disposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
