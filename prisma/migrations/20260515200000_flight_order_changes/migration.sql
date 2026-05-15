-- P5 — voluntary & airline-initiated flight order changes (exchange).

CREATE TABLE "flight_order_changes" (
    "id"                                   TEXT PRIMARY KEY,
    "flight_booking_id"                    TEXT NOT NULL,
    "source"                               VARCHAR(16) NOT NULL DEFAULT 'user',
    "duffel_order_change_request_id"       VARCHAR(64),
    "duffel_order_change_id"               VARCHAR(64),
    "change_amount"                        VARCHAR(24),
    "change_currency"                      VARCHAR(3),
    "status"                               VARCHAR(24) NOT NULL,
    "flight_payment_intent_record_id"      TEXT,
    "quote_expires_at"                     TIMESTAMP(3),
    "confirmed_at"                         TIMESTAMP(3),
    "raw"                                  JSONB,
    "created_at"                           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"                           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "flight_order_changes_flight_booking_id_fkey"
        FOREIGN KEY ("flight_booking_id")
        REFERENCES "flight_bookings"("id")
        ON DELETE CASCADE,
    CONSTRAINT "flight_order_changes_flight_pit_id_fkey"
        FOREIGN KEY ("flight_payment_intent_record_id")
        REFERENCES "flight_payment_intent_records"("id")
        ON DELETE SET NULL
);

CREATE UNIQUE INDEX "flight_order_changes_ocr_unique"
    ON "flight_order_changes" ("duffel_order_change_request_id");
CREATE UNIQUE INDEX "flight_order_changes_oc_unique"
    ON "flight_order_changes" ("duffel_order_change_id");

CREATE INDEX "flight_order_changes_booking_idx"
    ON "flight_order_changes" ("flight_booking_id");
CREATE INDEX "flight_order_changes_status_quote_idx"
    ON "flight_order_changes" ("status", "quote_expires_at");

ALTER TABLE "flight_order_changes"
    ADD CONSTRAINT "flight_order_changes_status_check" CHECK (
        "status" IN ('pending', 'quoted', 'confirmed', 'expired', 'cancelled', 'failed')
    );

ALTER TABLE "flight_order_changes"
    ADD CONSTRAINT "flight_order_changes_source_check" CHECK (
        "source" IN ('user', 'airline')
    );
