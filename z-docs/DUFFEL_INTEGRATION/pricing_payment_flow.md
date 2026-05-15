now search and every things from the duffel docu,mentations and all famous plateform using the duffel for flights , hotels  and car integrations and than give me professional answer for this project traveltourup in which user directally booking flights,hotels, and car but after the payment and here we used the duffel integrations for all these three 

1) how we recieve the payment from the clients before book the flights
2) how to refund and return after cancelation to customers
3) how we manage booking when customer booking and there are no enough money in duffel wallet if we donot use the payment intent 
4) whats the commission and revenue strategies for the flights using the duffel and 
5) how we define total price for flights( basic flights price + duffel fee + our commission) so that at the end its matching to same flights with same features and not exceeded and customer choose us

its compulsory for us to recieive payment before any booking and its also compulsory to cancel the payment if booking faild using the transaction and ACID algorithm and also we are at the starting point in this plateform so which approach is best and final and other plateforms(using the duffel) at the starting using for payment at the starting point of this kind of plateform 


first of all i want the final answer of these questions and than i will start the implementation into this project so every things should be according to the best practices and customer choose us with best user experience with normal pricing with smooth payment and booking and we also recieve our commissions

and give me final and best and authentic and smooth and long term approach for us





You are a principal-level travel platform architect and senior full-stack engineer.

Your task is to create a COMPLETE, PROFESSIONAL, IMPLEMENTATION-READY PLAN for the FLIGHTS MODULE ONLY in the TravelTourUp project.

IMPORTANT:
- Focus ONLY on FLIGHTS.
- Ignore hotels and cars for now.
- Do NOT implement immediately.
- First produce a full solid planning and gap-analysis document:
  1) what is already implemented in this codebase
  2) what is partially implemented and needs refactor
  3) what should be removed / deprecated / cleaned
  4) what new components/services/routes/schema/jobs/docs/tests must be added
  5) what the final recommended architecture should be
- The plan must be based on:
  - Duffel official documentation
  - industry-standard OTA best practices
  - startup-friendly commercial strategy
  - stable, maintainable, long-term architecture
- The solution must be optimized, professional, and production-grade.

PROJECT CONTEXT
- Project: TravelTourUp
- Stack appears to be Next.js + TypeScript + Prisma + Duffel integrations
- The business model is direct-to-consumer flight booking
- Users must pay before ticketing
- We are using Duffel for flights
- We want the best startup-safe and long-term flight architecture
- We want good UX, competitive pricing, low operational risk, and real commissions/revenue
- We want the flights module to be designed in a way that is stable, professional, supportable, and scalable

LOCKED BUSINESS DECISIONS / RECOMMENDED TARGET APPROACH
These decisions are already chosen and should be treated as the recommended final direction unless the codebase proves a major blocker:

1. FLIGHT PAYMENT MODEL
   Use Duffel PaymentIntents (pit_*) as the primary pay-now flight payment rail.
   Recommended flow:
   - validate offer, ancillaries, passenger data first
   - create / use one Duffel PaymentIntent per checkout attempt
   - collect card through Duffel’s frontend rail
   - confirm PaymentIntent server-side only after server-side validation passes
   - create air order only after payment intent is succeeded
   - if order fails after payment, trigger compensating refund immediately (recommended best effort)
   - protect all money-moving operations with idempotency and replay-safe state

2. TRANSACTION MODEL
   Do NOT pretend a literal ACID transaction is possible across:
   - customer card network
   - Duffel
   - airline
   - local DB
   Instead, design this as a professional SAGA with:
   - validation before capture
   - idempotent create/confirm/order/refund flow
   - compensating refunds on order failure
   - persisted terminal states
   - reconciliation jobs / runbooks

3. PRICING / REVENUE MODEL
   Flights should be treated as a LOW-MARGIN acquisition product at startup.
   Recommended pricing strategy:
   - low dynamic markup
   - transparent final total
   - hard caps
   - avoid hidden fees
   - avoid being materially above market for the same normalized product
   - do NOT promise “always cheapest” without true competitor data
   - start with a low-capped rule engine
   - later evolve into competitor-aware pricing if/when real competitor intelligence exists

4. STARTUP COMMERCIAL PRINCIPLE
   Best startup flight positioning is:
   - keep markup low
   - keep checkout smooth
   - keep refund/cancel behavior honest
   - differentiate on UX/support/trust
   - do not try to win only by being the absolute cheapest fare everywhere

5. CANCELLATION / REFUND MODEL
   Cancellation and refund must be designed in a professional OTA way:
   - use Duffel cancellation quote -> confirm flow
   - after airline-side cancellation, refund traveler appropriately
   - if customer paid via Duffel PaymentIntent, plan pass-through refund to original payment method using Duffel refunds where appropriate
   - support partial refund, refund pending, refund failed, and non-refundable outcomes
   - make statuses clear for customer support and admin operations

6. “RETURN” / CHANGE MODEL
   In flights, “return” should NOT be handled as vague product language.
   Treat this carefully:
   - round-trip return leg is not a refund/change concept
   - user-requested itinerary change should be designed as a proper voluntary change / order change / exchange flow
   - if not fully implemented now, plan it as a phased module
   - do not mix it with cancellation logic

CORE GOAL
Create the BEST FINAL FLIGHTS PLAN for TravelTourUp:
- pricing strategy
- payment strategy
- booking orchestration
- failure handling
- refund architecture
- cancellation handling
- exchange / order change roadmap
- schema / state model
- APIs
- webhooks
- reconciliation
- observability
- support/admin tools
- rollout phases
- tests

CODEBASE-FIRST ANALYSIS REQUIRED
Before recommending changes, inspect the repository and compare CURRENT STATE vs TARGET STATE.

You MUST inspect and analyze the current flight-related code and docs, especially these kinds of files if present:
- flight checkout UI
- payment intent creation
- booking orchestration
- Duffel adapters
- pricing config / pricing formula
- booking repository / Prisma schema
- cancellation routes/services
- refund routes/services
- webhook handlers
- docs under z-docs / Duffel integration

At minimum, inspect and reason about the current purpose/status of these paths if they exist:
- src/components/flights/FlightCheckoutDuffel.tsx
- src/lib/services/flights/flights-booking.service.ts
- src/lib/services/flights/flight-payment-intent.service.ts
- src/lib/payments/duffel-intent-pricing.ts
- src/config/flight-payments.config.ts
- src/lib/duffel/payment-intents.ts
- src/lib/duffel/orders.ts
- src/lib/duffel/refunds.ts
- src/lib/services/flights/flight-cancel.service.ts
- src/lib/services/flights/flight-refund.service.ts
- src/lib/db/repositories/booking.repository.ts
- src/lib/db/repositories/flight-payment-intent.repository.ts
- prisma/schema.prisma
- app/api/v1/flights/payment-intents/route.ts
- app/api/v1/flights/bookings/route.ts
- app/api/v