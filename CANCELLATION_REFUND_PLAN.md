# Cancellation and refund system — analysis, design, and implementation

This document describes the TravelTourUp flight cancellation and refund architecture, the product decision on payment rails, and what was implemented in the codebase.

## Part 1 — System analysis (as implemented)

### 1. Flight booking flow

- **API**: `POST /api/v1/flights/bookings` → `createDuffelInstantFlightBooking` / hold path in [`src/lib/services/flights/flights-booking.service.ts`](src/lib/services/flights/flights-booking.service.ts).
- **Duffel**: `POST /air/orders` via [`src/lib/duffel/orders.ts`](src/lib/duffel/orders.ts); order metadata includes Duffel Payment Intent id (`pit_*`).
- **Persistence**: [`bookingRepository.createFlightBookingFromDuffelOrder`](src/lib/db/repositories/booking.repository.ts) creates `Booking` + `FlightBooking`; `FlightPaymentIntentRecord.booking_id` links the captured payment to the booking.

### 2. Payment flow

- **Intent**: `POST /api/v1/flights/payment-intents` → Duffel `POST /payments/payment_intents` ([`src/lib/duffel/payment-intents.ts`](src/lib/duffel/payment-intents.ts)); stored in `FlightPaymentIntentRecord` (`duffel_intent_id`, `charge_amount`, `charge_currency`, …).
- **Confirm**: `POST /api/v1/flights/payment-intents/:id/confirm` → Duffel confirm action.
- **Refund rail decision (product/engineering)**: The app does **not** use the Stripe Node SDK or persist Stripe `pi_*` ids. Customer card collection goes through **Duffel Payments**; refunds are executed with **Duffel’s Refunds API** (`POST /payments/refunds`) as documented at [Duffel — Create a Refund](https://duffel.com/docs/api/refunds/create-refund). Native Stripe Refunds would require capturing and storing Stripe charge / PaymentIntent identifiers from Duffel payloads if Duffel exposes them—out of scope unless product switches rails.

### 3. Database (Prisma)

- Existing: `Booking`, `FlightBooking`, `FlightOrderCancellation`, `FlightPaymentIntentRecord`.
- **Added**: `FlightPaymentRefundAttempt` — one row per `FlightOrderCancellation` (unique `flight_order_cancellation_id`), audit for Duffel refund id, amount/currency, status (`pending` | `succeeded` | `failed` | `skipped`), `error_code`, `raw`. Migration: [`prisma/migrations/20260513180000_flight_payment_refund_attempts/migration.sql`](prisma/migrations/20260513180000_flight_payment_refund_attempts/migration.sql).

### 4. Profile → orders UI

- List: [`MyBookingsList`](src/components/bookings/MyBookingsList.tsx) → `GET /api/v1/bookings` (label “My Bookings” on dashboard embed).
- Detail: [`BookingDetailView`](src/components/bookings/BookingDetailView.tsx) → `GET /api/v1/bookings/:id`, plus **[`FlightBookingCancelPanel`](src/components/bookings/FlightBookingCancelPanel.tsx)** for quote → confirm, refund retry, and refresh while `refund_processing`.

### 5. API routes

| Route | Role |
|-------|------|
| `POST /api/v1/flights/bookings/:id/cancel` | Duffel quote / confirm ([`flight-cancel.service.ts`](src/lib/services/flights/flight-cancel.service.ts)); after confirm, triggers Duffel refund settlement. |
| `GET /api/v1/flights/bookings/:id/cancel/status` | Cancellation + refund attempt snapshot for polling. |
| `POST /api/v1/flights/bookings/:id/cancel/refund-retry` | Re-runs Duffel refund settlement after `refund_failed`. |

Client helpers: [`src/lib/http/flights.client.ts`](src/lib/http/flights.client.ts) (`postFlightBookingCancel`, `getFlightBookingCancelStatus`, `postFlightBookingRefundRetry`).

---

## Part 2 — Design reference

### Architecture (Duffel + Duffel Payments)

1. User requests **quote** → `POST /air/order_cancellations` → persist `FlightOrderCancellation` (`pending`).
2. User **confirms** → `POST /air/order_cancellations/:ore_id/actions/confirm` → update booking `cancelled`, `payment_status` = `credit_issued` (airline credits) or `refund_processing` (card path).
3. **Card path** → `POST /payments/refunds` with `payment_intent_id` = `pit_*`, amount/currency aligned with quote and charge cap → update `FlightPaymentRefundAttempt` and final `payment_status` (`refunded`, `partially_refunded`, `refund_processing`, or `refund_failed`).

Duffel cancellation guide: [Cancelling an Order](https://duffel.com/docs/guides/cancelling-an-order).

### State machine (booking + payment)

| Domain state | Implementation |
|--------------|------------------|
| Confirmed ticket | `Booking.status === "confirmed"` |
| Cancellation quoted | `FlightOrderCancellation.status === "pending"` |
| Cancelled (supplier) | `Booking.status === "cancelled"` |
| Airline credits | `payment_status === "credit_issued"` |
| Refund in flight | `payment_status === "refund_processing"` (Duffel refund `pending`) |
| Card refunded (full/partial label) | `refunded` / `partially_refunded` from quote vs booking total |
| Refund failed | `payment_status === "refund_failed"` + `FlightPaymentRefundAttempt.error_code` |

### Edge cases handled

- **Expired quote**: existing 410 + mark `expired`.
- **Stale quote (`order_cancellation_stale`)**: mapped to **409** `ORDER_CANCELLATION_STALE`.
- **Airline credits**: no Duffel refund API call; user messaging in cancel modal.
- **Currency mismatch / no PIT / zero refund**: attempt row + `refund_failed` or derived `payment_status` without calling Duffel where inappropriate.
- **Webhook vs app**: [`duffel-webhook-handlers.ts`](src/lib/services/duffel/duffel-webhook-handlers.ts) syncs external cancels via [`flight-webhook-cancel.service.ts`](src/lib/services/flights/flight-webhook-cancel.service.ts) — upserts `FlightOrderCancellation`, cancels booking, sends email, and calls `settleDuffelFlightRefundAfterCancellation` on the card path. `refund.*` webhooks and the ops poller use shared finalization in [`flight-refund.service.ts`](src/lib/services/flights/flight-refund.service.ts) (ledger + refund email, idempotent).

### Ops automation (production)

| Cron (`vercel.json`) | Route | Role |
|----------------------|-------|------|
| `*/15 * * * *` | `POST /api/v1/ops/flights/poll-refunds` | Poll pending cancellation refunds **and** compensation refunds on PIT rows |
| `0 * * * *` | `POST /api/v1/ops/flights/expire-cancellation-quotes` | Expire stale cancel quotes |
| `*/30 * * * *` | `POST /api/v1/ops/flights/sweep-orphan-pit` | Alert orphan PITs; optional auto-refund when `FLIGHT_ORPHAN_PIT_AUTO_REFUND=1` |

All ops routes require `Authorization: Bearer <OPS_JOB_TOKEN>` in production (see `.env.example`).

### Admin retry

| Route | Role |
|-------|------|
| `POST /api/v1/admin/flights/bookings/:id/refund-retry` | Admin retry after `refund_failed` (`bookings:manage`) |
| `POST /api/v1/admin/flights/payment-intents/:duffelIntentId/compensation-refund` | Retry booking-failed / orphan PIT compensation refund |

UI: admin flight detail (refund retry) and orphan PIT queue (compensation refund buttons).

### Security

- Reuses `assertCanCancelFlightBooking` (`bookings:manage` or `bookings:cancel_own` + owner) for status, cancel, and customer refund retry.
- Admin retry routes require `bookings:manage`.
- One refund attempt row per cancellation id prevents double settlement at DB level; Duffel refund id stored when succeeded.

### Best practices

- Refund logic isolated in [`flight-refund.service.ts`](src/lib/services/flights/flight-refund.service.ts).
- `DuffelApiError.hasDuffelErrorCode` / `firstDuffelErrorCode` for stable error mapping ([`src/lib/duffel/errors.ts`](src/lib/duffel/errors.ts)).

---

## Part 3 — Operational notes

- Apply migration: `npx prisma migrate deploy` (or `migrate dev` locally).
- Duffel Refunds product availability: see Duffel docs banner on refunds pages for account eligibility.
- Pending Duffel refund status: customer UI offers “Refresh status”; ops cron polls every 15 minutes via `poll-refunds`.
