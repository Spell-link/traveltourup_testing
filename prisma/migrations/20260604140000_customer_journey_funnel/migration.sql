-- Customer journey funnel: event log + product interest upserts

CREATE TABLE "customer_journey_events" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "event_type" VARCHAR(64) NOT NULL,
    "product_type" VARCHAR(16) NOT NULL,
    "product_ref" VARCHAR(512) NOT NULL,
    "funnel_stage" VARCHAR(32) NOT NULL,
    "properties" JSONB,
    "client_event_id" VARCHAR(64),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_journey_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "customer_product_interests" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "product_type" VARCHAR(16) NOT NULL,
    "product_ref" VARCHAR(512) NOT NULL,
    "funnel_stage" VARCHAR(32) NOT NULL,
    "title" TEXT,
    "subtitle" TEXT,
    "price_amount" VARCHAR(24),
    "price_currency" VARCHAR(3),
    "search_context" JSONB,
    "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_event_type" VARCHAR(64),
    "converted_booking_id" TEXT,
    "abandoned_at" TIMESTAMP(3),

    CONSTRAINT "customer_product_interests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "customer_journey_events_user_id_client_event_id_key" ON "customer_journey_events"("user_id", "client_event_id");
CREATE INDEX "customer_journey_events_user_id_created_at_idx" ON "customer_journey_events"("user_id", "created_at");
CREATE INDEX "customer_journey_events_product_type_product_ref_idx" ON "customer_journey_events"("product_type", "product_ref");
CREATE INDEX "customer_journey_events_funnel_stage_created_at_idx" ON "customer_journey_events"("funnel_stage", "created_at");

CREATE UNIQUE INDEX "customer_product_interests_user_id_product_type_product_ref_key" ON "customer_product_interests"("user_id", "product_type", "product_ref");
CREATE INDEX "customer_product_interests_user_id_last_seen_at_idx" ON "customer_product_interests"("user_id", "last_seen_at");
CREATE INDEX "customer_product_interests_funnel_stage_last_seen_at_idx" ON "customer_product_interests"("funnel_stage", "last_seen_at");
CREATE INDEX "customer_product_interests_converted_booking_id_idx" ON "customer_product_interests"("converted_booking_id");

ALTER TABLE "customer_journey_events" ADD CONSTRAINT "customer_journey_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_product_interests" ADD CONSTRAINT "customer_product_interests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_product_interests" ADD CONSTRAINT "customer_product_interests_converted_booking_id_fkey" FOREIGN KEY ("converted_booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
