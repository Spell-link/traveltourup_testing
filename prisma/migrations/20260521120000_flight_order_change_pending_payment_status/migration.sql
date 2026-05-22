-- Allow `pending_payment` on voluntary order changes (payment-intent step before confirm).

ALTER TABLE "flight_order_changes" DROP CONSTRAINT IF EXISTS "flight_order_changes_status_check";

ALTER TABLE "flight_order_changes"
    ADD CONSTRAINT "flight_order_changes_status_check" CHECK (
        "status" IN (
            'pending',
            'quoted',
            'pending_payment',
            'confirmed',
            'expired',
            'cancelled',
            'failed'
        )
    );
