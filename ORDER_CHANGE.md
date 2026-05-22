# Flight order change

Voluntary flight changes for confirmed Duffel orders. Uses Duffel `order_change_request` → `order_change_offers` → pay delta → confirm (not flight search).

## Customer page flow (unified UI)

| Step | URL | Screen |
|------|-----|--------|
| Order detail | `/profile/bookings/[id]` | Journey timeline, Manage this order menu |
| Change order | `/flights/change/[bookingId]` | `FlightsTab` (change variant) + leg picker + search |
| Available flights | `/flights/change/[bookingId]?origin=…&slice_id=…` | Same hub: banner + `FlightList` + `OriginalBookingCard` |
| Review offer | `/flights/change/[bookingId]/[offerId]?change_id=` | `FlightDetail` (change variant): old vs new itinerary + `BookingSidebar` |
| Confirm and pay | `/flights/change/[bookingId]/payment?change_id=&offer_id=` | `FlightChangePaymentEntry` + `FlightChangeConfirmPay` |

Legacy `/flights/change/[bookingId]/offers` redirects to the unified results URL on the change hub.

Session state: `flight-change-session.ts` (`ttu_flight_change_{bookingId}` in sessionStorage). Offers include full `slices.add/remove` for list/detail adapters.

## Shared components

- **Search:** `FlightsTab` with `flowVariant="change-flight"` (read-only passengers)
- **Results:** `FlightList` with `flowContext={{ variant: "change-flight", … }}`
- **Cards:** `FlightResultCard` with `changeDelta` pricing
- **Detail:** `FlightDetail` + `order-change-offer-adapter.ts`
- **Sidebar:** `BookingSidebar` change breakdown; bags/seats UI with fallback when seat maps unsupported on `oco_` offers
- **Payment:** `FlightChangePaymentEntry` (same shell as first-time checkout)

First-time booking routes `/flights`, `/flights/[offerId]`, `/flights/payment` are unchanged.

## API (unchanged)

- `GET .../order-changes/context`
- `POST .../order-changes` (quote with `slices.remove` + `slices.add`)
- `POST .../payment-intent`
- `POST .../confirm`

## Payment model

Same two-layer model as checkout: card → Duffel balance → airline confirm with `{ type: "balance", amount, currency }`.

## Ops

Hourly cron: `POST /api/v1/ops/flights/expire-order-change-quotes` (requires `OPS_JOB_TOKEN`).

## Manual regression matrix

| Case | Expected |
|------|----------|
| New booking search → pay → success | Unchanged |
| Change one-way leg, paid delta | Quote → list → detail → pay → confirmed |
| Free change (delta = 0) | Confirm without card |
| Refund change (delta < 0) | UI shows refund; confirm triggers credit path |
| Expired quote | Friendly re-search prompt |
| Round-trip booking, change return leg only | Leg picker works |
| Seat map unsupported on change offer | Sidebar shows parity UI + fallback message |
