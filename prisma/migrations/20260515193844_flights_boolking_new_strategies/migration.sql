-- DropForeignKey
ALTER TABLE "booking_financial_events" DROP CONSTRAINT "booking_financial_events_booking_id_fkey";

-- DropForeignKey
ALTER TABLE "booking_financial_events" DROP CONSTRAINT "booking_financial_events_flight_pit_id_fkey";

-- DropForeignKey
ALTER TABLE "flight_order_changes" DROP CONSTRAINT "flight_order_changes_flight_booking_id_fkey";

-- DropForeignKey
ALTER TABLE "flight_order_changes" DROP CONSTRAINT "flight_order_changes_flight_pit_id_fkey";

-- AlterTable
ALTER TABLE "flight_order_changes" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "flight_pricing_rules" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "booking_financial_events" ADD CONSTRAINT "booking_financial_events_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_financial_events" ADD CONSTRAINT "booking_financial_events_flight_payment_intent_record_id_fkey" FOREIGN KEY ("flight_payment_intent_record_id") REFERENCES "flight_payment_intent_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flight_order_changes" ADD CONSTRAINT "flight_order_changes_flight_booking_id_fkey" FOREIGN KEY ("flight_booking_id") REFERENCES "flight_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flight_order_changes" ADD CONSTRAINT "flight_order_changes_flight_payment_intent_record_id_fkey" FOREIGN KEY ("flight_payment_intent_record_id") REFERENCES "flight_payment_intent_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "booking_financial_events_booking_created_idx" RENAME TO "booking_financial_events_booking_id_created_at_idx";

-- RenameIndex
ALTER INDEX "booking_financial_events_pit_created_idx" RENAME TO "booking_financial_events_flight_payment_intent_record_id_cr_idx";

-- RenameIndex
ALTER INDEX "booking_financial_events_type_created_idx" RENAME TO "booking_financial_events_type_created_at_idx";

-- RenameIndex
ALTER INDEX "flight_order_cancellations_status_quote_expires_idx" RENAME TO "flight_order_cancellations_status_quote_expires_at_idx";

-- RenameIndex
ALTER INDEX "flight_order_changes_booking_idx" RENAME TO "flight_order_changes_flight_booking_id_idx";

-- RenameIndex
ALTER INDEX "flight_order_changes_oc_unique" RENAME TO "flight_order_changes_duffel_order_change_id_key";

-- RenameIndex
ALTER INDEX "flight_order_changes_ocr_unique" RENAME TO "flight_order_changes_duffel_order_change_request_id_key";

-- RenameIndex
ALTER INDEX "flight_order_changes_status_quote_idx" RENAME TO "flight_order_changes_status_quote_expires_at_idx";

-- RenameIndex
ALTER INDEX "flight_payment_intent_records_status_updated_idx" RENAME TO "flight_payment_intent_records_status_updated_at_idx";

-- RenameIndex
ALTER INDEX "flight_pricing_rules_origin_destination_idx" RENAME TO "flight_pricing_rules_origin_iata_destination_iata_idx";
