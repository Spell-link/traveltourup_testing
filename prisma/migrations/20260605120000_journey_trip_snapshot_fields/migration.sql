-- Denormalized trip snapshot fields on customer_product_interests for admin list queries

ALTER TABLE "customer_product_interests" ADD COLUMN "origin_label" VARCHAR(128);
ALTER TABLE "customer_product_interests" ADD COLUMN "destination_label" VARCHAR(128);
ALTER TABLE "customer_product_interests" ADD COLUMN "start_date" VARCHAR(10);
ALTER TABLE "customer_product_interests" ADD COLUMN "end_date" VARCHAR(10);
ALTER TABLE "customer_product_interests" ADD COLUMN "travelers_summary" VARCHAR(128);
ALTER TABLE "customer_product_interests" ADD COLUMN "trip_type" VARCHAR(16);

CREATE INDEX "customer_product_interests_funnel_stage_start_date_idx" ON "customer_product_interests"("funnel_stage", "start_date");
CREATE INDEX "customer_product_interests_destination_label_last_seen_at_idx" ON "customer_product_interests"("destination_label", "last_seen_at");
