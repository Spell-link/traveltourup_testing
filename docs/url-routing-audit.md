# URL handling, routing, and query logic — codebase audit

This document is based on the **TravelTourUp Next.js** project (`app/` router only; **no `pages/` directory**). File paths are relative to the repository root unless noted.

---

## 1. Routing structure

### Route groups (folders in parentheses do not appear in the URL)

| Group | Purpose |
|-------|---------|
| `(marketing)` | Public marketing, blog, profile (customer) |
| `(booking)` | Flights, hotels, cars, payment flows; uses `BookingLayoutClient` (navbar, breadcrumb, footer) |
| `(auth)` | Login, signup, forgot-password |
| `(admin)` | Admin UI under `/admin` |

### All `page.tsx` routes (under `app/`)

Static and dynamic routes discovered:

| URL pattern | File |
|-------------|------|
| `/` | `app/(marketing)/page.tsx` |
| `/about` | `app/(marketing)/about/page.tsx` |
| `/blog` | `app/(marketing)/blog/page.tsx` |
| `/blog/[slug]` | `app/(marketing)/blog/[slug]/page.tsx` |
| `/contact` | `app/(marketing)/contact/page.tsx` |
| `/faqs` | `app/(marketing)/faqs/page.tsx` |
| `/privacy` | `app/(marketing)/privacy/page.tsx` |
| `/terms` | `app/(marketing)/terms/page.tsx` |
| `/profile` | `app/(marketing)/profile/page.tsx` |
| `/profile/bookings` | `app/(marketing)/profile/bookings/page.tsx` |
| `/profile/bookings/[id]` | `app/(marketing)/profile/bookings/[id]/page.tsx` |
| `/flights` | `app/(booking)/flights/page.tsx` |
| `/flights/[id]` | `app/(booking)/flights/[id]/page.tsx` |
| `/flights/payment` | `app/(booking)/flights/payment/page.tsx` |
| `/hotels` | `app/(booking)/hotels/page.tsx` |
| `/hotels/[id]` | `app/(booking)/hotels/[id]/page.tsx` |
| `/hotels/payment` | `app/(booking)/hotels/payment/page.tsx` |
| `/cars` | `app/(booking)/cars/page.tsx` |
| `/cars/[id]` | `app/(booking)/cars/[id]/page.tsx` |
| `/cars/payment` | `app/(booking)/cars/payment/page.tsx` |
| `/payment` | `app/(booking)/payment/page.tsx` |
| `/login` | `app/(auth)/login/page.tsx` |
| `/signup` | `app/(auth)/signup/page.tsx` |
| `/forgot-password` | `app/(auth)/forgot-password/page.tsx` |
| `/auth/update-password` | `app/auth/update-password/page.tsx` |
| `/auth/callback` | `app/auth/callback/route.ts` (route handler, not `page.tsx`) |
| `/admin` … | `app/(admin)/admin/...` (dashboard, users, roles, blogs, bookings, cars, flights, hotels) |
| `/robots.txt`, `/sitemap.xml` | App route handlers if present (see build output) |

### Dynamic route params — meaning

| Param | Routes | Meaning |
|-------|--------|---------|
| `[slug]` | `/blog/[slug]` | Blog post slug for CMS content |
| `[id]` | `/flights/[id]` | Flight **offer** id (Duffel `off_…` or numeric mock) |
| `[id]` | `/hotels/[id]` | Hotel id: numeric mock **or** Duffel stays search result id (`srr_…` style) |
| `[id]` | `/cars/[id]` | Car listing id |
| `[id]` | `/admin/users/[id]`, `/admin/roles/[id]` | Admin entity id |
| `[id]` | `/admin/blogs/[id]/edit` | Blog post id (admin) |
| `[id]` | `/profile/bookings/[id]` | Customer booking id |

---

## 2. `params` usage (pages / layouts / server components)

Next.js 15+ async API: `params` is often typed as `Promise<{ ... }>` and **awaited** in server components.

### Server components — `await params`

| File | Destructuring | Usage |
|------|---------------|--------|
| `app/(admin)/admin/users/[id]/page.tsx` | `const { id } = await params` | Admin user edit |
| `app/(admin)/admin/roles/[id]/page.tsx` | `const { id } = await params` | Admin role edit |
| `app/(admin)/admin/blogs/[id]/edit/page.tsx` | `const { id } = await params` | Blog edit |
| `app/(booking)/cars/[id]/page.tsx` | `const { id } = await params` | `generateMetadata` + car detail page |
| `app/(marketing)/blog/[slug]/page.tsx` | `const { slug } = await params` | Blog post + metadata |
| `app/(marketing)/profile/bookings/[id]/page.tsx` | `const { id } = await params` | Booking detail |

### Client components — `useParams()`

| File | Pattern | Usage |
|------|---------|--------|
| `app/(booking)/flights/[id]/page.tsx` | `useParams()` → `params?.id` | Offer id passed to `getFlightOffer(id)` |
| `app/(booking)/hotels/[id]/page.tsx` | `useParams()` → `params?.id` | Chooses Duffel stays vs mock hotel |

---

## 3. `searchParams` and `useSearchParams`

### Server `page.tsx` — `searchParams` (Promise in App Router)

| File | Keys read / passed | Purpose |
|------|---------------------|--------|
| `app/(booking)/flights/page.tsx` | Full record → `recordToUrlSearchParams` → `getFlightsPageLayout` | Decides **browse** vs **results** layout; does not pass individual keys to client as props |
| `app/(booking)/hotels/page.tsx` | Full record → `recordToUrlSearchParams` → `getHotelsPageLayout` | **`stays_results`** (see `src/lib/hotels/hotels-page-layout.ts`) toggles results list |
| `app/(booking)/flights/payment/page.tsx` | Preserved query → `buildFlightsPaymentPath` | Redirects to login with `next` including **all** query keys |
| `app/(booking)/hotels/payment/page.tsx` | Same pattern | `next` for login redirect |
| `app/(auth)/login/page.tsx` | `next`, `error`, `reset` | Post-login redirect and error display |
| `app/(auth)/signup/page.tsx` | `next` | Redirect target |
| `app/(auth)/forgot-password/page.tsx` | `next` | Redirect target |
| `app/(marketing)/profile/bookings/page.tsx` | `highlight` | Scroll/highlight booking ref |
| `app/(admin)/admin/users/page.tsx` | Admin list filters (via `sp`) | Table filters |
| `app/(admin)/admin/blogs/page.tsx` | Blog list filters | Admin blog list |

### Client — `useSearchParams()`

| File | Query keys | Purpose |
|------|------------|--------|
| `src/components/flights/FlightsTab.tsx` | **Full query string** (hydration) | `hydrateFlightsFormFromUrl` — all keys in `src/lib/flights/search-from-url.ts` and `hydrate-flights-form-from-url.ts` |
| `src/components/flights/FlightList.tsx` | `sort` (and full string for `flightSearchBodyFromUrl`) | Sort + refetch via `postFlightSearch`; `router.replace` updates `sort` |
| `src/components/flights/FlightDetailContent.tsx` | `search_session` | Optional Duffel search session id to load sibling offers |
| `src/components/flights/FlightPaymentEntry.tsx` | `offer_id` | Checkout offer |
| `src/components/hotels/StaysPaymentEntry.tsx` | `quote_id` | Stays quote |
| `src/components/profile/ProfileDashboard.tsx` | `tab`, `highlight` | Profile tabs and highlights |

### Naming note (not URL)

`src/components/cars/CarList.tsx` uses **local React state** named `searchParams` — this is **not** the Next.js router search params; it holds car search form fields (pickup location, dates, etc.).

---

## 4. Query keys — flights (`/flights?…`)

Defined in **`src/lib/flights/search-from-url.ts`** (`flightSearchBodyFromUrl`) and built in **`FlightsTab.buildFlightsSearchUrl`**:

| Key(s) | Role |
|--------|------|
| `origin`, `destination`, `departure_date`, `return_date`, `trip` | One-way / round-trip search |
| `slices` | JSON array for multi-city |
| `cabin_class` | Duffel cabin enum |
| `adults`, `children`, `infants`, `child_ages` | Passengers |
| `sort`, `limit` | Result ordering and cap |
| `max_price`, `max_stops`, `carrier_iata` (repeatable) | Filters |
| `max_connections`, `supplier_timeout` | Advanced Duffel offer-request settings |
| `s{i}_dep_from`, `s{i}_dep_to`, `s{i}_arr_from`, `s{i}_arr_to` | Per-slice time windows (`mergeSliceTimeWindowsFromUrl` in `search-url-extras.ts`) |

**Layout decision:** `src/lib/flights/flights-page-layout.ts` — `getFlightsPageLayout` is **`results`** iff `flightSearchBodyFromUrl(qs) != null`.

---

## 5. Query keys — hotels (`/hotels?…`)

| Key | Role |
|-----|------|
| `stays_results` | If `1` / `true` / `yes` → **results** layout (`src/lib/hotels/hotels-page-layout.ts`) |

Search **criteria and results** are stored in **`sessionStorage`** (`TTU_STAYS_SEARCH_SESSION_KEY` in `src/lib/http/stays.client.ts`), not fully encoded in the URL. See `HotelsTab.handleStaysSearch` → `router.push("/hotels?stays_results=1")`.

---

## 6. Data flow mapping

### Flights search

```
User fills FlightsTab → buildFlightsSearchUrl()
  → router.push(`/flights?...`)

URL (searchParams)
  → Server: app/(booking)/flights/page.tsx → recordToUrlSearchParams → getFlightsPageLayout
  → Client: FlightList useEffect reads queryString
      → flightSearchBodyFromUrl(searchParams)  [src/lib/flights/search-from-url.ts]
      → postFlightSearch(body)  [src/lib/http/flights.client.ts → /api/v1/flights/search]
      → UI: offers, filters

Parallel: FlightsTab useLayoutEffect
  → hydrateFlightsFormFromUrl  [src/lib/flights/hydrate-flights-form-from-url.ts]
  → form fields sync with URL
```

### Hotels search

```
User fills HotelsTab → postStaysSearch(body)  [src/lib/http/stays.client.ts]
  → POST /api/v1/stays/search
  → sessionStorage.setItem(TTU_STAYS_SEARCH_SESSION_KEY, JSON with context + results)
  → router.push("/hotels?stays_results=1")

URL: stays_results=1 only → getHotelsPageLayout → Hotels shows HotelsList

HotelsList reads sessionStorage + listens to TTU_STAYS_SEARCH_UPDATED_EVENT
```

---

## 7. API integration — where params become payloads

| Layer | File | Role |
|-------|------|------|
| Flights URL → body | `src/lib/flights/search-from-url.ts` | `flightSearchBodyFromUrl` → `FlightSearchBody` |
| Flights client | `src/lib/http/flights.client.ts` | `postFlightSearch(body)` |
| Stays client | `src/lib/http/stays.client.ts` | `postStaysSearch`, `getStaysPlaces` |
| Stays schema | `src/lib/validations/stays.schema.ts` | `lat/lng/radius` from UI destination selection |

**Normalization examples:**

- Airports: IATA codes in URL (`origin` / `destination`) uppercased in `search-from-url.ts`.
- Cabin: `normalizeCabinFromUrl` maps UI/URL variants to Duffel enums.
- Hotel “destination”: popular list uses `coordsForDestinationCode`; API places use `latitude/longitude/radius` (`HotelsTab`).

---

## 8. URL construction (client)

| Location | Mechanism | Notes |
|----------|-----------|--------|
| `FlightsTab` | `router.push(\`/flights?${p}\`)` | Full search query |
| `FlightList` | `router.replace(\`${pathname}?${p}\`)` | Updates `sort` while preserving other params |
| `HotelsTab` | `router.push("/hotels?stays_results=1")` | Minimal URL; data in session |
| `FlightDetailContent` | `router.push(\`/flights/${id}?search_session=...\`)` | Preserves offer switcher session |
| `BookingSidebar` / checkout | `router.push` with `quote_id` / paths | See grep for flights/hotels payment |
| Auth | `redirect(\`/login?next=...\`)` | Preserves return path |

---

## 9. Internal / “system” query params (public URL)

| Param | Exposure | Suggestion |
|-------|----------|------------|
| `supplier_timeout`, `max_connections` | Advanced flight search | Consider moving to POST-only body or user settings; keeps shareable URLs long |
| `max_price`, `max_stops`, `carrier_iata` | Filters | Acceptable for shareable search URLs |
| `search_session` on flight detail | Session id for fare options | Could use sessionStorage only to shorten URLs |
| `stays_results=1` | Boolean flag without rest of search | Inconsistent with flights (everything is URL-encoded); document or add `destination` slug later |

---

## 10. Middleware / proxy / redirects

- **`proxy.ts`** (root): `proxy` function runs for non-`/api/` routes → `updateSupabaseSession` from `src/lib/supabase/middleware.ts`.
  - Auth pages: logged-in user → redirect to `next` query (cleared) or safe internal path.
  - Protected `/admin`, `/profile`: unauthenticated → `/login?next=<pathname>`.
- **`app/auth/callback/route.ts`**: OAuth `code`, `next` query handling.
- **App pages**: `redirect()` in many server pages (login gates).

*(Next.js may wire `proxy.ts` as the framework entry for edge middleware; confirm in your Next 16 docs.)*

---

## 11. State sync with URL

| Area | Sync |
|------|------|
| Flights | **Strong** — search form hydrated from URL (`hydrateFlightsFormFromUrl`); list driven by same `searchParams` |
| Flights sort | **Yes** — `router.replace` updates `sort` |
| Hotels | **Weak** — only `stays_results` in URL; form/results mostly **sessionStorage** + `readStaysSearchFormSnapshot` |
| Profile | `tab`, `highlight` read in `ProfileDashboard` |

---

## 12. Problems and improvements (observed)

1. **Hotels**: Search shareability — `/hotels?stays_results=1` alone does not encode a search; deep links require session or new search.
2. **Flights**: Query strings can be very long (multi-city `slices` JSON, many `carrier_iata`).
3. **SEO**: `flights` and `hotels` listing pages are dynamic; metadata is route-based (`metadata.config`) — good for static segments; detail pages should use `generateMetadata` where missing (cars/blog already use `generateMetadata` in places).
4. **CarList** local state named `searchParams` — confusing for maintainers; rename to `carSearchFilters` or similar.
5. **Consistency**: Prefer either `/resource/search?...` with full query **or** document session + flag pattern for hotels.

**Suggested direction (conceptual):** `/flights?...` stays as canonical for flights; for hotels, consider `/hotels/search?check_in=...&...` (encoded) **or** short id referencing server-side stored search — optional migration.

---

## 13. Architecture summary (text diagram)

```
                    ┌─────────────────────────────────────────┐
                    │ URL (pathname + searchParams)            │
                    └───────────────────────┬─────────────────┘
                                            │
          ┌─────────────────────────────────┼──────────────────────────────┐
          ▼                                 ▼                              ▼
   app/.../page.tsx (RSC)           Client components (useSearchParams)   Route handlers /api
   await searchParams               FlightsTab, FlightList, etc.           req.nextUrl.searchParams
          │                                 │                              │
          ▼                                 ▼                              ▼
   recordToUrlSearchParams            Same keys as mapping                  Zod / controllers
   getFlightsPageLayout /             flightSearchBodyFromUrl
   getHotelsPageLayout
          │                                 │
          ▼                                 ▼
   Layout props (browse/results)      postFlightSearch / POST stays
          │                                 │
          ▼                                 ▼
   views/Flights.tsx, Hotels.tsx        UI lists, cards, filters
```

### Files that “control” each layer

| Concern | Primary files |
|---------|----------------|
| **Routing** | `app/**/page.tsx`, `app/**/layout.tsx`, dynamic `[id]`/`[slug]` |
| **Param parsing (server)** | `await searchParams` in pages; `recordToUrlSearchParams` in `src/lib/flights/flights-page-layout.ts`, `src/lib/hotels/hotels-page-layout.ts` |
| **Param parsing (client)** | `src/lib/flights/search-from-url.ts`, `hydrate-flights-form-from-url.ts`, `src/lib/hotels/stays-search-snapshot.ts` |
| **API mapping** | `src/lib/validations/*.schema.ts`, `src/lib/hotels/stays-search-snapshot.ts`, API route handlers under `app/api/` |
| **UI** | `src/views/`, `src/components/flights/`, `src/components/hotels/`, `src/components/shared/Breadcrumb.tsx` |

---

## 14. Appendix — `recordToUrlSearchParams`

```14:27:src/lib/flights/flights-page-layout.ts
export function recordToUrlSearchParams(
  sp: Record<string, string | string[] | undefined>,
): URLSearchParams {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) qs.append(key, v);
    } else {
      qs.set(key, value);
    }
  }
  return qs;
}
```

Re-exported from `src/lib/hotels/hotels-page-layout.ts` for hotel pages.

---

*Generated from repository audit. Re-run grep/glob after large refactors to keep this document accurate.*
