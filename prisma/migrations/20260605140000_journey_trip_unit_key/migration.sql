-- Trip unit key: one admin row per customer × trip (property/route + dates), not per product_ref.

ALTER TABLE "customer_product_interests" ADD COLUMN "trip_unit_key" VARCHAR(512);

UPDATE "customer_product_interests"
SET "trip_unit_key" = CASE
  WHEN "product_type" = 'hotel'
    AND COALESCE(NULLIF(TRIM("origin_label"), ''), NULLIF(TRIM("title"), ''), NULLIF(TRIM("destination_label"), '')) IS NOT NULL
    AND NULLIF(TRIM("start_date"), '') IS NOT NULL
    THEN 'hotel:'
      || LOWER(REGEXP_REPLACE(TRIM(COALESCE(NULLIF(TRIM("origin_label"), ''), NULLIF(TRIM("title"), ''), NULLIF(TRIM("destination_label"), ''))), '\s+', ' ', 'g'))
      || ':' || TRIM("start_date")
      || ':' || COALESCE(NULLIF(TRIM("end_date"), ''), '')
  WHEN "product_type" = 'flight'
    AND (NULLIF(TRIM("origin_label"), '') IS NOT NULL OR NULLIF(TRIM("destination_label"), '') IS NOT NULL)
    AND NULLIF(TRIM("start_date"), '') IS NOT NULL
    THEN 'flight:'
      || LOWER(REGEXP_REPLACE(COALESCE(NULLIF(TRIM("origin_label"), ''), ''), '\s+', ' ', 'g'))
      || ':' || LOWER(REGEXP_REPLACE(COALESCE(NULLIF(TRIM("destination_label"), ''), ''), '\s+', ' ', 'g'))
      || ':' || TRIM("start_date")
      || ':' || COALESCE(NULLIF(TRIM("end_date"), ''), '')
      || ':' || LOWER(COALESCE(NULLIF(TRIM("trip_type"), ''), ''))
  ELSE 'ref:' || "product_ref"
END
WHERE "trip_unit_key" IS NULL;

WITH agg AS (
  SELECT
    user_id,
    product_type,
    trip_unit_key,
    MIN(first_seen_at) AS min_first_seen,
    (array_agg(converted_booking_id ORDER BY converted_booking_id NULLS LAST) FILTER (WHERE converted_booking_id IS NOT NULL))[1] AS merged_booking_id
  FROM "customer_product_interests"
  GROUP BY user_id, product_type, trip_unit_key
),
ranked AS (
  SELECT
    id,
    user_id,
    product_type,
    trip_unit_key,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, product_type, trip_unit_key
      ORDER BY
        CASE funnel_stage
          WHEN 'booking_cancelled' THEN 6
          WHEN 'booking_changed' THEN 5
          WHEN 'booking_confirmed' THEN 4
          WHEN 'payment_prepared' THEN 3
          WHEN 'checkout_started' THEN 2
          WHEN 'checkout_clicked' THEN 1
          WHEN 'viewed' THEN 0
          ELSE -1
        END DESC,
        last_seen_at DESC,
        first_seen_at ASC
    ) AS rn
  FROM "customer_product_interests"
)
UPDATE "customer_product_interests" c
SET
  first_seen_at = a.min_first_seen,
  converted_booking_id = COALESCE(c.converted_booking_id, a.merged_booking_id)
FROM ranked r
JOIN agg a USING (user_id, product_type, trip_unit_key)
WHERE c.id = r.id AND r.rn = 1;

DELETE FROM "customer_product_interests" c
USING (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY user_id, product_type, trip_unit_key
        ORDER BY
          CASE funnel_stage
            WHEN 'booking_cancelled' THEN 6
            WHEN 'booking_changed' THEN 5
            WHEN 'booking_confirmed' THEN 4
            WHEN 'payment_prepared' THEN 3
            WHEN 'checkout_started' THEN 2
            WHEN 'checkout_clicked' THEN 1
            WHEN 'viewed' THEN 0
            ELSE -1
          END DESC,
          last_seen_at DESC,
          first_seen_at ASC
      ) AS rn
    FROM "customer_product_interests"
  ) ranked
  WHERE rn > 1
) dupes
WHERE c.id = dupes.id;

ALTER TABLE "customer_product_interests" ALTER COLUMN "trip_unit_key" SET NOT NULL;

ALTER TABLE "customer_product_interests" DROP CONSTRAINT IF EXISTS "customer_product_interests_user_id_product_type_product_ref_key";

CREATE UNIQUE INDEX "customer_product_interests_user_id_product_type_trip_unit_key_key"
  ON "customer_product_interests"("user_id", "product_type", "trip_unit_key");

CREATE INDEX "customer_product_interests_product_type_product_ref_idx"
  ON "customer_product_interests"("product_type", "product_ref");

ALTER TABLE "customer_journey_events" ADD COLUMN "trip_unit_key" VARCHAR(512);

UPDATE "customer_journey_events" e
SET "trip_unit_key" = i.trip_unit_key
FROM "customer_product_interests" i
WHERE e.user_id = i.user_id
  AND e.product_type = i.product_type
  AND e.product_ref = i.product_ref
  AND e.trip_unit_key IS NULL;

UPDATE "customer_journey_events"
SET "trip_unit_key" = 'ref:' || "product_ref"
WHERE "trip_unit_key" IS NULL;

CREATE INDEX "customer_journey_events_user_id_trip_unit_key_created_at_idx"
  ON "customer_journey_events"("user_id", "trip_unit_key", "created_at");
