# TravelTourUp — Project Architecture

This document explains how the **TravelTourUp** codebase is structured, why key decisions were made, and how data flows from the browser through Next.js, APIs, Supabase auth, Prisma, and external providers (notably **Duffel** for flights and stays).

---

## 1. Project Overview

### What this project does

TravelTourUp is a **travel booking and content platform** that lets users:

- Search and book **flights**, **hotels (stays)**, and **cars**, with payments orchestrated through **Duffel** (flights/stays) and app-specific booking records in PostgreSQL.
- Manage **profile**, **bookings**, and (for staff) an **admin panel** for users, roles, permissions, blogs, and catalog entities.

Marketing surfaces include **home**, **about**, **blog**, **FAQs**, **contact**, **terms**, and **privacy**.

### Tech stack

| Layer | Technology |
|--------|------------|
| Framework | **Next.js 16** (App Router) |
| Language | **TypeScript** |
| UI | **React 19**, **Tailwind CSS 4**, **Radix UI**, **Framer Motion**, **Lucide** icons |
| Auth | **Supabase Auth** (`@supabase/ssr`, `@supabase/supabase-js`) — cookie sessions for web, optional Bearer tokens for API-style clients |
| Database | **PostgreSQL** (hosted via Supabase) via **Prisma 7** with `@prisma/adapter-pg` and `pg` |
| Validation | **Zod** |
| Travel APIs | **Duffel** (flights, stays quotes/bookings, payment intents, webhooks) |
| Rich text (blog) | **TipTap** |
| Testing | **Vitest** |

### High-level architecture

The app is a **modular monolith**: a single Next.js deployment owns UI, Route Handlers under `/api/v1/*`, server actions, and background-ish webhook handling. There is **no separate BFF service**; scaling is primarily **horizontal scaling of the Next.js runtime** plus **database connection pooling** (Supabase pooler URL for `DATABASE_URL` is supported in code comments and Prisma setup).

**Why a monolith here:** Faster iteration, shared types and validation between UI and API, and simpler deployment (e.g. Vercel + managed Postgres). External complexity is pushed to **Duffel** and **Supabase** rather than many internal microservices.

---

## 2. Folder Structure

### Complete tree (high level)

Repository root (selected; `node_modules` omitted):

```
traveltourup_next/
├── app/                          # Next.js App Router: pages, layouts, Route Handlers
│   ├── (admin)/admin/            # Admin UI (RBAC-gated)
│   ├── (auth)/                   # Login, signup, forgot-password
│   ├── (booking)/               # Flights, hotels, cars + payment subroutes
│   ├── (marketing)/             # Public marketing + profile
│   ├── api/v1/                  # Versioned REST API
│   ├── auth/                    # OAuth callback, password update
│   ├── layout.tsx               # Root layout (fonts, providers)
│   ├── globals.css              # Design tokens + Tailwind
│   ├── error.tsx, not-found.tsx, loading.tsx, robots.ts, sitemap.ts
├── prisma/
│   ├── schema.prisma            # Data model
│   ├── migrations/              # SQL migrations
│   └── seed/                    # Bootstrap roles, permissions, etc.
├── public/                      # Static assets
├── src/
│   ├── components/              # React components (domain + shared + admin_ui)
│   ├── config/                  # Metadata, featured content config
│   ├── data/                    # Static datasets (airports, FAQs, mock data)
│   ├── generated/prisma/        # Prisma Client output (generated)
│   ├── hooks/                   # Shared hooks (e.g. toast)
│   ├── lib/                     # Core logic: API, authz, services, Duffel, Prisma
│   ├── types/                   # Shared TS types
│   └── views/                   # Large page-level views (e.g. Home, Flights)
├── proxy.ts                     # Next.js 16 “proxy” (session refresh, CORS preflight)
├── next.config.ts
├── prisma.config.ts             # Prisma 7 datasource + migrate URL
├── package.json
└── vitest.config.ts
```

### Purpose by area

#### `app/` (App Router)

- **Route groups** `(marketing)`, `(booking)`, `(auth)`, `(admin)` share layouts without affecting the URL.
- **Colocation**: `page.tsx`, `layout.tsx`, `loading.tsx` live next to the route they serve.
- **`app/api/v1/`**: REST-style Route Handlers; thin files delegate to **`src/lib/api/*`** controllers and **`src/lib/services/*`**.

**Why route groups:** Different chrome (e.g. admin shell vs marketing navbar) without duplicating path segments.

#### `src/components/`

- **`ui/`**, **`admin_ui/ui/`**: Reusable primitives (buttons, inputs, tables) aligned with Tailwind + Radix.
- **Domain folders** (`flights/`, `hotels/`, `cars/`, `blog/`, `bookings/`): feature UI.
- **`admin/`**: Admin-specific screens (users, roles, blogs).
- **`shared/`**: Navbar, footer, breadcrumbs, layouts used across marketing/booking.
- **`providers/`**: Client providers (e.g. `AuthProvider`).

**Why split `admin_ui`:** Admin uses a denser “dashboard” visual language; keeping it separate avoids leaking admin-only styling into customer pages.

#### `src/lib/`

Central **non-UI** logic:

- **`supabase/`**: Browser client, server client, proxy/session helper.
- **`authz/`**: RBAC resolution, guards, profile bootstrap.
- **`api/`**: Route wrappers (`withAuthedRoute`, `withPermissionRoute`), error handling, controllers.
- **`services/`**: Use-case layer (user, stays, flights, blog, admin).
- **`db/repositories/`**: Persistence helpers where used.
- **`duffel/`**, **`stays/`**, **`flights/`**, **`payments/`**: Integration and orchestration.
- **`validations/`**: Zod schemas shared by API and forms.
- **`http/`**: Browser `fetch` helpers for calling `/api/v1/*`.

**Why `lib` vs `services`:** `services` holds orchestration and Prisma calls; `lib` also contains cross-cutting concerns (authz, HTTP client, errors).

#### `src/hooks/`

Minimal global hooks (e.g. **toast**). Most feature logic uses **component-local state** or **server components + URL state** (search params for admin lists).

#### `src/types/` and `src/views/`

- **`types/`**: Shared DTO-style types (bookings, hotels, etc.).
- **`views/`**: Large composed pages imported by thin `app/**/page.tsx` files to keep route files readable.

#### No `src/store/`

There is **no Redux/Zustand/Jotai** in this codebase. Global client state is essentially **Supabase session** via `AuthProvider`; server state uses **fetch**, **server components**, and **server actions**.

---

## 3. Routing & Pages Flow

### Public routes (examples)

| Path | Role |
|------|------|
| `/` | Home |
| `/about`, `/contact`, `/faqs`, `/terms`, `/privacy` | Marketing |
| `/blog`, `/blog/[slug]` | Blog |
| `/flights`, `/flights/[id]`, `/flights/payment` | Booking (flights) |
| `/hotels`, `/hotels/[id]`, `/hotels/payment` | Booking (stays) |
| `/cars`, `/cars/[id]`, `/cars/payment` | Cars |
| `/login`, `/signup`, `/forgot-password` | Auth |

### Protected / special routes

| Path | Protection |
|------|------------|
| `/profile`, `/profile/bookings`, `/profile/bookings/[id]` | Requires login (page-level `redirect` + optional middleware/proxy) |
| `/admin/**` | Login + **admin panel role** (see §6) |

### Layout structure

```
app/layout.tsx          # Root: ThemeProvider, AuthProvider, PageLoader, fonts
├── (marketing)/layout.tsx   # Navbar, Breadcrumb, Footer
├── (booking)/layout.tsx     # Same chrome as marketing (shared nav)
├── (auth)/layout.tsx        # Auth-specific shell
└── (admin)/admin/layout.tsx # AdminShell + RBAC redirect
```

**Root layout** (`app/layout.tsx`) sets **fonts**, **theme script** (localStorage + `data-theme`), and wraps children with **`ThemeProvider`** and **`AuthProvider`** so any client subtree can call `useAuth()`.

**Admin layout** (`app/(admin)/admin/layout.tsx`) is an **async Server Component** that calls `getServerAuthz()`, redirects unauthenticated users to login, and non-admins to `/`. This keeps **heavy RBAC off the network edge** (see `src/lib/supabase/middleware.ts` comments).

### Navigation

- **`<Link>`** and **`useRouter()`** from `next/navigation` for client transitions.
- Admin lists encode **filters and pagination in the URL** (`?page=&limit=&q=&role_id=`) so lists are bookmarkable and SSR-friendly.

### Dynamic routes

- **`[id]`** segments identify a **flight offer session**, **hotel/stay detail**, or **car** depending on the vertical; each page loads data via server components and/or client fetch to `/api/v1/*`.
- **`blog/[slug]`** resolves blog posts by slug.

---

## 4. UI Architecture

### Design system

- **Tailwind CSS 4** with **`globals.css`** defining CSS variables for **light/dark** and theme variants (e.g. `data-theme`).
- **`tailwind-merge`** + **`clsx`** + **`class-variance-authority`** for component variants.
- **Radix** primitives for accessible dialogs, dropdowns, tabs, etc.

### Reusable components

- Customer-facing: `src/components/ui/*` (cards, inputs, modals).
- Admin: `src/components/admin_ui/*` (data tables, filters, page headers).

### Composition and data flow

- **Server Components** fetch data (Prisma, Supabase user, etc.) and pass **serializable props** to client components.
- **Client Components** (`"use client"`) handle interactivity: filters, tables, checkout flows.
- **Props flow down**; **events and router.refresh()** bubble state changes back to the server-rendered tree where appropriate.

**Example — admin users:** `app/(admin)/admin/users/page.tsx` loads rows server-side; `UserList` receives `rows`, `total`, `query` and updates the URL when filters change, triggering a new server render.

---

## 5. State Management

### What is used

| Concern | Mechanism |
|---------|-----------|
| Session / user | **React Context** — `AuthProvider` + `useAuth()` wrapping Supabase browser client |
| Forms (auth) | **Server Actions** — `useActionState` + `signInAction` etc. (`src/lib/auth/actions.ts`) |
| Admin lists | **URL search params** + server re-fetch |
| Theme | **ThemeProvider** + `localStorage` + root script to avoid flash |

### Global vs local

- **Global (client):** authenticated Supabase `user` / `session`, theme mode.
- **Local:** almost all booking search UI state, modals, table selection.
- **Server-authoritative:** bookings, RBAC — always reconciled via API or server components.

### Data flow (mental model)

```
Browser → cookie/Bearer → getServerAuthz() → Prisma / Duffel
                ↓
         AuthProvider (client mirror of session for UI)
```

---

## 6. Authentication & Authorization

### Authentication (Supabase)

1. **Web login (primary path):** `LoginCom` submits to **`signInAction`** (server action). `createSupabaseServerClient()` performs `signInWithPassword`; cookies are set for subsequent requests. Profile rows are ensured via **`ensureUserProfileForAuthUser`**.
2. **OAuth / magic link:** `app/auth/callback/route.ts` exchanges `code` for a session and ensures profile.
3. **REST/mobile-style:** `POST /api/v1/auth/login` returns **tokens** via stateless Supabase client (`auth.controller.ts`) — no cookie persistence in that handler; clients store tokens and send `Authorization: Bearer`.

**Why two paths:** Web UX favors cookies and SSR; external clients favor explicit tokens.

### Authorization (RBAC)

- **Catalog in DB:** `roles`, `permissions`, `role_permissions`, `user_roles`, `user_permission_grants`.
- **Bootstrap** from `src/lib/authz/registry.ts` via seed; runtime checks use **permission id strings** stored in the database.
- **`getAuthzContextForUserId`** loads effective permissions for a user.
- **Route Handlers** use **`withAuthedRoute`** / **`withPermissionRoute`** (`src/lib/api/with-route-auth.ts`) or ad-hoc **`assertPermission`**.
- **Server Components** (e.g. admin layout) use **`getServerAuthz()`** + **`hasAnyRole(..., ADMIN_PANEL_ROLE_IDS)`**.

### Admin vs customer

- **Admin panel:** Users must hold at least one role in **`ADMIN_PANEL_ROLE_IDS`** (from registry).
- **Fine-grained:** Permissions like `admin.users:read`, `bookings:read_all`, etc.

### Middleware / proxy guards

**`proxy.ts` (Next.js 16)** runs at the network boundary:

- Refreshes **Supabase session** cookies via `updateSupabaseSession`.
- Redirects **authenticated** users away from auth pages (`/login`, `/signup`, `/forgot-password`) to `next` or home.
- Redirects **unauthenticated** users away from **`/admin/*`** and **`/profile/*`** to `/login?next=...`.
- **API routes** skip session refresh and return early for CORS **OPTIONS**.

**RBAC for admin** is **not** in the proxy (by design — no DB in edge/proxy); it runs in **`admin/layout.tsx`**.

---

## 7. Backend Architecture

### API style

**REST**, JSON, versioned under **`/api/v1`**.

### Structure

- **Route Handler** (`app/api/v1/.../route.ts`): HTTP method exports, `dynamic = "force-dynamic"` where auth/data changes per request.
- **Controller** (`src/lib/api/**/**.controller.ts`): Parse body/query, call service, return `successResponse` or throw.
- **Service** (`src/lib/services/**`): Business logic + Prisma + external APIs.

### Validation and errors

- **Zod** schemas in `src/lib/validations/`.
- **`handleApiError`** maps `ZodError`, `AppError`, `ForbiddenError`, `UnauthorizedError`, `DuffelApiError`, etc., to consistent JSON (`src/lib/api/error-handler.ts`).

### Cross-cutting

- **Rate limiting** on sensitive routes (e.g. flight payment intents) via `src/lib/api/rate-limit-ip.ts`.
- **CORS** headers on `/api/v1/*` in `next.config.ts` and **OPTIONS** handling in `proxy.ts`.

---

## 8. Database Design

### Prisma + PostgreSQL

- **Prisma schema:** `prisma/schema.prisma`; client generated to **`src/generated/prisma`** (custom output for IDE consistency).
- **Migrations:** `prisma/migrations/` — incremental SQL; **`prisma.config.ts`** wires datasource URL (migrate uses **`DIRECT_URL`** when set for Supabase).

### Identity model

- **Supabase `auth.users`** holds credentials; **`public.users`** (`User` model) mirrors **`User.id`** to **`auth.users.id`** (UUID) for profile and relations.

### Core entities (conceptual)

- **RBAC:** `Role`, `Permission`, join tables, optional `UserPermissionGrant`.
- **Bookings:** `Booking` + type-specific **`FlightBooking`**, **`HotelBooking`**, **`CarBooking`** with Duffel references and JSON payloads.
- **Flights:** `FlightSearchSession`, `FlightPaymentIntentRecord`, `DuffelWebhookEvent`, ancillaries, cancellations.
- **Content:** `BlogPost`, `BlogCategory`, `BlogPostImage`; **admin catalog:** `AdminHotel`, `AdminCar`.

### Queries

- **Prisma** from `src/lib/prisma.ts` using **`@prisma/adapter-pg`** and a **`pg` Pool** (singleton in dev).
- **SSL:** Helper adjusts pool config for Supabase TLS chains (`rejectUnauthorized`).

### Migrations and seed

- **`npm run db:migrate`**, **`db:deploy`**, **`db:seed`**, **`db:seed-admin`** (super admin) per `package.json`.

---

## 9. Data Fetching Strategy

### Server vs client

- **Server Components** default for pages that can read cookies and Prisma directly (profile, admin lists).
- **Client Components** for interactive flows and Duffel-embedded UIs; they call **`fetch('/api/v1/...')`** via **`src/lib/http/*` clients** with **`credentials: "include"`**.

### Rendering modes

- Many authenticated or user-specific pages set **`export const dynamic = "force-dynamic"`** to avoid stale cached HTML.
- Marketing pages can use static generation where not explicitly forced (check per route).

### Methods

- **`fetch`** in route handlers and clients; no axios in dependencies.
- **Server Actions** for auth forms (`"use server"`).
- **No GraphQL** in this repo.

---

## 10. Core Features Implementation

### Authentication

- **Web:** Server actions + Supabase cookie session + optional OAuth callback.
- **API tokens:** JSON login/refresh handlers for Bearer usage.
- **Profile bootstrap:** `ensureUserProfileForAuthUser` + default customer role assignment where applicable (`src/lib/authz/profile.ts`).

### Cart

There is **no classic shopping-cart model** (no `Cart` table or session cart). Users proceed **directly to vertical-specific checkout** (flights/hotels/cars). “Intent to buy” for discovery is represented by **booking** records.

### Payments

- **Flights:** `POST /api/v1/flights/payment-intents` creates/aligns **Duffel Payment Intent** records (`FlightPaymentIntentRecord`); confirm route finalizes; amounts and FX governed by env-driven helpers in **`src/lib/payments/`** and Duffel docs in repo.
- **Stays/hotels:** Quotes and bookings via Duffel Stays APIs (`/api/v1/stays/*`), persisted on `HotelBooking` / `Booking`.
- **Webhooks:** `POST /api/v1/webhooks/duffel` processes Duffel events (signature validation via env).

### Search / filtering / sorting

- **Flights:** Search session stored (`FlightSearchSession`); UI filters in components under `src/components/flights/results/`; Duffel API for inventory.
- **Stays:** `POST /api/v1/stays/search`, rates routes — server-side validation and Duffel.
- **Admin users:** Query params `q`, `role_id`, `sort`, `order` parsed with Zod; Prisma queries in `user.service.ts`.

### Pagination

- **Pattern:** `page`, `limit`, `meta.total`, `meta.totalPages` in list APIs (see `apiPaginatedJson` in `src/lib/http/api-client.ts`).
- **UI:** Data tables push new query strings; server components reload data.

---

## 11. Reusable Logic & Patterns

### Custom hooks

- **`useAuth`** — session from context.
- **`use-toast`** — notifications (admin_ui / hooks).

### Utilities

- **`src/lib/utils`** — `cn()` and shared helpers.
- **`src/lib/auth/redirect.ts`** — safe internal paths for `next` params (open redirect mitigation).

### Shared services

- **`src/lib/services/*`** — single place for “use case” logic reused by Route Handlers and sometimes server components.

### API client pattern

- **`apiJson` / `apiPaginatedJson`** assume responses shaped as `{ data: T }` and paginated envelopes — keeps client code small and consistent.

---

## 12. Performance & Optimization

- **Prisma:** Library engine + connection pooling for serverless-friendly behavior (`schema.prisma` generator options).
- **`next.config`:** `serverExternalPackages` for Prisma/DOMPurify; image remote patterns for CDNs and Supabase.
- **Bundle analyzer:** `npm run build:analyze` with `@next/bundle-analyzer`.
- **Code splitting:** Automatic per route/layout; heavy verticals (flights, maps) live in feature folders.
- **Lazy loading:** Use `dynamic` imports where applied in components (follow existing patterns when adding heavy deps).

---

## 13. Security Best Practices

### Input validation

- **Zod** on all untrusted JSON and query params in API routes.

### API protection

- **Auth** via `getServerAuthz()` (cookie or Bearer).
- **RBAC** via permission checks on admin routes.
- **Rate limiting** on abuse-prone endpoints.
- **CORS** configurable via `CORS_ALLOWED_ORIGIN`.

### Auth handling

- **HttpOnly cookies** via Supabase SSR for web.
- **Service role** key only on server (never exposed); see `.env.example` for intended variables (keep real secrets out of git).
- **Redirects:** `safeInternalPath` reduces open redirect risk on `next` query params.

### Content safety

- **isomorphic-dompurify** for sanitizing HTML where applicable (blog, rich content).

---

## 14. Deployment & Environment

### Environment variables (conceptual)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_APP_URL` | Absolute URLs for emails/links |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase client |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only admin operations |
| `DATABASE_URL`, `DIRECT_URL` | Prisma runtime vs migrate |
| `DUFFEL_API_KEY`, `DUFFEL_WEBHOOK_SECRET`, etc. | Duffel integration |
| `CORS_ALLOWED_ORIGIN` | Lock down browser API access if needed |
| `DATABASE_SSL_REJECT_UNAUTHORIZED` | TLS strictness for Postgres |

Use **`.env.local`** locally; **Vercel** (or similar) project settings for production.

### Build

- **`npm run build`:** `prisma generate` then `next build`.
- **`postinstall`:** `prisma generate` for CI/deploy.

### Deployment strategy

- Typical target: **Vercel** for Next.js + **Supabase** for auth/DB/storage.
- Run **`prisma migrate deploy`** in release pipeline against `DIRECT_URL` or production migrate URL.

---

## 15. Full App Flow (End-to-End)

### Example: Browse → book flight

```
1. User opens `/flights`
   → Marketing/booking layout renders Navbar.
   → Client/server load search UI; may call POST /api/v1/flights/search (and related) with Duffel.

2. User proceeds to checkout
   → Payment intent created via POST /api/v1/flights/payment-intents (auth + rate limit + Duffel).
   → FlightPaymentIntentRecord links offer, amounts, client_token.

3. Confirm / book
   → Confirm route + Duffel order creation; Booking + FlightBooking rows persisted; webhook may update state.

4. View booking
   → /profile/bookings loads from Prisma via server components or /api/v1/bookings.
```

**ASCII diagram**

```
[Browser]
   │  cookies / Bearer
   ▼
[Next.js proxy.ts] ──► session refresh, auth page redirects
   │
   ▼
[Route Handler / Server Component]
   │  getServerAuthz()
   ▼
[Services + Prisma] ──► PostgreSQL
   │
   ▼
[Duffel HTTP API] ──► airlines / NDC / stays inventory
```

---

## 16. Developer Notes

### Conventions

- **API version prefix:** `/api/v1`.
- **Success envelope:** `{ data: ... }` for JSON APIs using `successResponse`.
- **Permission ids:** String slugs like `bookings:read_own` — keep stable; migrate DB when renaming.
- **User id:** Always Supabase UUID; `public.users.id` matches `auth.users.id`.

### Scaling considerations

- **Connection limits:** Pool size and Prisma in serverless — monitor Supabase pooler vs direct connections.
- **Duffel rate limits:** Upstream errors mapped in `handleApiError`; backoff/retry at integration layer if needed.
- **RBAC growth:** Prefer new **permissions** and **role assignments** over hardcoding role names in components.
- **Large JSON:** Booking payloads stored as Json — consider archival/compression policies for compliance and cost.

### Operational checklist

- Configure **Duffel webhooks** in dashboard pointing to `/api/v1/webhooks/duffel`.
- Run **migrations** before deploying schema-dependent code.
- After seed, create **super admin** via documented script when bootstrapping environments.

---

*This document reflects the repository layout and patterns as of the analysis date. When in doubt, follow existing modules in `src/lib/services` and `app/api/v1` for consistency.*
