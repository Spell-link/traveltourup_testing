# Duffel Integration - Complete Codebase Audit

**Search Date:** May 12, 2026  
**Workspace:** d:\traveltourup_next

---

## 1. ENVIRONMENT CONFIGURATION FILES

### [.env.example](.env.example)
**Lines 34-57** - Duffel configuration environment variables:
- `DUFFEL_API_KEY` - Server-side API key (value redacted — see `.env.local`)
- `DUFFEL_API_URL` - Base URL (https://api.duffel.com)
- `DUFFEL_WEBHOOK_SECRET` - Webhook signing secret
- `DUFFEL_PAYMENTS_FEE_RATE` - Card fee rate (0.029)
- `FLIGHT_PAYMENT_PROVIDER` - Default PSP (duffel_payments)
- Notes on Duffel PaymentIntent gross-up for flight checkout

---

## 2. PACKAGE DEPENDENCIES

### [package.json](package.json) - Line 32
```
"@duffel/components": "^3.13.1"
```

### [package-lock.json](package-lock.json)
- `@duffel/api` v4.21.2 (indirect dependency)
- `@duffel/components` v3.13.1 (direct)
  - Includes `@duffel/api`, React, Stripe dependencies

---

## 3. HOTEL CHECKOUT COMPONENTS

### [src/components/hotels/HotelCheckoutDuffel.tsx](src/components/hotels/HotelCheckoutDuffel.tsx)
**Client Component** - Primary hotel (stays) payment checkout interface

**Imports:**
- `createThreeDSecureSession` from `@duffel/components` (line 7)
- `postStaysBooking` from `@/lib/http/stays.client` (line 15)
- `StaysDuffelCardBlock` component (line 18-20)

**Key Functions:**
- `HotelCheckoutDuffel({ quoteId })` - Main checkout component (line 50)
- Uses `process.env.NEXT_PUBLIC_DUFFEL_CLIENT_KEY` (line 56) for client-side card form
- Two-step flow: "guest" details → "pay" with card & 3DS

**Payment Flow (lines 205-250):**
1. Tokenizes card via `StaysDuffelCardBlock.tokenizeCard()` (line 215)
2. Creates 3DS session via `createThreeDSecureSession(duffelClientKey, card.card_id, quoteId, [], true)` (line 217-222)
3. Confirms session ready for payment (line 224)
4. Calls `postStaysBooking()` with 3DS session ID (line 228-237)
5. On success, stores booking ref and redirects to booking confirmation (line 241)

**State Management:**
- Checkout steps: `"guest" | "pay"`
- Payment stages: `"idle" | "tokenizing" | "authenticating" | "booking"`
- Guest details: email, phone, given_name, family_name, born_on
- Order summary with quote details stored in sessionStorage

**Error Handling:**
- Missing client key error (line 496)
- Quote expiration detection
- 3DS authentication failures

---

### [src/components/hotels/StaysDuffelCardBlock.tsx](src/components/hotels/StaysDuffelCardBlock.tsx)
**Card Tokenization Component** - Wraps Duffel's card form

**Imports:**
- `DuffelCardForm` from `@duffel/components` (line 4)
- `useDuffelCardFormActions` from `@duffel/components` (line 4)

**Exports:**
- `StaysDuffelCardBlockHandle` interface with `tokenizeCard()` method
- Forwardable ref component (line 8)

**Features:**
- Renders `DuffelCardForm` with intent `"to-create-card-for-temporary-use"` (line 48)
- Handles validation callbacks: `onValidateSuccess/onValidateFailure` (lines 49-50)
- Tokenization callbacks: `onCreateCardForTemporaryUseSuccess/onCreateCardForTemporaryUseFailure` (lines 51-52)
- Security policy violation handling (line 53)
- Returns card ID on success

---

### [src/components/hotels/StaysPaymentEntry.tsx](src/components/hotels/StaysPaymentEntry.tsx)
**Payment Entry Point** - Routes to checkout component

**Dynamic Import:**
```typescript
const HotelCheckoutDuffel = dynamic(
  () => import("@/components/hotels/HotelCheckoutDuffel").then((m) => m.HotelCheckoutDuffel),
  { ssr: false, loading: () => <HotelCheckoutLoadingSkeleton /> }
)
```

**URL Parameter:** Requires `?quote_id=quo_…` query parameter (line 15)

---

### [src/components/hotels/HotelCheckoutLoadingSkeleton.tsx](src/components/hotels/HotelCheckoutLoadingSkeleton.tsx)
**Re-exports** `CheckoutLoadingSkeleton` from flights component (line 4)

---

### [src/components/hotels/HotelDetailContent.tsx](src/components/hotels/HotelDetailContent.tsx)
**Hotel Details View** - Shows room selection and quote creation flow

---

### Other Hotel Components
- `HotelsTab.tsx` - Search interface
- `HotelsList.tsx` - Results list
- `AvailableRooms.tsx` - Room selection
- `FeaturedHotels.tsx` - Featured hotels display
- `HotelMapModal.tsx` - Map view
- `useDuffelHotelLocationSuggest.ts` - Location autocomplete hook

---

## 4. FLIGHTS CHECKOUT COMPONENTS

### [src/components/flights/FlightCheckoutDuffel.tsx](src/components/flights/FlightCheckoutDuffel.tsx)
**Dynamic import of DuffelPayments:**
```typescript
const DuffelPayments = dynamic(
  () => import("@duffel/components").then((m) => m.DuffelPayments),
  { ssr: false }
)
```

---

## 5. API ROUTES - STAYS PAYMENT

### [app/api/v1/stays/bookings/route.ts](app/api/v1/stays/bookings/route.ts)
**POST /api/v1/stays/bookings** - Create stay booking with 3DS payment

**Handler:**
- Checks `isDuffelConfigured()` (line 15)
- Validates `StaysBookingBodyInput` schema (line 24)
- Handles `Idempotency-Key` header for idempotent requests (line 29)
- Calls `createDuffelStayBooking()` service (line 35)
- Returns serialized booking response (line 37)

**Required Fields:**
- `quote_id` - Duffel quote ID
- `email` - Guest email
- `phone_number` - Guest phone
- `guests` - Array of guest objects (given_name, family_name, born_on)
- `payment.three_d_secure_session_id` - 3DS session from card form

---

## 6. API ROUTES - FLIGHTS PAYMENT

### [app/api/v1/flights/payment-intents/route.ts](app/api/v1/flights/payment-intents/route.ts)
**POST /api/v1/flights/payment-intents** - Create flight payment intent

**Handler:**
- Checks `isDuffelConfigured()` (line 16)
- Rate limiting (20/min anonymous, 40/min authenticated)
- Validates offer ID and services (line 38-41)
- Handles `Idempotency-Key` header (line 43-45)
- Calls `prepareFlightCheckout()` orchestrator (line 49)

---

### [app/api/v1/flights/payment-intents/[id]/confirm/route.ts](app/api/v1/flights/payment-intents/[id]/confirm/route.ts)
**POST /api/v1/flights/payment-intents/{id}/confirm** - Confirm flight payment

**Handler:**
- Validates payment intent ID (line 29)
- Calls `confirmFlightCheckout("duffel_payments", id)` (line 34)

---

## 7. DUFFEL LIBRARY - CORE UTILITIES

### [src/lib/duffel/client.ts](src/lib/duffel/client.ts)
**HTTP Client for Duffel API**

**Exports:**
- `duffelFetch<T>(path, options)` - Core HTTP client with retry logic
- Handles API key injection via `Authorization: Bearer` header
- Duffel-Version header handling
- Error parsing and retry logic for transient failures
- Timeout handling (default 28s, configurable)

---

### [src/lib/duffel/config.ts](src/lib/duffel/config.ts)
**Configuration Management**

**Functions:**
- `getDuffelEnv()` - Reads and validates Duffel environment variables
- `isDuffelConfigured()` - Checks if DUFFEL_API_KEY is set (line 31)
- `getDuffelConfig()` - Returns validated config object (line 37)
- `getDuffelWebhookSecret()` - Returns webhook signing secret (line 50)

**Default Values:**
- Base URL: `https://api.duffel.com`
- Timeout: 28,000ms

---

### [src/lib/duffel/payment-intents.ts](src/lib/duffel/payment-intents.ts)
**Payment Intent Management**

**Exports:**
- `createDuffelPaymentIntent(input)` - POST /payments/payment_intents
- `confirmDuffelPaymentIntent(paymentIntentId)` - POST /payments/payment_intents/:id/actions/confirm

**Response Type:**
```typescript
DuffelPaymentIntentResource {
  id: string;
  live_mode: boolean;
  status: string;
  amount: string;
  currency: string;
  client_token: string;
  created_at?: string;
  updated_at?: string;
  confirmed_at?: string | null;
}
```

---

### [src/lib/duffel/stays-http.ts](src/lib/duffel/stays-http.ts)
**Stays HTTP Operations**

**Exports:**
- `staysSearch(data)` - POST /stays/search
- `staysFetchAllRates(searchResultId)` - POST /stays/search_results/{id}/actions/fetch_all_rates
- `staysCreateQuote(rateId)` - POST /stays/quotes
- `staysGetQuote(quoteId)` - GET /stays/quotes/{id}
- `staysCreateBooking(data)` - POST /stays/bookings (takes quote_id, email, phone_number, guests, payment)
- `staysGetBooking(bookingId)` - GET /stays/bookings/{id}

---

### [src/lib/duffel/stays.ts](src/lib/duffel/stays.ts)
**Stays Search Payload Builder**

**Exports:**
- `buildDuffelStaysSearchPayload(body)` - Transforms search input to Duffel format
- `duffelStaysSearch(body)` - Executes stays search

**Payload Structure:**
- check_in_date, check_out_date
- rooms array
- guests array (type: "adult" | "child", age for children)
- location with geographic_coordinates (latitude, longitude, radius)

---

### [src/lib/duffel/stays-parse.ts](src/lib/duffel/stays-parse.ts)
**Stays Response Parsing** (11,118 bytes)
- Parses Duffel stays API responses
- Converts raw responses to internal DTOs
- Type-safe data extraction

---

### [src/lib/duffel/webhook-verify.ts](src/lib/duffel/webhook-verify.ts)
**Webhook Signature Verification**

**Function:**
- `verifyDuffelWebhookSignature(secret, raw, sig)` - Validates webhook signatures using HMAC

---

### [src/lib/duffel/orders.ts](src/lib/duffel/orders.ts)
**Flight Order Operations**
- `getDuffelOrder(orderId)` - Fetch order details

---

### [src/lib/duffel/offers.ts](src/lib/duffel/offers.ts)
**Flight Offer Operations**
- Handles flight offer details

---

### [src/lib/duffel/order-cancellations.ts](src/lib/duffel/order-cancellations.ts)
**Cancellation Management**
- `getDuffelOrderCancellation(cancellationId)`
- `confirmDuffelOrderCancellation(cancellationId)`

---

### [src/lib/duffel/order-parse.ts](src/lib/duffel/order-parse.ts)
**Order Response Parsing** (3,421 bytes)
- Parses Duffel order responses

---

### [src/lib/duffel/order-cancellation-parse.ts](src/lib/duffel/order-cancellation-parse.ts)
**Cancellation Response Parsing** (2,014 bytes)
- Parses cancellation responses

---

### [src/lib/duffel/errors.ts](src/lib/duffel/errors.ts)
**Error Handling**

**Custom Errors:**
- `DuffelApiError` - Base API error class
- `isRetryableDuffelStatus()` - Determines if error is transient
- Error item parsing from Duffel responses

---

### [src/lib/duffel/dto/flight-offer.dto.ts](src/lib/duffel/dto/flight-offer.dto.ts)
**Flight Offer DTO** (9,251 bytes)
- Type definitions for flight offers from Duffel API

---

### [src/lib/duffel/dto/seat-map.dto.ts](src/lib/duffel/dto/seat-map.dto.ts)
**Seat Map DTO** (4,284 bytes)
- Seat map data structures

---

## 8. HTTP CLIENT - BROWSER-SIDE

### [src/lib/http/stays.client.ts](src/lib/http/stays.client.ts)
**Browser-side Stays API Client**

**Constants:**
- `STAYS_V1_BASE = "/api/v1/stays"`
- `TTU_STAYS_SEARCH_SESSION_KEY = "ttu_stays_search"` - SessionStorage key for search state
- `TTU_STAYS_SEARCH_PENDING_KEY = "ttu_stays_search_pending"`
- `TTU_STAYS_SEARCH_STARTED_EVENT = "ttu-stays-search-started"`
- `TTU_STAYS_SEARCH_UPDATED_EVENT = "ttu-stays-search-updated"`

**Exports:**
- `getStaysPlaces(params)` - Location suggestions
- `postStaysSearch(body)` - Search for stays
- `getStaysFeatured()` - Featured stays
- `getStaysRates(searchResultId)` - Get rates for search result
- `postStaysQuote(body)` - Create quote from rate
- `postStaysBooking(body, idempotencyKey)` - Submit booking (line 65)

**Booking Request Body Type:**
```typescript
StaysBookingBodyInput {
  quote_id: string;
  email: string;
  phone_number: string;
  guests: Array<{
    given_name: string;
    family_name: string;
    born_on: string;
  }>;
  payment: {
    three_d_secure_session_id: string;
  };
  accommodation_special_requests?: string;
}
```

---

## 9. PAYMENT ORCHESTRATION

### [src/lib/payments/flight-payment-orchestrator.ts](src/lib/payments/flight-payment-orchestrator.ts)
**Flight Payment Orchestration**

**Exports:**
- `prepareFlightCheckout(input)` - Creates flight payment intent
  - Calls `createFlightCheckoutPaymentIntent()` service (line 30)
  - Returns: payment_intent_id, client_token, status, pricing, etc.
  
- `confirmFlightCheckout(provider, paymentIntentId)` - Confirms payment
  - Currently supports only "duffel_payments" (line 37)

**Supported Providers:** `["duffel_payments"]`

---

## 10. SERVICES - STAYS PAYMENT

### [src/lib/services/stays/stays-booking.service.ts](src/lib/services/stays/stays-booking.service.ts)
**Stays Booking Service**

**Exports:**
- `createDuffelStayBooking(input)` - Server-side booking creation

**Flow:**
1. Checks authorization (line 26)
2. Checks idempotency key for replay (line 28)
3. Prepares Duffel booking payload (line 41)
4. Calls `staysCreateBooking(duffelBody)` (line 59)
5. Parses response via `parseStaysBooking()` (line 60)
6. Validates booking is confirmed (line 64-65)
7. Creates database record via `bookingRepository.createHotelStayBookingFromDuffel()` (line 75)

**Database Fields Stored:**
- booking_ref_no - Generated TTU reference
- status: "confirmed"
- payment_status: "paid"
- total_amount, currency
- guest_data (email, phone, guests array)
- hotel object containing:
  - duffel_booking_id, duffel_quote_id
  - accommodation snapshot
  - booking_reference
  - stays_raw (full Duffel response)

---

### [src/lib/services/stays/stays-quote.service.ts](src/lib/services/stays/stays-quote.service.ts)
**Stays Quote Service** (681 bytes)

---

### [src/lib/services/stays/stays-search.service.ts](src/lib/services/stays/stays-search.service.ts)
**Stays Search Service** (456 bytes)

---

### [src/lib/services/stays/stays-rates.service.ts](src/lib/services/stays/stays-rates.service.ts)
**Stays Rates Service** (460 bytes)

---

### [src/lib/services/stays/featured-stays.service.ts](src/lib/services/stays/featured-stays.service.ts)
**Featured Stays Service** (1,774 bytes)

---

## 11. SERVICES - FLIGHTS PAYMENT

### [src/lib/services/flights/flight-payment-intent.service.ts](src/lib/services/flights/flight-payment-intent.service.ts)
**Flight Payment Intent Service** (5,530 bytes)

**Exports:**
- `createFlightCheckoutPaymentIntent(input)` - Create Duffel payment intent
- `confirmFlightCheckoutPaymentIntent(id)` - Confirm Duffel payment

---

## 12. WEBHOOK HANDLING

### [app/api/v1/webhooks/duffel/route.ts](app/api/v1/webhooks/duffel/route.ts)
**POST /api/v1/webhooks/duffel** - Duffel webhook receiver

**Handler:**
1. Retrieves webhook secret (line 8)
2. Verifies signature via `verifyDuffelWebhookSignature()` (line 13)
3. Parses JSON payload (line 17)
4. Records event via `recordDuffelWebhookEvent()` service (line 27)
5. Returns deduplication status

**Configuration Required:**
- `DUFFEL_WEBHOOK_SECRET` environment variable

---

### [src/lib/services/duffel/duffel-webhook.service.ts](src/lib/services/duffel/duffel-webhook.service.ts)
**Webhook Event Persistence**

**Exports:**
- `recordDuffelWebhookEvent(payload)` - Idempotent webhook event recording

**Logic:**
- Deduplicates by event_id (line 16)
- If already processed, returns `{ duplicate: true }` (line 21)
- Retries side effects if previous attempt failed (line 23)
- Stores processed_at timestamp on success (line 33)
- Stores error message if processing fails (line 38)

---

### [src/lib/services/duffel/duffel-webhook-handlers.ts](src/lib/services/duffel/duffel-webhook-handlers.ts)
**Webhook Event Side Effects** (5,481 bytes)

**Exports:**
- `applyDuffelWebhookEventSideEffects(payload)` - Event processor

**Handles:**
- `ping.triggered` - Webhook connectivity test
- `stays.*` events - Stay booking status updates
  - Fetches booking details from Duffel API
  - Syncs status to local database
  - Handles cancellations

---

## 13. DATABASE REPOSITORIES

### [src/lib/db/repositories/flight-payment-intent.repository.ts](src/lib/db/repositories/flight-payment-intent.repository.ts)
**Flight Payment Intent Repository** (1,426 bytes)
- Database access for flight payment records

---

## 14. VALIDATION SCHEMAS

### [src/lib/validations/flight-payment.schema.ts](src/lib/validations/flight-payment.schema.ts)
**Flight Payment Validation Schema** (390 bytes)

**Schema:**
- `createFlightPaymentIntentBodySchema` - Validates offer_id and services

---

### [src/lib/validations/stays.schema.ts](src/lib/validations/stays.schema.ts)
**Stays Validation Schema**

**Schemas:**
- `StaysSearchBodyInput` - Search parameters
- `StaysBookingBodyInput` - Booking request body
  - quote_id, email, phone_number
  - guests array (given_name, family_name, born_on)
  - payment.three_d_secure_session_id
  - optional accommodation_special_requests

---

## 15. PRICING & PAYMENTS

### [src/lib/payments/duffel-intent-pricing.ts](src/lib/payments/duffel-intent-pricing.ts)
**Duffel Payment Intent Pricing** (2,909 bytes)

**Features:**
- Card fee calculations
- Currency conversion
- Markup calculations

---

### [src/lib/payments/providers/duffel-payments.ts](src/lib/payments/providers/duffel-payments.ts)
**Duffel Payments Provider** (304 bytes)

---

## 16. DOCUMENTATION

### [z-docs/DUFFEL_INTEGRATION/STAYS_PAYMENT_FLOW_GUIDE.md](z-docs/DUFFEL_INTEGRATION/STAYS_PAYMENT_FLOW_GUIDE.md)
**Stays Payment Flow Documentation**

**Key Sections:**
- DuffelCardForm usage
- createThreeDSecureSession flow
- Quote/booking lifecycle
- 3DS authentication process
- Duffel component integration

---

### [z-docs/DUFFEL_INTEGRATION/FLIGHT_PAYMENT_FLOW_GUIDE.md](z-docs/DUFFEL_INTEGRATION/FLIGHT_PAYMENT_FLOW_GUIDE.md)
**Flight Payment Flow Documentation**

---

### [z-docs/DUFFEL_INTEGRATION/DUFFEL_KEYS_AND_CHECKOUT.md](z-docs/DUFFEL_INTEGRATION/DUFFEL_KEYS_AND_CHECKOUT.md)
**Keys and Checkout Configuration**

**Key Points:**
- No Stripe secret keys needed for Duffel card flow
- DuffelPayments UI uses client_token from backend
- @duffel/components handles PCI scope reduction

---

### [z-docs/DUFFEL_INTEGRATION/DUFFEL_ENTERPRISE_IMPLEMENTATION_PLAN.md](z-docs/DUFFEL_INTEGRATION/DUFFEL_ENTERPRISE_IMPLEMENTATION_PLAN.md)
**Enterprise Implementation Plan**

---

### Additional Docs
- [DUFFEL_API_ENDPOINT_MAPPING.md](z-docs/DUFFEL_INTEGRATION/DUFFEL_API_ENDPOINT_MAPPING.md)
- [DUFFEL_STAYS_API_NOTES.md](z-docs/DUFFEL_INTEGRATION/DUFFEL_STAYS_API_NOTES.md)
- [DUFFEL_IMPLEMENTATION_ROADMAP.md](z-docs/DUFFEL_INTEGRATION/DUFFEL_IMPLEMENTATION_ROADMAP.md)
- [FLIGHTS_STAYS_HOLD_CANCEL_REFUND_GUIDE.md](z-docs/DUFFEL_INTEGRATION/FLIGHTS_STAYS_HOLD_CANCEL_REFUND_GUIDE.md)

---

### [docs/hotel-payment-flow-refactor-plan.md](docs/hotel-payment-flow-refactor-plan.md)
**Hotel Payment Flow Refactor Plan**

**Current State:**
- HotelCheckoutDuffel does direct submit booking
- Two-step checkout: guest details → payment
- Uses DuffelPayments for Stays

**Refactoring Goals:**
- Add payment intent API routes (POST /api/v1/stays/payment-intents)
- Separate prepare/confirm lifecycle
- Lazy load HotelCheckoutDuffel with Suspense
- State machine refactor for checkout

---

### [docs/url-routing-audit.md](docs/url-routing-audit.md)
**URL Routing Audit**

**Stays Related:**
- `/[locale]/(booking)/hotels/[id]` - Hotel detail with Duffel stays vs mock
- `/[locale]/(booking)/hotels/payment` - Checkout endpoint
- Parameters: quote_id (Duffel `quo_…` style)

---

---

## 17. STATIC CLIENT KEY USAGE

The static `NEXT_PUBLIC_DUFFEL_CLIENT_KEY` environment variable is used in:

1. **[src/components/hotels/HotelCheckoutDuffel.tsx](src/components/hotels/HotelCheckoutDuffel.tsx#L56)**
   - Line 56: `const duffelClientKey = process.env.NEXT_PUBLIC_DUFFEL_CLIENT_KEY?.trim() ?? ""`
   - Line 59: Logging client key existence
   - Line 217: Passed to `createThreeDSecureSession()`
   - Line 493-496: Error message if missing

2. **[src/components/hotels/StaysDuffelCardBlock.tsx](src/components/hotels/StaysDuffelCardBlock.tsx)**
   - Passed as prop `clientKey` to component
   - Line 48: Passed to `DuffelCardForm` component

---

## 18. PAYMENT ARCHITECTURE SUMMARY

### Stays (Hotels) Payment Flow

```
User Flow:
1. Browse hotels → Select room → Get quote (quote_id)
2. Navigate to /hotels/payment?quote_id=quo_...
3. Fill guest details (name, email, phone, DOB)
4. Enter card details via DuffelCardForm
5. Authenticate via 3DS
6. System creates booking with three_d_secure_session_id

API Flow:
1. HotelCheckoutDuffel (client-side)
   └─ cardBlockRef.tokenizeCard() → card_id
   └─ createThreeDSecureSession(clientKey, card_id, quote_id)
      └─ Returns: three_d_secure_session_id (when ready_for_payment)
   └─ postStaysBooking(quote_id, email, phone, guests, 3ds_session_id)

2. POST /api/v1/stays/bookings
   └─ Validates input
   └─ createDuffelStayBooking()
      └─ staysCreateBooking() → Calls Duffel API
      └─ parseStaysBooking() → Extract data
      └─ bookingRepository.createHotelStayBookingFromDuffel()
      └─ Returns: booking_ref_no, id, status

3. Duffel Webhook
   └─ POST /api/v1/webhooks/duffel
   └─ recordDuffelWebhookEvent()
   └─ applyDuffelWebhookEventSideEffects()
   └─ Syncs booking status to database
```

### Flights Payment Flow

```
1. POST /api/v1/flights/payment-intents
   └─ prepareFlightCheckout()
   └─ createFlightCheckoutPaymentIntent()
   └─ Returns: payment_intent_id, client_token, status, pricing

2. Client: DuffelPayments component
   └─ Uses client_token to display payment form
   └─ Handles card entry and 3DS

3. POST /api/v1/flights/payment-intents/{id}/confirm
   └─ confirmFlightCheckout()
   └─ confirmFlightCheckoutPaymentIntent()
   └─ Returns: confirmed payment status
```

---

## 19. CONFIGURATION CHECKLIST

**Required Environment Variables:**
- ✓ `DUFFEL_API_KEY` - Server-side API key
- ✓ `DUFFEL_API_URL` - Default: https://api.duffel.com
- ✓ `NEXT_PUBLIC_DUFFEL_CLIENT_KEY` - Client-side key for @duffel/components
- ✓ `DUFFEL_WEBHOOK_SECRET` - For webhook signature verification
- ✓ `FLIGHT_PAYMENT_PROVIDER` - Set to "duffel_payments"
- ✓ `DUFFEL_PAYMENTS_FEE_RATE` - Card fee percentage (0.029)

---

## 20. KEY FILES SUMMARY TABLE

| Category | File | Purpose | Status |
|----------|------|---------|--------|
| **Config** | [.env.example](.env.example) | Environment variables | ✓ Complete |
| | [src/lib/duffel/config.ts](src/lib/duffel/config.ts) | Duffel configuration | ✓ Complete |
| **Client HTTP** | [src/lib/duffel/client.ts](src/lib/duffel/client.ts) | API client | ✓ Complete |
| | [src/lib/http/stays.client.ts](src/lib/http/stays.client.ts) | Browser stays client | ✓ Complete |
| **Stays HTTP** | [src/lib/duffel/stays-http.ts](src/lib/duffel/stays-http.ts) | Stays endpoints | ✓ Complete |
| **Components** | [src/components/hotels/HotelCheckoutDuffel.tsx](src/components/hotels/HotelCheckoutDuffel.tsx) | Stays checkout UI | ✓ Complete |
| | [src/components/hotels/StaysDuffelCardBlock.tsx](src/components/hotels/StaysDuffelCardBlock.tsx) | Card form wrapper | ✓ Complete |
| **API Routes** | [app/api/v1/stays/bookings/route.ts](app/api/v1/stays/bookings/route.ts) | Create booking | ✓ Complete |
| | [app/api/v1/webhooks/duffel/route.ts](app/api/v1/webhooks/duffel/route.ts) | Webhook receiver | ✓ Complete |
| **Services** | [src/lib/services/stays/stays-booking.service.ts](src/lib/services/stays/stays-booking.service.ts) | Booking service | ✓ Complete |
| | [src/lib/services/duffel/duffel-webhook-handlers.ts](src/lib/services/duffel/duffel-webhook-handlers.ts) | Webhook handlers | ✓ Complete |
| **Payments** | [src/lib/payments/flight-payment-orchestrator.ts](src/lib/payments/flight-payment-orchestrator.ts) | Flight orchestration | ✓ Complete |

---

**Total Files with Duffel Integration:** 40+  
**Total API Routes:** 5  
**Total Components:** 7+  
**Total Services:** 6+  
**Package Dependencies:** 2 (@duffel/api, @duffel/components)
