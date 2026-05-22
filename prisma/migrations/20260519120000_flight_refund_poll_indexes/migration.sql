-- Indexes for ops cron poll queries (pending refunds + compensation lookups).
CREATE INDEX "flight_payment_refund_attempts_status_updated_at_idx"
  ON "flight_payment_refund_attempts" ("status", "updated_at");

CREATE INDEX "flight_payment_intent_records_order_failure_refund_id_idx"
  ON "flight_payment_intent_records" ("order_failure_refund_id");
