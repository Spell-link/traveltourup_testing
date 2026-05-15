-- P1 — Booking state CHECK constraints + append-only financial event ledger +
-- correlation indexes. Statuses stay as TEXT to preserve back-compat with all
-- existing reads/writes; CHECKs add DB-level integrity. See
-- src/lib/constants/booking-states.ts for the TypeScript source of truth.

-- 1. Append-only booking financial event ledger
CREATE TABLE "booking_financial_events" (
    "id"                                   TEXT PRIMARY KEY,
    "booking_id"                           TEXT,
    "flight_payment_intent_record_id"      TEXT,
    "type"                                 VARCHAR(40) NOT NULL,
    "amount"                               VARCHAR(24),
    "currency"                             VARCHAR(3),
    "payload"                              JSONB,
    "request_id"                           VARCHAR(64),
    "created_at"                           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "booking_financial_events_booking_id_fkey"
        FOREIGN KEY ("booking_id")
        REFERENCES "bookings"("id")
        ON DELETE SET NULL,
    CONSTRAINT "booking_financial_events_flight_pit_id_fkey"
        FOREIGN KEY ("flight_payment_intent_record_id")
        REFERENCES "flight_payment_intent_records"("id")
        ON DELETE SET NULL
);

CREATE INDEX "booking_financial_events_booking_created_idx"
    ON "booking_financial_events" ("booking_id", "created_at");
CREATE INDEX "booking_financial_events_pit_created_idx"
    ON "booking_financial_events" ("flight_payment_intent_record_id", "created_at");
CREATE INDEX "booking_financial_events_type_created_idx"
    ON "booking_financial_events" ("type", "created_at");

ALTER TABLE "booking_financial_events"
    ADD CONSTRAINT "booking_financial_events_type_check" CHECK (
        "type" IN (
            'intent_created',
            'intent_succeeded',
            'intent_failed',
            'order_placed',
            'order_failed',
            'refund_initiated',
            'refund_succeeded',
            'refund_failed',
            'cancel_quoted',
            'cancel_confirmed',
            'change_quoted',
            'change_confirmed'
        )
    );

-- 2. Listing & reconciliation indexes
CREATE INDEX IF NOT EXISTS "bookings_user_id_created_at_idx"
    ON "bookings" ("user_id", "created_at");

CREATE INDEX IF NOT EXISTS "flight_payment_intent_records_status_updated_idx"
    ON "flight_payment_intent_records" ("status", "updated_at");

CREATE INDEX IF NOT EXISTS "flight_order_cancellations_status_quote_expires_idx"
    ON "flight_order_cancellations" ("status", "quote_expires_at");

-- 3. CHECK constraints to enforce known state values (additive, kept as TEXT).
-- NOT VALID first so the migration cannot fail on legacy rows; subsequent
-- VALIDATE statements promote them to enforced once data is clean. Each NOT
-- VALID/VALIDATE pair is split because Postgres only enforces the constraint
-- on new/updated rows until VALIDATE succeeds.
ALTER TABLE "bookings"
    ADD CONSTRAINT "bookings_status_check" CHECK (
        "status" IN ('pending', 'confirmed', 'cancelled', 'failed')
    ) NOT VALID;
ALTER TABLE "bookings" VALIDATE CONSTRAINT "bookings_status_check";

ALTER TABLE "bookings"
    ADD CONSTRAINT "bookings_payment_status_check" CHECK (
        "payment_status" IN (
            'unpaid',
            'paid',
            'refund_processing',
            'refund_pending',
            'refunded',
            'partially_refunded',
            'refund_failed',
            'credit_issued'
        )
    ) NOT VALID;
ALTER TABLE "bookings" VALIDATE CONSTRAINT "bookings_payment_status_check";

ALTER TABLE "flight_payment_intent_records"
    ADD CONSTRAINT "flight_payment_intent_records_status_check" CHECK (
        "status" IN (
            'requires_payment_method',
            'requires_confirmation',
            'processing',
            'succeeded',
            'canceled',
            'failed',
            'unknown'
        )
    ) NOT VALID;
ALTER TABLE "flight_payment_intent_records" VALIDATE CONSTRAINT "flight_payment_intent_records_status_check";

ALTER TABLE "flight_order_cancellations"
    ADD CONSTRAINT "flight_order_cancellations_status_check" CHECK (
        "status" IN ('pending', 'confirmed', 'expired', 'superseded')
    ) NOT VALID;
ALTER TABLE "flight_order_cancellations" VALIDATE CONSTRAINT "flight_order_cancellations_status_check";

ALTER TABLE "flight_payment_refund_attempts"
    ADD CONSTRAINT "flight_payment_refund_attempts_status_check" CHECK (
        "status" IN ('pending', 'succeeded', 'failed', 'skipped')
    ) NOT VALID;
ALTER TABLE "flight_payment_refund_attempts" VALIDATE CONSTRAINT "flight_payment_refund_attempts_status_check";
