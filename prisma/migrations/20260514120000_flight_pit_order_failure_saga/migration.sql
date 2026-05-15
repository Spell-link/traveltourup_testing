-- Terminal instant-checkout failure (saga compensation + idempotent replay)
ALTER TABLE "flight_payment_intent_records" ADD COLUMN "order_failure_at" TIMESTAMP(3);
ALTER TABLE "flight_payment_intent_records" ADD COLUMN "order_failure_booking_idempotency_key" TEXT;
ALTER TABLE "flight_payment_intent_records" ADD COLUMN "order_failure_code" VARCHAR(64);
ALTER TABLE "flight_payment_intent_records" ADD COLUMN "order_failure_refund_id" VARCHAR(64);
ALTER TABLE "flight_payment_intent_records" ADD COLUMN "order_failure_refund_status" VARCHAR(32);

CREATE UNIQUE INDEX "flight_payment_intent_records_order_failure_booking_idempotency_key_key" ON "flight_payment_intent_records"("order_failure_booking_idempotency_key");
