-- Stays Stripe checkout: payment records, cancellations, refund attempts, ledger FK

CREATE TABLE "checkout_payment_records" (
    "id" TEXT NOT NULL,
    "product_type" VARCHAR(16) NOT NULL,
    "provider" VARCHAR(24) NOT NULL DEFAULT 'stripe',
    "provider_intent_id" VARCHAR(64) NOT NULL,
    "supplier_ref_id" VARCHAR(128) NOT NULL,
    "user_id" UUID NOT NULL,
    "supplier_amount" VARCHAR(24) NOT NULL,
    "supplier_currency" VARCHAR(3) NOT NULL,
    "markup_amount" VARCHAR(24) NOT NULL,
    "commission_percent_applied" VARCHAR(16),
    "markup_fixed_applied" VARCHAR(24),
    "charge_amount" VARCHAR(24) NOT NULL,
    "charge_currency" VARCHAR(3) NOT NULL,
    "customer_currency_requested" VARCHAR(3),
    "charge_currency_fallback" BOOLEAN NOT NULL DEFAULT false,
    "fx_rate_applied" VARCHAR(24),
    "fx_snapshot_json" JSONB,
    "stripe_fee_rate" VARCHAR(16),
    "client_secret" TEXT NOT NULL,
    "status" VARCHAR(32) NOT NULL,
    "booking_id" TEXT,
    "idempotency_key" TEXT,
    "quote_expires_at" TIMESTAMP(3),
    "order_failure_at" TIMESTAMP(3),
    "order_failure_booking_idempotency_key" TEXT,
    "order_failure_code" VARCHAR(64),
    "order_failure_refund_id" VARCHAR(64),
    "order_failure_refund_status" VARCHAR(32),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checkout_payment_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "checkout_payment_records_provider_intent_id_key" ON "checkout_payment_records"("provider_intent_id");
CREATE UNIQUE INDEX "checkout_payment_records_idempotency_key_key" ON "checkout_payment_records"("idempotency_key");
CREATE UNIQUE INDEX "checkout_payment_records_order_failure_booking_idempotency_key_key" ON "checkout_payment_records"("order_failure_booking_idempotency_key");
CREATE INDEX "checkout_payment_records_booking_id_idx" ON "checkout_payment_records"("booking_id");
CREATE INDEX "checkout_payment_records_user_id_created_at_idx" ON "checkout_payment_records"("user_id", "created_at");
CREATE INDEX "checkout_payment_records_status_updated_at_idx" ON "checkout_payment_records"("status", "updated_at");
CREATE INDEX "checkout_payment_records_supplier_ref_id_idx" ON "checkout_payment_records"("supplier_ref_id");

ALTER TABLE "checkout_payment_records" ADD CONSTRAINT "checkout_payment_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "checkout_payment_records" ADD CONSTRAINT "checkout_payment_records_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "stays_booking_cancellations" (
    "id" TEXT NOT NULL,
    "hotel_booking_id" TEXT NOT NULL,
    "checkout_payment_record_id" TEXT,
    "duffel_booking_id" VARCHAR(64) NOT NULL,
    "status" VARCHAR(24) NOT NULL,
    "refund_amount" VARCHAR(24),
    "refund_currency" VARCHAR(3),
    "customer_refund_amount" VARCHAR(24),
    "customer_refund_currency" VARCHAR(3),
    "confirmed_at" TIMESTAMP(3),
    "raw" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stays_booking_cancellations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "stays_booking_cancellations_checkout_payment_record_id_key" ON "stays_booking_cancellations"("checkout_payment_record_id");
CREATE INDEX "stays_booking_cancellations_hotel_booking_id_idx" ON "stays_booking_cancellations"("hotel_booking_id");
CREATE INDEX "stays_booking_cancellations_duffel_booking_id_idx" ON "stays_booking_cancellations"("duffel_booking_id");

ALTER TABLE "stays_booking_cancellations" ADD CONSTRAINT "stays_booking_cancellations_hotel_booking_id_fkey" FOREIGN KEY ("hotel_booking_id") REFERENCES "hotel_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stays_booking_cancellations" ADD CONSTRAINT "stays_booking_cancellations_checkout_payment_record_id_fkey" FOREIGN KEY ("checkout_payment_record_id") REFERENCES "checkout_payment_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "payment_refund_attempts" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "checkout_payment_record_id" TEXT,
    "stays_cancellation_id" TEXT,
    "provider" VARCHAR(24) NOT NULL DEFAULT 'stripe',
    "provider_refund_id" VARCHAR(64),
    "amount" VARCHAR(24),
    "currency" VARCHAR(3),
    "status" VARCHAR(24) NOT NULL,
    "error_code" VARCHAR(120),
    "raw" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_refund_attempts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payment_refund_attempts_stays_cancellation_id_key" ON "payment_refund_attempts"("stays_cancellation_id");
CREATE UNIQUE INDEX "payment_refund_attempts_provider_refund_id_key" ON "payment_refund_attempts"("provider_refund_id");
CREATE INDEX "payment_refund_attempts_booking_id_idx" ON "payment_refund_attempts"("booking_id");
CREATE INDEX "payment_refund_attempts_status_updated_at_idx" ON "payment_refund_attempts"("status", "updated_at");

ALTER TABLE "payment_refund_attempts" ADD CONSTRAINT "payment_refund_attempts_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payment_refund_attempts" ADD CONSTRAINT "payment_refund_attempts_checkout_payment_record_id_fkey" FOREIGN KEY ("checkout_payment_record_id") REFERENCES "checkout_payment_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payment_refund_attempts" ADD CONSTRAINT "payment_refund_attempts_stays_cancellation_id_fkey" FOREIGN KEY ("stays_cancellation_id") REFERENCES "stays_booking_cancellations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "booking_financial_events" ADD COLUMN "checkout_payment_record_id" TEXT;

CREATE INDEX "booking_financial_events_checkout_payment_record_id_created_at_idx" ON "booking_financial_events"("checkout_payment_record_id", "created_at");

ALTER TABLE "booking_financial_events" ADD CONSTRAINT "booking_financial_events_checkout_payment_record_id_fkey" FOREIGN KEY ("checkout_payment_record_id") REFERENCES "checkout_payment_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
