-- P6 — pricing rule engine with per-route/cabin/carrier overrides + hard caps.

CREATE TABLE "flight_pricing_rules" (
    "id"                          TEXT PRIMARY KEY,
    "name"                        TEXT NOT NULL,
    "enabled"                     BOOLEAN NOT NULL DEFAULT TRUE,
    "priority"                    INTEGER NOT NULL DEFAULT 100,
    "origin_iata"                 VARCHAR(8),
    "destination_iata"            VARCHAR(8),
    "carrier_iata"                VARCHAR(8),
    "cabin_class"                 VARCHAR(24),
    "commission_percent_override" DECIMAL(6, 3),
    "markup_fixed_override"       VARCHAR(24),
    "max_commission_percent"      DECIMAL(6, 3),
    "max_markup_fixed"            VARCHAR(24),
    "effective_from"              TIMESTAMP(3),
    "effective_to"                TIMESTAMP(3),
    "notes"                       TEXT,
    "created_at"                  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"                  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "flight_pricing_rules_enabled_priority_idx"
    ON "flight_pricing_rules" ("enabled", "priority");

CREATE INDEX "flight_pricing_rules_origin_destination_idx"
    ON "flight_pricing_rules" ("origin_iata", "destination_iata");

ALTER TABLE "flight_pricing_rules"
    ADD CONSTRAINT "flight_pricing_rules_cabin_class_check" CHECK (
        "cabin_class" IS NULL OR "cabin_class" IN ('economy', 'premium_economy', 'business', 'first')
    );
ALTER TABLE "flight_pricing_rules"
    ADD CONSTRAINT "flight_pricing_rules_commission_check" CHECK (
        "commission_percent_override" IS NULL OR ("commission_percent_override" >= 0 AND "commission_percent_override" <= 100)
    );
ALTER TABLE "flight_pricing_rules"
    ADD CONSTRAINT "flight_pricing_rules_max_commission_check" CHECK (
        "max_commission_percent" IS NULL OR ("max_commission_percent" >= 0 AND "max_commission_percent" <= 100)
    );
