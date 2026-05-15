# Hotel Payment Flow Refactor Plan

## Goal

Refactor hotel payment flow to mirror the flight architecture and lifecycle:

- Server page (auth guard) -> view shell -> payment entry -> checkout component
- Payment lifecycle: prepare intent -> collect card via DuffelPayments -> confirm intent -> create booking
- Idempotency keys for prepare and booking requests
- Preserve responsive order-summary UX and loading overlays

## 1. File-by-File Comparison (Current vs Desired)

| Area | Current Hotel | Desired (Match Flight Architecture) | Action |
|---|---|---|---|
| Route page | `app/[locale]/(booking)/hotels/payment/page.tsx` already server-authenticated | Keep server auth + localized return path exactly as-is | Keep structure, swap client render target to view component |
| View shell | `app/[locale]/(booking)/hotels/payment/HotelPaymentPageClient.tsx` | `src/views/HotelPayment.tsx` (parallel to `src/views/Payment.tsx`) with Suspense + scroll reset | Rename/move to view layer |
| Payment entry | `src/components/hotels/StaysPaymentEntry.tsx` validates `quote_id`, directly imports checkout | Same validation gate, but lazy-load checkout with skeleton (same pattern as flights) | Update to `dynamic(..., { ssr: false, loading })` |
| Checkout core | `src/components/hotels/HotelCheckoutDuffel.tsx` does direct submit booking | Two-step checkout: guest details -> payment; uses `DuffelPayments`; prepare/confirm/book lifecycle | Refactor component state machine and handlers |
| HTTP client | `src/lib/http/stays.client.ts` only `postStaysBooking` | Add `postStaysPaymentIntent` + `postConfirmStaysPaymentIntent` types and calls | Extend client API |
| Stays backend API | Only `POST /api/v1/stays/bookings` | Add `POST /api/v1/stays/payment-intents` and `POST /api/v1/stays/payment-intents/[id]/confirm` | Add routes |
| Stays services | No stays payment-intent service | Service to fetch quote totals and create/confirm Duffel payment intents | Add service |
| Validation | Stays booking schema has no payment intent fields | Validate create intent body and optional booking `payment_intent_id` (`pit_...`) | Extend schema |

## 2. Step-by-Step Implementation Plan

1. Keep server route auth logic untouched in hotel payment page.
2. Create `src/views/HotelPayment.tsx` using the flight shell pattern:
   - Client component
   - `useEffect(window.scrollTo(0, 0))`
   - `Suspense` fallback with hotel skeleton
3. Update hotel payment page to render the new view component.
4. Refactor `StaysPaymentEntry` to lazy load `HotelCheckoutDuffel` with loading skeleton.
5. Add stays payment-intent backend:
   - Validation schema for create request
   - Service to resolve quote and create intent from quote total/currency
   - Confirm endpoint for intent
6. Extend stays client with prepare/confirm payment-intent calls.
7. Refactor `HotelCheckoutDuffel` to flight-like lifecycle:
   - Step state: `guest` -> `pay`
   - Idempotency refs for payment-intent and booking
   - Prepare handler sets `clientToken` + `paymentIntentId`
   - Payment step renders `DuffelPayments`
   - Success callback: confirm intent -> create booking with `payment_intent_id`
   - Keep mobile bottom bar/sheet and order summary behavior
   - Keep per-step loading overlays and errors
8. Run type/error checks and adjust any issues.

## 3. New/Updated Code by File

### `app/[locale]/(booking)/hotels/payment/page.tsx`

- Import `HotelPayment` from `src/views` instead of local client file.
- Preserve auth redirect and metadata behavior.

### `src/views/HotelPayment.tsx` (new)

- New hotel payment shell mirroring flights `Payment` view.
- Suspense fallback uses `HotelCheckoutLoadingSkeleton`.

### `src/components/hotels/StaysPaymentEntry.tsx`

- Replace direct `HotelCheckoutDuffel` import with dynamic lazy import.
- Keep `quote_id` guard and CTA fallback.

### `src/lib/validations/stays.schema.ts`

- Add `createStaysPaymentIntentBodySchema`.
- Add optional `payment_intent_id` to stays booking schema.

### `src/lib/duffel/stays-http.ts`

- Add `staysGetQuote(quoteId)` wrapper for quote refresh in payment-intent prepare.

### `src/lib/services/stays/stays-quote.service.ts`

- Add `runStaysGetQuote(quoteId)` helper using parser for normalized totals.

### `src/lib/services/stays/stays-payment-intent.service.ts` (new)

- Create payment intent from quote total/currency using Duffel payment-intents API.
- Confirm payment intent by id.

### `app/api/v1/stays/payment-intents/route.ts` (new)

- Rate limiting + body validation + idempotency-key header validation.
- Calls stays payment-intent service create flow.

### `app/api/v1/stays/payment-intents/[id]/confirm/route.ts` (new)

- Rate limiting + id validation.
- Calls stays payment-intent confirm flow.

### `src/lib/http/stays.client.ts`

- Add client methods:
  - `postStaysPaymentIntent`
  - `postConfirmStaysPaymentIntent`

### `src/components/hotels/HotelCheckoutDuffel.tsx`

- Introduce two-step state (`guest`, `pay`).
- Add `DuffelPayments` rendering with `client_token`.
- Add lifecycle handlers:
  - `preparePaymentIntent`
  - `onSuccessfulCardPayment`
  - `onFailedCardPayment`
- Booking creation now occurs after confirmed payment intent.
- Keep responsive order-summary and mobile sheet UX.

## 4. Testing Checklist

### Unit/Type Safety

- [ ] Typecheck/compile with no TS errors in changed files
- [ ] Validate no schema import/type regressions in stays API

### API Flow

- [ ] `POST /api/v1/stays/payment-intents` returns `payment_intent_id`, `client_token`, `status`
- [ ] Invalid/missing `quote_id` returns validation error
- [ ] Oversized `Idempotency-Key` rejected
- [ ] `POST /api/v1/stays/payment-intents/:id/confirm` rejects invalid ids

### UI Flow

- [ ] Hotel payment page still requires auth redirect
- [ ] Missing `quote_id` shows CTA fallback in entry component
- [ ] Guest form validation gate blocks continue when incomplete
- [ ] Continue creates payment intent and transitions to pay step
- [ ] Duffel card success confirms intent then creates booking
- [ ] Booking success shows success state/link
- [ ] Payment/booking failures surface actionable errors

### UX/Responsive

- [ ] Desktop sticky order summary unchanged
- [ ] Mobile bottom bar + sheet still works
- [ ] Busy overlays shown during prepare/confirm-book phases
- [ ] Scroll-to-top behavior preserved at page shell