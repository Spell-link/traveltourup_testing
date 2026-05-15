-- CreateTable
CREATE TABLE "flight_payment_refund_attempts" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "flight_order_cancellation_id" TEXT NOT NULL,
    "flight_payment_intent_record_id" TEXT,
    "provider" VARCHAR(24) NOT NULL DEFAULT 'duffel_payments',
    "duffel_refund_id" VARCHAR(64),
    "amount" VARCHAR(24),
    "currency" VARCHAR(3),
    "status" VARCHAR(24) NOT NULL,
    "error_code" VARCHAR(120),
    "raw" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flight_payment_refund_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "flight_payment_refund_attempts_flight_order_cancellation_id_key" ON "flight_payment_refund_attempts"("flight_order_cancellation_id");

-- CreateIndex
CREATE UNIQUE INDEX "flight_payment_refund_attempts_duffel_refund_id_key" ON "flight_payment_refund_attempts"("duffel_refund_id");

-- CreateIndex
CREATE INDEX "flight_payment_refund_attempts_booking_id_idx" ON "flight_payment_refund_attempts"("booking_id");

-- AddForeignKey
ALTER TABLE "flight_payment_refund_attempts" ADD CONSTRAINT "flight_payment_refund_attempts_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flight_payment_refund_attempts" ADD CONSTRAINT "flight_payment_refund_attempts_flight_order_cancellation_id_fkey" FOREIGN KEY ("flight_order_cancellation_id") REFERENCES "flight_order_cancellations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flight_payment_refund_attempts" ADD CONSTRAINT "flight_payment_refund_attempts_flight_payment_intent_record_id_fkey" FOREIGN KEY ("flight_payment_intent_record_id") REFERENCES "flight_payment_intent_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
