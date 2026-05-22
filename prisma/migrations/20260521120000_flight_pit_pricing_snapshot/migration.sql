-- Immutable pricing snapshot on PaymentIntent records for admin revenue reconciliation.
ALTER TABLE "flight_payment_intent_records"
  ADD COLUMN IF NOT EXISTS "subtotal_charged_amount" VARCHAR(24),
  ADD COLUMN IF NOT EXISTS "duffel_payments_fee_amount" VARCHAR(24),
  ADD COLUMN IF NOT EXISTS "duffel_payments_fee_rate" VARCHAR(16),
  ADD COLUMN IF NOT EXISTS "fx_rate_applied" VARCHAR(16),
  ADD COLUMN IF NOT EXISTS "commission_percent_applied" VARCHAR(16),
  ADD COLUMN IF NOT EXISTS "markup_fixed_applied" VARCHAR(24),
  ADD COLUMN IF NOT EXISTS "applied_pricing_rule_id" VARCHAR(64),
  ADD COLUMN IF NOT EXISTS "duffel_reported_fees_amount" VARCHAR(24),
  ADD COLUMN IF NOT EXISTS "duffel_reported_net_amount" VARCHAR(24);
