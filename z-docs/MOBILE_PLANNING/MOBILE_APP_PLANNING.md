# TravelTourUp — React Native Mobile App Planning Document

> **Customer-facing mobile application** reusing the existing Next.js backend, Supabase Auth, and `/api/v1/`* endpoints.
> Foundation-first approach: build a solid demo, then layer features incrementally.

---

## Table of Contents

1. [Stack Decision](#1-stack-decision) (includes TypeScript strict mode)
2. [Backend Readiness Audit](#2-backend-readiness-audit)
3. [Architecture Overview](#3-architecture-overview)
4. [Folder Structure](#4-folder-structure)
5. [Authentication Strategy](#5-authentication-strategy)
6. [API Service Layer](#6-api-service-layer)
7. [State Management](#7-state-management)
8. [Navigation Structure](#8-navigation-structure)
9. [Module Breakdown](#9-module-breakdown)
10. [UI/UX & Design System](#10-uiux--design-system) (includes Figma resources & app inspiration)
11. [Performance & Optimization](#11-performance--optimization)
12. [Security](#12-security)
13. [Error Handling Strategy](#13-error-handling-strategy)
14. [Logging & Monitoring](#14-logging--monitoring)
15. [Offline Handling](#15-offline-handling)
16. [Environment Setup & Prerequisites](#16-environment-setup--prerequisites)
17. [Running & Debugging — Professional Workflow](#17-running--debugging--professional-workflow)
18. [Implementation Roadmap](#18-implementation-roadmap) (6 phases: setup → auth → bookings → flights → hotels/cars → production)
  - [18.1 Template & Source Code References](#181-template--source-code-references)
19. [Versioning & OTA Updates](#19-versioning--ota-updates)
20. [Backend API Gaps — Required Before Mobile](#20-backend-api-gaps--required-before-mobile)

---

## 1. Stack Decision

### Verdict: **React Native + Expo (managed workflow)**


| Factor               | React Native + Expo                                     | Flutter             | Reasoning                                      |
| -------------------- | ------------------------------------------------------- | ------------------- | ---------------------------------------------- |
| Developer experience | MERN + RN expertise                                     | New language (Dart) | Leverages existing skills                      |
| Code sharing         | Share Zod schemas, DTO types, validation logic with web | None                | TypeScript across web + mobile                 |
| Ecosystem maturity   | Massive React ecosystem                                 | Growing             | More libraries, more community solutions       |
| Hot reload / DX      | Expo Go + EAS + fast refresh                            | Similar             | Expo has the best developer experience in 2026 |
| OTA updates          | `expo-updates` (built-in)                               | CodePush (limited)  | Critical for travel apps with frequent changes |
| Native modules       | Expo Modules API + prebuild                             | Built-in            | Expo covers 95%+ of native needs               |


### Why Expo (managed) over bare React Native CLI


| Concern        | Expo (managed)                                     | Bare RN CLI                    |
| -------------- | -------------------------------------------------- | ------------------------------ |
| Build pipeline | EAS Build (cloud) — no Xcode/Gradle locally for CI | Manual Xcode + Android Studio  |
| OTA updates    | `expo-updates` built-in                            | Manual CodePush setup          |
| Navigation     | File-based routing with `expo-router`              | Manual react-navigation wiring |
| Native modules | Expo Modules API + prebuild when needed            | Direct linking                 |
| Initial setup  | `npx create-expo-app` — instant                    | Complex toolchain              |


**Decision:** Expo SDK 53+ with `expo-router` v4 for file-based navigation. Eject to "prebuild" only if a native module demands it (unlikely for a travel booking app).

### Language: **TypeScript (strict mode)**

The entire mobile app is written in **TypeScript** — no plain JavaScript files. This matches the Next.js web backend (also 100% TypeScript) and enables direct type sharing.


| TypeScript Benefit         | How It Applies                                                                                                                                      |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Shared DTO types**       | Copy `BookingDto`, `UserProfileDto`, etc. from the web app's `src/lib/*/types.ts` into the mobile `src/types/` folder. Same interfaces, zero drift. |
| **Shared validation**      | Zod schemas (e.g., `loginSchema`, `signupSchema`) can be copied or published as a shared package. Client-side validation before API calls.          |
| **API response typing**    | `ApiSuccessResponse<T>`, `ApiPaginatedResponse<T>`, `ApiError` — typed end-to-end from backend to mobile screen.                                    |
| **Navigation type safety** | `expo-router` generates typed route params. No runtime "undefined" from mistyped route names.                                                       |
| **Refactoring confidence** | Rename a DTO field → TypeScript shows every file that needs updating.                                                                               |


`**tsconfig.json` configuration:**

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "forceConsistentCasingInFileNames": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

**Rules:**

- Every file ends with `.ts` or `.tsx` — zero `.js` files
- `strict: true` enforced — no `any` unless absolutely necessary (and documented why)
- All API responses are typed with generics: `apiGet<BookingDto>(...)`, not `apiGet(...)`
- All component props use `interface` or `type` — no inline `{ any }` props
- All hook return types are inferred from TanStack Query (automatic from `queryFn` return type)

---

## 2. Backend Readiness Audit

### Already implemented (mobile-ready)


| Feature             | Endpoint / File                                                                | Status                                                        |
| ------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| Bearer token auth   | `getServerAuthz()` in `session.ts`                                             | Ready — checks `Authorization: Bearer` first                  |
| CORS preflight      | `proxy.ts` + `next.config.ts`                                                  | Ready — `OPTIONS` → 204, CORS headers on all `/api/v1/`*      |
| Login               | `POST /api/v1/auth/login`                                                      | Ready — returns `access_token`, `refresh_token`, `expires_in` |
| Signup              | `POST /api/v1/auth/signup`                                                     | Ready — returns tokens or "check email"                       |
| Token refresh       | `POST /api/v1/auth/refresh`                                                    | Ready — accepts `refresh_token`, returns new pair             |
| Logout              | `POST /api/v1/auth/logout`                                                     | Ready — requires Bearer token                                 |
| Forgot password     | `POST /api/v1/auth/forgot-password`                                            | Ready — supports `redirect_to` for deep links                 |
| User profile (self) | `GET/PATCH /api/v1/users/me`                                                   | Ready                                                         |
| Avatar upload       | `POST /api/v1/users/me/avatar`                                                 | Ready                                                         |
| My bookings         | `GET /api/v1/bookings`                                                         | Ready — permission-based (own bookings for customer role)     |
| Booking detail      | `GET /api/v1/bookings/:id`                                                     | Ready — ownership check                                       |
| Create booking      | `POST /api/v1/bookings`                                                        | Ready — supports flight/hotel/car child payloads              |
| Cancel booking      | `PATCH /api/v1/bookings/:id`                                                   | Ready — `cancel_own` permission for customers                 |
| Health check        | `GET /api/v1/health`                                                           | Ready                                                         |
| Auth context        | `GET /api/v1/me/authz`                                                         | Ready — returns roles and permissions                         |
| Response envelope   | `{ success, data }` / `{ success, data, meta }`                                | Consistent across all endpoints                               |
| Error codes         | `VALIDATION_ERROR`, `NOT_FOUND`, `UNAUTHORIZED`, `FORBIDDEN`, `INTERNAL_ERROR` | Consistent                                                    |


### Missing — must be built on the backend first


| Feature                   | Current State                                                                       | Required For Mobile                                                      |
| ------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **Flight search API**     | `searchFlights()` helper exists in `src/lib/duffel/flights.ts` but **no API route** | `POST /api/v1/flights/search`                                            |
| **Flight offer detail**   | `duffelFlights.getOffer(id)` exists but **no API route**                            | `GET /api/v1/flights/offers/:id`                                         |
| **Hotel search API**      | `searchStays()` helper exists in `src/lib/duffel/stays.ts` but **no API route**     | `POST /api/v1/hotels/search`                                             |
| **Hotel rates/quotes**    | `duffelStays.fetchAllRates` + `createQuote` exist but **no API route**              | `GET /api/v1/hotels/rates/:searchResultId`, `POST /api/v1/hotels/quotes` |
| **Public hotel catalog**  | `AdminHotel` has admin-only CRUD at `/api/v1/admin/hotels`                          | `GET /api/v1/hotels` (public listing of published admin hotels)          |
| **Public car catalog**    | `AdminCar` has admin-only CRUD at `/api/v1/admin/cars`                              | `GET /api/v1/cars` (public listing of published admin cars)              |
| **Blog listing (public)** | Controller has permission-branched GET, but mobile needs unauthenticated access     | Verify unauthenticated access works (likely works already)               |


> **Important:** Section [20](#20-backend-api-gaps--required-before-mobile) details exactly what backend routes need to be created before the corresponding mobile module can be built. The implementation roadmap is ordered so Phase 1 (foundation + auth) needs zero backend changes.

---

## 3. Architecture Overview

### Layered architecture

```
┌─────────────────────────────────────────────┐
│                    Screens                  │ ← UI layer (Expo Router pages)
├─────────────────────────────────────────────┤
│               Components                   │ ← Reusable presentational components
├─────────────────────────────────────────────┤
│            Hooks (useBookings, etc.)        │ ← TanStack Query hooks + business logic
├─────────────────────────────────────────────┤
│           Services (api/*, auth/*)          │ ← HTTP layer, token management
├─────────────────────────────────────────────┤
│              Stores (Zustand)               │ ← Global UI state (search params, filters)
├─────────────────────────────────────────────┤
│          Secure Storage / Config            │ ← Token persistence, env config
└─────────────────────────────────────────────┘
```

### Key principles

1. **Screens are thin** — fetch data via hooks, render components, handle navigation
2. **Hooks own server state** — TanStack Query handles caching, refetching, optimistic updates
3. **Services are pure functions** — stateless HTTP calls, no React dependencies
4. **Stores hold UI state only** — search filters, selected dates, form drafts (not server data)
5. **Components are dumb** — receive props, emit callbacks, no direct API calls
6. **Platform-agnostic by default** — write generic code first; branch per-platform only when UX demands it

### Cross-platform strategy — maximizing shared code

> **Target: 95%+ shared code.** Every file is platform-generic (`.tsx`) unless a specific iOS or Android behavior cannot be expressed through props or runtime branching.

#### Code sharing breakdown

```
┌──────────────────────────────────────────────────────────────────┐
│                         100% SHARED                              │
│  services/  ·  hooks/  ·  stores/  ·  types/  ·  lib/           │
│  (HTTP, state, business logic — zero platform awareness)         │
├──────────────────────────────────────────────────────────────────┤
│                       98% SHARED                                 │
│  components/ui/  ·  components/booking/  ·  components/flight/   │
│  (shared JSX; minor Platform.select for shadows, haptics)        │
├──────────────────────────────────────────────────────────────────┤
│                       95% SHARED                                 │
│  app/ screens  ·  theme/                                         │
│  (shared screens; rare Platform.OS for keyboard, status bar)     │
├──────────────────────────────────────────────────────────────────┤
│                    PLATFORM-SPECIFIC (<5%)                        │
│  Platform utilities  ·  native module wrappers                   │
│  (keyboard behavior, haptic patterns, permission flows)          │
└──────────────────────────────────────────────────────────────────┘
```

#### Rule: when to branch per platform


| Situation                                            | Approach                                                                    | Example                                                        |
| ---------------------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Identical behavior on both platforms                 | **Single `.tsx` file** — no branching at all                                | `BookingCard.tsx`, `api-client.ts`, `useBookings.ts`           |
| Minor visual difference (shadow, elevation, padding) | `**Platform.select()` inline** — one file, two values                       | Shadow on iOS, elevation on Android (see below)                |
| Single line behavior difference                      | `**Platform.OS` conditional** — one file, one `if`                          | Status bar style, keyboard dismiss mode                        |
| Fundamentally different UX pattern                   | **Platform-suffixed files** — `Component.ios.tsx` / `Component.android.tsx` | Date picker (native pickers differ significantly), share sheet |
| Native module wrapper differences                    | **Abstraction in `src/lib/platform/`** — single API, two implementations    | Haptic feedback patterns, biometric prompt text                |


#### Pattern 1: `Platform.select()` — for visual differences (most common)

```typescript
import { Platform, StyleSheet } from "react-native";

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    // Shadow: iOS uses shadow* props, Android uses elevation
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
});
```

> **Best practice:** Extract platform shadows into a shared utility so every card doesn't repeat this:

```typescript
// src/lib/platform/shadows.ts
import { Platform } from "react-native";

export const shadows = {
  sm: Platform.select({
    ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
    android: { elevation: 2 },
  }),
  md: Platform.select({
    ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
    android: { elevation: 4 },
  }),
  lg: Platform.select({
    ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 16 },
    android: { elevation: 8 },
  }),
} as const;

// Usage: <View style={[styles.card, shadows.md]} />
```

#### Pattern 2: `Platform.OS` conditional — for behavior differences

```typescript
import { Platform, KeyboardAvoidingView } from "react-native";

// iOS needs "padding" behavior, Android needs "height" (or handled by android:windowSoftInputMode)
<KeyboardAvoidingView
  behavior={Platform.OS === "ios" ? "padding" : "height"}
  keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
>
  {children}
</KeyboardAvoidingView>
```

#### Pattern 3: Platform-suffixed files — for fundamentally different UX

React Native auto-resolves `DatePicker.ios.tsx` / `DatePicker.android.tsx` when you import `DatePicker`. Use this only when the two implementations share nothing:

```
src/components/ui/
  DatePicker.ios.tsx      ← uses @react-native-community/datetimepicker (native wheel)
  DatePicker.android.tsx  ← uses @react-native-community/datetimepicker (material dialog)
  DatePicker.types.ts     ← shared props interface (both files implement this)
```

```typescript
// src/components/ui/DatePicker.types.ts — shared contract
export interface DatePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  mode?: "date" | "time" | "datetime";
  label?: string;
}
```

> **Rule:** Even when using platform files, always share the props interface. This guarantees both implementations accept the same API and screens never need to know which platform they're running on.

#### Platform-specific UX differences to handle


| Concern                | iOS                                                                        | Android                                                               | Implementation                                                                 |
| ---------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **Back navigation**    | Swipe from left edge (built into `expo-router`)                            | Hardware/gesture back button                                          | `expo-router` handles both automatically — no custom code needed               |
| **Keyboard**           | Slides over content; need `KeyboardAvoidingView` with `behavior="padding"` | `android:windowSoftInputMode="adjustResize"` in `app.json` handles it | Platform-branched `behavior` prop (see Pattern 2 above)                        |
| **Status bar**         | Light/dark content style                                                   | Translucent status bar, icon color                                    | Use `expo-status-bar`: `<StatusBar style="auto" />` (adapts to both)           |
| **Safe areas**         | Notch, Dynamic Island, home indicator                                      | Navigation bar, camera cutout                                         | `react-native-safe-area-context` (already installed, handles both)             |
| **Haptic feedback**    | Full Taptic Engine support                                                 | Limited vibration patterns                                            | Use `expo-haptics` — gracefully degrades on Android                            |
| **Shadows**            | `shadow`* CSS-like properties                                              | `elevation` property                                                  | `Platform.select()` in shared shadow utility (see Pattern 1)                   |
| **Font rendering**     | SF Pro (system font, crisp)                                                | Roboto (system font)                                                  | Use system font (default) — never bundle custom fonts unless branding requires |
| **Alert/Action sheet** | Native `UIAlertController` / `UIActionSheet`                               | Material dialog                                                       | Use `Alert.alert()` (adapts natively) or `@gorhom/bottom-sheet` for custom     |
| **Pull to refresh**    | Rubber-band bounce effect                                                  | Material overscroll glow                                              | `RefreshControl` adapts automatically on both platforms                        |
| **Scroll behavior**    | Momentum-based, bounces at edges                                           | Stops at edges (no bounce)                                            | Default RN behavior — no code needed                                           |
| **Permissions**        | Permission dialogs with "Don't Allow" / "OK"                               | Runtime permission prompts                                            | `expo-image-picker`, `expo-camera`, etc. handle platform permission flows      |
| **Splash screen**      | Full-screen image                                                          | Full-screen image with adaptive icon support                          | `expo-splash-screen` config in `app.json` — separate assets per platform       |


#### `app.json` platform-specific configuration

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.traveltourup.mobile",
      "supportsTablet": true,
      "infoPlist": {
        "NSCameraUsageDescription": "Upload your profile photo",
        "NSPhotoLibraryUsageDescription": "Choose a profile photo from your library"
      }
    },
    "android": {
      "package": "com.traveltourup.mobile",
      "softwareKeyboardLayoutMode": "resize",
      "permissions": ["CAMERA", "READ_EXTERNAL_STORAGE"],
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#2563EB"
      }
    }
  }
}
```

#### Platform utility folder

Add to `src/lib/platform/` — thin wrappers that expose a single API for both platforms:

```
src/lib/platform/
  shadows.ts          # Platform.select shadow presets (sm, md, lg)
  haptics.ts          # Wrapper around expo-haptics (no-op on unsupported Android)
  keyboard.ts         # KeyboardAvoidingView config per platform
  statusBar.ts        # Status bar style helpers
  index.ts            # Barrel export
```

```typescript
// src/lib/platform/haptics.ts
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

export const haptics = {
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
  selection: () => Haptics.selectionAsync(),
};
```

```typescript
// src/lib/platform/keyboard.ts
import { Platform } from "react-native";

export const keyboardConfig = {
  behavior: Platform.OS === "ios" ? "padding" : "height",
  verticalOffset: Platform.OS === "ios" ? 88 : 0,
} as const;
```

#### Cross-platform testing rules


| Rule                                                                   | Why                                                                           |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **Every PR must be tested on both iOS Simulator AND Android Emulator** | Platform-specific rendering differences are only visible when you run on both |
| **Test on at least one real Android device**                           | Emulator performance is faster than real low-end Androids — catch jank early  |
| **Test keyboard interactions on both**                                 | Keyboard behavior is the #1 source of platform-specific bugs                  |
| **Test navigation gestures on both**                                   | iOS swipe-back and Android back button can trigger different lifecycle events |
| **Run `npx expo run:ios` AND `npx expo run:android` in CI**            | Catch native build failures per platform before merging                       |


#### Libraries chosen for cross-platform consistency

Every library in the stack was selected because it works identically on both platforms with zero platform-specific configuration:


| Library                   | iOS                          | Android                          | Platform branching needed?                         |
| ------------------------- | ---------------------------- | -------------------------------- | -------------------------------------------------- |
| `expo-router`             | Native navigation controller | Native fragment navigation       | None — file-based routing works identically        |
| `expo-secure-store`       | Keychain                     | EncryptedSharedPreferences       | None — same API                                    |
| `expo-image`              | Native image caching         | Glide-based caching              | None — same component                              |
| `@shopify/flash-list`     | Recycled `UICollectionView`  | Recycled `RecyclerView`          | None — same props                                  |
| `react-native-reanimated` | CoreAnimation on UI thread   | Android Animator on UI thread    | None — same worklet API                            |
| `@gorhom/bottom-sheet`    | Native gesture handling      | Native gesture handling          | None — same component                              |
| `nativewind`              | StyleSheet under the hood    | StyleSheet under the hood        | None — same class names                            |
| `lucide-react-native`     | SVG rendering                | SVG rendering                    | None — same components                             |
| `@sentry/react-native`    | iOS crash reporting          | Android crash reporting          | None — same `Sentry.init()`                        |
| `expo-haptics`            | Taptic Engine                | Vibration API (graceful degrade) | None — same API, Android simply has fewer patterns |


---

## 4. Folder Structure

```
traveltourup-mobile/
├── app/                          # Expo Router file-based routes
│   ├── _layout.tsx               # Root layout (providers, NO global auth gate — always shows tabs)
│   ├── auth/                     # Auth screens (for forgot-password & deep links)
│   │   ├── _layout.tsx
│   │   └── forgot-password.tsx   # Deep link from email
│   ├── (tabs)/                   # Main tab navigator (3 tabs, always visible)
│   │   ├── _layout.tsx           # Tab bar: Home, Explore, Profile
│   │   ├── index.tsx             # Home / search (public)
│   │   ├── explore/
│   │   │   ├── _layout.tsx
│   │   │   ├── index.tsx         # Explore hub (public)
│   │   │   ├── hotels/
│   │   │   │   ├── index.tsx     # Hotel listing (public)
│   │   │   │   └── [id].tsx      # Hotel detail (public, "Book" button uses auth guard)
│   │   │   └── cars/
│   │   │       ├── index.tsx     # Car listing (public)
│   │   │       └── [id].tsx      # Car detail (public, "Book" button uses auth guard)
│   │   └── profile/
│   │       ├── _layout.tsx
│   │       └── index.tsx         # Dual: login/signup form (guest) OR profile+bookings+reviews (auth)
│   ├── bookings/                 # Booking detail (pushed from Profile → My Bookings)
│   │   ├── _layout.tsx
│   │   └── [id].tsx              # 🔒 Auth required — booking detail + cancel action
│   ├── flights/                  # Flight search flow (public, stack navigator)
│   │   ├── _layout.tsx
│   │   ├── search.tsx            # Search form (public)
│   │   ├── results.tsx           # Flight results (public)
│   │   └── [offerId].tsx         # Offer detail (public, "Book" button uses auth guard)
│   └── checkout/                 # 🔒 Booking checkout (layout-level auth gate)
│       ├── _layout.tsx           # Redirects to login if not authenticated
│       ├── passenger-info.tsx
│       ├── payment.tsx
│       └── confirmation.tsx
│
├── src/
│   ├── components/               # Reusable UI components
│   │   ├── ui/                   # Design system primitives
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── BottomSheet.tsx
│   │   │   ├── Skeleton.tsx
│   │   │   └── index.ts
│   │   ├── booking/              # Booking-specific components
│   │   │   ├── BookingCard.tsx
│   │   │   ├── BookingStatusBadge.tsx
│   │   │   └── BookingTimeline.tsx
│   │   ├── flight/               # Flight-specific components
│   │   │   ├── FlightCard.tsx
│   │   │   ├── FlightSearchForm.tsx
│   │   │   └── FlightFilterSheet.tsx
│   │   ├── hotel/
│   │   │   ├── HotelCard.tsx
│   │   │   └── HotelFilterSheet.tsx
│   │   ├── car/
│   │   │   ├── CarCard.tsx
│   │   │   └── CarFilterSheet.tsx
│   │   ├── profile/              # Profile tab components
│   │   │   ├── AuthForm.tsx      # Login/signup form (shown when guest)
│   │   │   ├── AuthenticatedProfile.tsx  # Profile header + segmented tabs container
│   │   │   ├── ProfileHeader.tsx # Avatar + name + email header
│   │   │   ├── ProfileEditForm.tsx # Editable profile fields + save
│   │   │   ├── MyBookingsList.tsx # Booking list (inside profile tab)
│   │   │   ├── MyReviewsList.tsx  # Review list (inside profile tab)
│   │   │   └── SegmentedTabs.tsx  # Reusable My Profile / My Bookings / My Reviews tabs
│   │   └── common/               # Shared across modules
│   │       ├── ErrorBoundary.tsx
│   │       ├── EmptyState.tsx
│   │       ├── PullToRefresh.tsx
│   │       └── LoadingOverlay.tsx
│   │
│   ├── services/                 # HTTP layer (zero React dependencies)
│   │   ├── api-client.ts         # Generic fetch wrapper with Bearer token
│   │   ├── auth.service.ts       # Login, signup, refresh, logout
│   │   ├── booking.service.ts    # Booking CRUD
│   │   ├── flight.service.ts     # Flight search, offers
│   │   ├── hotel.service.ts      # Hotel search, catalog
│   │   ├── car.service.ts        # Car catalog
│   │   └── user.service.ts       # Profile read/update, avatar
│   │
│   ├── hooks/                    # TanStack Query hooks + auth guards
│   │   ├── useAuth.ts            # Auth state + mutations
│   │   ├── useRequireAuth.ts     # guardAction() — redirects to login with returnTo
│   │   ├── useBookings.ts        # Booking queries + mutations
│   │   ├── useFlights.ts         # Flight search queries
│   │   ├── useHotels.ts          # Hotel queries
│   │   ├── useCars.ts            # Car queries
│   │   └── useProfile.ts         # Profile query + mutations (enabled only when authenticated)
│   │
│   ├── stores/                   # Zustand stores (UI state only)
│   │   ├── auth.store.ts         # Auth tokens, user session
│   │   ├── search.store.ts       # Search params (origin, dest, dates, passengers)
│   │   └── checkout.store.ts     # Checkout flow state (selected offer, guest data)
│   │
│   ├── lib/                      # Utilities and config
│   │   ├── storage.ts            # expo-secure-store wrapper
│   │   ├── config.ts             # API_BASE_URL, environment detection
│   │   ├── constants.ts          # App constants
│   │   ├── format.ts             # Date, currency, duration formatters
│   │   ├── validation.ts         # Shared Zod schemas (can import from web)
│   │   └── platform/             # Cross-platform abstractions
│   │       ├── shadows.ts        # Platform.select shadow presets (sm, md, lg)
│   │       ├── haptics.ts        # expo-haptics wrapper (graceful degrade on Android)
│   │       ├── keyboard.ts       # KeyboardAvoidingView config per platform
│   │       └── index.ts          # Barrel export
│   │
│   ├── theme/                    # Design system
│   │   ├── colors.ts
│   │   ├── typography.ts
│   │   ├── spacing.ts
│   │   └── index.ts
│   │
│   └── types/                    # TypeScript types
│       ├── api.ts                # API response envelope types
│       ├── booking.ts            # Booking DTOs
│       ├── flight.ts             # Flight offer/order types
│       ├── hotel.ts              # Hotel DTOs
│       ├── car.ts                # Car DTOs
│       └── user.ts               # User profile DTOs
│
├── assets/                       # Static assets
│   ├── images/
│   ├── icons/
│   └── fonts/
│
├── app.json                      # Expo config
├── eas.json                      # EAS Build config
├── tsconfig.json
├── babel.config.js
├── .env.example
└── package.json
```

---

## 5. Authentication Strategy

### Flow: Bearer token with secure storage

```
┌───────────────────┐  POST /api/v1/auth/login   ┌──────────────────┐
│  Profile Tab      │ ───────────────────────────►│  Next.js Backend │
│  (AuthForm)       │ ◄──────────────────────────-│                  │
│                   │   { access_token,           │  getServerAuthz()│
│  Login / Signup   │     refresh_token,          │  checks Bearer   │
│  form embedded    │     expires_in }            │  header first    │
└──────┬────────────┘                             └──────────────────┘
       │
       ▼
┌──────────────────────┐
│  expo-secure-store   │  ← Encrypted keychain (iOS) / keystore (Android)
│  ┌─────────────────┐ │
│  │ access_token    │ │
│  │ refresh_token   │ │
│  │ expires_at      │ │ ← Computed from login: Date.now() + expires_in * 1000
│  └─────────────────┘ │
└──────────────────────┘
```

### Token lifecycle

```typescript
// src/stores/auth.store.ts — simplified concept
interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  user: { id: string; email: string } | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  pendingReturnTo: string | null;     // set by auth guards, consumed after login

  login: (email: string, password: string) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  restoreSession: () => Promise<void>;
  setPendingReturnTo: (path: string | null) => void;
}
```

### Token refresh strategy

1. **Proactive refresh:** Before every API call, check if `expiresAt - Date.now() < 60_000` (1 minute buffer). If true, refresh first.
2. **Reactive refresh:** If any API call returns `401`, attempt one refresh. If refresh fails, force logout.
3. **Background refresh:** No background timer needed — proactive check on each call is sufficient and avoids battery drain.

### Secure storage implementation

```typescript
// src/lib/storage.ts
import * as SecureStore from "expo-secure-store";

const KEYS = {
  ACCESS_TOKEN: "ttu_access_token",
  REFRESH_TOKEN: "ttu_refresh_token",
  EXPIRES_AT: "ttu_expires_at",
} as const;

export const tokenStorage = {
  async save(tokens: { access_token: string; refresh_token: string; expires_in: number }) {
    const expiresAt = String(Date.now() + tokens.expires_in * 1000);
    await Promise.all([
      SecureStore.setItemAsync(KEYS.ACCESS_TOKEN, tokens.access_token),
      SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, tokens.refresh_token),
      SecureStore.setItemAsync(KEYS.EXPIRES_AT, expiresAt),
    ]);
  },

  async getAccessToken(): Promise<string | null> {
    return SecureStore.getItemAsync(KEYS.ACCESS_TOKEN);
  },

  async getRefreshToken(): Promise<string | null> {
    return SecureStore.getItemAsync(KEYS.REFRESH_TOKEN);
  },

  async getExpiresAt(): Promise<number | null> {
    const val = await SecureStore.getItemAsync(KEYS.EXPIRES_AT);
    return val ? Number(val) : null;
  },

  async clear() {
    await Promise.all(Object.values(KEYS).map((k) => SecureStore.deleteItemAsync(k)));
  },
};
```

### App startup auth restoration

Since the app is **browse-first** (no global auth gate), startup always lands on the Home tab. Auth restoration runs silently in the background:

```
App launches → always show (tabs) with Home screen
  │
  └─ Background: read tokens from SecureStore
       → If no tokens → stay as guest (isAuthenticated = false)
       → If tokens exist:
         → Check expiry: expired? → attempt refresh silently
           → Refresh success → set isAuthenticated = true (Profile tab shows user info + My Bookings)
           → Refresh fail → clear tokens, stay as guest
         → Not expired → set isAuthenticated = true
```

The user never sees a loading spinner or auth gate on launch — the Home screen renders immediately.

---

## 6. API Service Layer

### Generic API client

The mobile API client mirrors the backend's response envelope and handles Bearer tokens automatically.

```typescript
// src/services/api-client.ts
import { tokenStorage } from "@/lib/storage";
import { useAuthStore } from "@/stores/auth.store";
import { API_BASE_URL } from "@/lib/config";

// Mirrors backend: { success: true, data: T }
type ApiSuccessResponse<T> = { success: true; data: T };
type ApiErrorResponse = { success: false; code: string; message: string; issues?: unknown[] };
type ApiPaginatedResponse<T> = {
  success: true;
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public issues?: unknown[],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await tokenStorage.getAccessToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

async function handleTokenRefreshIfNeeded(): Promise<void> {
  const expiresAt = await tokenStorage.getExpiresAt();
  if (expiresAt && expiresAt - Date.now() < 60_000) {
    await useAuthStore.getState().refreshSession();
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { skipAuth?: boolean; _retried?: boolean } = {},
): Promise<T> {
  if (!options.skipAuth) {
    await handleTokenRefreshIfNeeded();
  }

  const authHeaders = options.skipAuth ? {} : await getAuthHeaders();
  const url = `${API_BASE_URL}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...authHeaders,
      ...(options.headers as Record<string, string>),
    },
  });

  if (res.status === 401 && !options.skipAuth && !options._retried) {
    try {
      await useAuthStore.getState().refreshSession();
      // Retry with _retried flag — still includes fresh token, but won't loop on another 401
      return apiRequest<T>(path, { ...options, _retried: true });
    } catch {
      useAuthStore.getState().logout();
      throw new ApiError("UNAUTHORIZED", "Session expired", 401);
    }
  }

  const json = await res.json();

  if (!res.ok) {
    const err = json as ApiErrorResponse;
    throw new ApiError(
      err.code || "UNKNOWN",
      err.message || `Request failed: ${res.status}`,
      res.status,
      err.issues,
    );
  }

  return (json as ApiSuccessResponse<T>).data;
}

// Raw request returning the full envelope (for paginated responses)
async function apiRaw<R>(
  path: string,
  options: RequestInit & { skipAuth?: boolean; _retried?: boolean } = {},
): Promise<R> {
  if (!options.skipAuth) {
    await handleTokenRefreshIfNeeded();
  }

  const authHeaders = options.skipAuth ? {} : await getAuthHeaders();
  const url = `${API_BASE_URL}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: { Accept: "application/json", ...authHeaders },
  });

  if (res.status === 401 && !options.skipAuth && !options._retried) {
    try {
      await useAuthStore.getState().refreshSession();
      return apiRaw<R>(path, { ...options, _retried: true });
    } catch {
      useAuthStore.getState().logout();
      throw new ApiError("UNAUTHORIZED", "Session expired", 401);
    }
  }

  const json = await res.json();

  if (!res.ok) {
    const err = json as ApiErrorResponse;
    throw new ApiError(err.code || "UNKNOWN", err.message || "Request failed", res.status);
  }

  return json as R;
}

// Convenience wrappers
export function apiGet<T>(path: string, params?: Record<string, string>): Promise<T> {
  const query = params ? `?${new URLSearchParams(params)}` : "";
  return apiRequest<T>(`${path}${query}`);
}

export function apiPost<T>(path: string, body: unknown): Promise<T> {
  return apiRequest<T>(path, { method: "POST", body: JSON.stringify(body) });
}

export function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return apiRequest<T>(path, { method: "PATCH", body: JSON.stringify(body) });
}

export function apiDelete<T = void>(path: string): Promise<T> {
  return apiRequest<T>(path, { method: "DELETE" });
}

export function apiPaginated<T>(
  path: string,
  params?: Record<string, string>,
): Promise<ApiPaginatedResponse<T>> {
  const query = params ? `?${new URLSearchParams(params)}` : "";
  return apiRaw<ApiPaginatedResponse<T>>(`${path}${query}`);
}
```

### Module service example

```typescript
// src/services/booking.service.ts
import { apiGet, apiPost, apiPatch, apiPaginated } from "./api-client";
import type { Booking, BookingDetail } from "@/types/booking";

const BASE = "/api/v1/bookings";

export const bookingService = {
  list: (params?: { page?: string; limit?: string; status?: string; type?: string }) =>
    apiPaginated<Booking>(BASE, params),

  getById: (id: string) => apiGet<BookingDetail>(`${BASE}/${id}`),

  create: (body: CreateBookingPayload) => apiPost<BookingDetail>(BASE, body),

  cancel: (id: string) => apiPatch<BookingDetail>(`${BASE}/${id}`, { status: "cancelled" }),
};
```

---

## 7. State Management

### Strategy: TanStack Query + Zustand (complementary, not competing)


| Concern                                                     | Tool                  | Why                                                                                |
| ----------------------------------------------------------- | --------------------- | ---------------------------------------------------------------------------------- |
| **Server state** (API data)                                 | TanStack Query v5     | Automatic caching, background refetch, pagination, optimistic updates, retry logic |
| **Client/UI state** (search params, filters, checkout flow) | Zustand               | Lightweight, no boilerplate, works outside React tree                              |
| **Auth state** (tokens, session)                            | Zustand + SecureStore | Needs to be accessible from API client (outside React)                             |


### Why NOT Redux Toolkit


| Factor                | Redux Toolkit                  | TanStack Query + Zustand     |
| --------------------- | ------------------------------ | ---------------------------- |
| Boilerplate           | Slices, thunks, selectors      | Near zero                    |
| Cache invalidation    | Manual                         | Automatic (`queryKey` based) |
| Bundle size           | ~12KB                          | TQ ~11KB + Zustand ~1KB      |
| Server state handling | Awkward (RTK Query is verbose) | Built for it                 |
| Learning curve        | Higher                         | Lower (hooks-based)          |


### TanStack Query configuration

```typescript
// In root _layout.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,       // Data is fresh for 5 minutes
      gcTime: 30 * 60 * 1000,          // Garbage collect after 30 min
      retry: 2,                        // Retry failed requests twice
      refetchOnWindowFocus: false,     // Mobile doesn't have window focus
      refetchOnReconnect: true,        // Refetch when network is restored
    },
    mutations: {
      retry: 1,
    },
  },
});
```

### Hook example

```typescript
// src/hooks/useBookings.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { bookingService } from "@/services/booking.service";

export const bookingKeys = {
  all: ["bookings"] as const,
  list: (filters: Record<string, string>) => [...bookingKeys.all, "list", filters] as const,
  detail: (id: string) => [...bookingKeys.all, "detail", id] as const,
};

export function useBookings(filters: Record<string, string> = {}) {
  return useQuery({
    queryKey: bookingKeys.list(filters),
    queryFn: () => bookingService.list(filters),
  });
}

export function useBookingDetail(id: string) {
  return useQuery({
    queryKey: bookingKeys.detail(id),
    queryFn: () => bookingService.getById(id),
    enabled: !!id,
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => bookingService.cancel(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
      queryClient.invalidateQueries({ queryKey: bookingKeys.detail(id) });
    },
  });
}
```

---

## 8. Navigation Structure

### Design principle: Browse-first, auth-on-action

Most travel apps (Skyscanner, Booking.com, Hopper) let users **browse everything without signing in**. Authentication is only required when the user takes an action that needs identity — booking, viewing past bookings, managing profile.


| Screen                                               | Requires Auth? | Why                                                                   |
| ---------------------------------------------------- | -------------- | --------------------------------------------------------------------- |
| Home / Search                                        | No             | Core discovery — users must see value before signing up               |
| Flight search results                                | No             | Browsing search results should be frictionless                        |
| Flight offer detail                                  | No             | Let users see full pricing before asking them to sign in              |
| Hotel listing                                        | No             | Public catalog browsing                                               |
| Hotel detail                                         | No             | Users compare options before committing                               |
| Car listing                                          | No             | Same as hotels                                                        |
| Car detail                                           | No             | Same                                                                  |
| **Checkout (passenger info, payment, confirmation)** | **Yes**        | Booking requires a user account to track the order                    |
| **Profile tab (unauthenticated)**                    | No             | Shows login/signup form directly — no redirect, user stays on the tab |
| **Profile tab (authenticated) → My Profile**         | **Yes**        | Editable personal data                                                |
| **Profile tab (authenticated) → My Bookings**        | **Yes**        | Personal booking history                                              |
| **Profile tab (authenticated) → My Reviews**         | **Yes**        | Personal reviews                                                      |
| **Booking detail + cancellation**                    | **Yes**        | Ownership verification required                                       |


### Auth gating strategy

Instead of splitting navigation into "authenticated group" vs "unauthenticated group", the app uses a **single navigation tree** with **per-screen auth guards**:

```typescript
// src/hooks/useRequireAuth.ts
import { useRouter, usePathname } from "expo-router";
import { useAuthStore } from "@/stores/auth.store";

export function useRequireAuth() {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const guardAction = (action: () => void) => {
    if (!isAuthenticated) {
      // Store return path so AuthForm redirects back after login
      useAuthStore.getState().setPendingReturnTo(pathname);
      router.push("/(tabs)/profile");
      return;
    }
    action();
  };

  return { isAuthenticated, guardAction };
}
```

The auth store holds a `pendingReturnTo` path. After successful login, the `AuthForm` checks this value, navigates to it, then clears it:

```typescript
// Inside auth store actions
setPendingReturnTo: (path: string | null) => set({ pendingReturnTo: path }),

// After successful login
const returnTo = get().pendingReturnTo;
if (returnTo) {
  set({ pendingReturnTo: null });
  router.replace(returnTo);
}
```

Usage in a screen or component:

```typescript
// "Book Now" button on a flight detail screen (unauthenticated user can view, but booking requires auth)
const { guardAction } = useRequireAuth();

<Button onPress={() => guardAction(() => router.push("/checkout/passenger-info"))}>
  Book this flight
</Button>
```

After login in the Profile tab, the user is automatically redirected back to where they were via the `pendingReturnTo` store value.

### Navigator hierarchy

```
Root Layout (_layout.tsx)
│   Providers: QueryClient, Zustand, Sentry, ErrorBoundary
│   NO global auth gate — tabs are always visible
│
├── (tabs) — Bottom Tab Navigator (3 tabs, always visible)
│   │
│   ├── Home (index.tsx)              🏠  Search + quick actions
│   │                                     Public — no auth needed
│   │
│   ├── Explore (_layout.tsx)         🔍  Hotel/car catalog
│   │   ├── explore/index.tsx             Public — category cards
│   │   ├── explore/hotels/index.tsx      Public — hotel listing
│   │   ├── explore/hotels/[id].tsx       Public — hotel detail
│   │   ├── explore/cars/index.tsx        Public — car listing
│   │   └── explore/cars/[id].tsx         Public — car detail
│   │
│   └── Profile (_layout.tsx)         👤  Account / Auth
│       └── profile/index.tsx             Dual behavior:
│                                         • Not signed in → login/signup form
│                                         • Signed in → profile header + segmented tabs:
│                                             ├── My Profile (edit form)
│                                             ├── My Bookings (booking list, tap → booking detail)
│                                             └── My Reviews (review list, placeholder for now)
│
├── auth/ — Stack Navigator (accessible anytime, for forgot-password & deep links)
│   └── forgot-password.tsx               Deep link support for password reset
│
├── bookings/ — Stack Navigator (pushed from Profile → My Bookings)
│   └── [id].tsx                          🔒 Auth required — booking detail + cancel action
│
├── flights/ — Stack Navigator (pushed from Home search)
│   ├── search.tsx                        Public — flight search form
│   ├── results.tsx                       Public — search results list
│   └── [offerId].tsx                     Public — offer detail ("Book" button triggers auth guard)
│
└── checkout/ — Stack Navigator (modal presentation)
    ├── _layout.tsx                       🔒 Layout-level auth gate — entire checkout requires auth
    ├── passenger-info.tsx                🔒 Traveler details
    ├── payment.tsx                       🔒 Payment
    └── confirmation.tsx                  🔒 Booking confirmation
```

**Bottom tab bar: 3 tabs**


| Tab     | Icon       | Label   | Behavior                                                            |
| ------- | ---------- | ------- | ------------------------------------------------------------------- |
| Home    | 🏠 House   | Home    | Search forms, recent searches, popular destinations                 |
| Explore | 🔍 Compass | Explore | Hotel/car catalog, categories                                       |
| Profile | 👤 User    | Profile | Login form if guest, full profile + bookings + reviews if signed in |


### Auth gate implementation patterns

**Pattern 1: Layout-level gate** — for groups where every screen needs auth (checkout, bookings):

```typescript
// app/checkout/_layout.tsx
import { Redirect, Stack } from "expo-router";
import { useAuthStore } from "@/stores/auth.store";

export default function CheckoutLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated) {
    useAuthStore.getState().setPendingReturnTo("/checkout/passenger-info");
    return <Redirect href="/(tabs)/profile" />;
  }

  return <Stack screenOptions={{ headerShown: true, title: "Checkout" }} />;
}
```

**Pattern 2: Dual-mode screen** — for the Profile tab that shows login form or authenticated content (see full implementation in [Profile tab — dual behavior](#profile-tab--dual-behavior) below).

**Pattern 3: Action-level guard** — for public screens with auth-required actions:

```typescript
// On hotel detail screen — "Book" button triggers auth check
const { guardAction } = useRequireAuth();

<Button onPress={() => guardAction(() => {
  checkoutStore.setOffer("hotel", hotel, hotel.pricePerNight, hotel.currency);
  router.push("/checkout/passenger-info");
})}>
  Book this hotel
</Button>
```

### Profile tab — dual behavior

When **not authenticated**, the Profile tab shows the login/signup form directly (not a separate prompt or redirect). When **authenticated**, it shows the user's profile with editable fields and sub-navigation to My Bookings and My Reviews.

```typescript
// app/(tabs)/profile/index.tsx
export default function ProfileScreen() {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <AuthForm />;  // Login form with "Don't have an account? Sign Up" toggle
  }

  return <AuthenticatedProfile />;
}
```

**Unauthenticated state — inline auth form:**

```typescript
// src/components/profile/AuthForm.tsx
function AuthForm() {
  const [mode, setMode] = useState<"login" | "signup">("login");

  return (
    <ScrollView>
      <View style={styles.header}>
        <UserCircleIcon size={64} color={colors.neutral[300]} />
        <Text style={typography.heading2}>Welcome to TravelTourUp</Text>
        <Text style={typography.bodySmall}>Sign in to manage bookings, reviews, and more</Text>
      </View>

      {mode === "login" ? <LoginForm /> : <SignupForm />}

      <TouchableOpacity onPress={() => setMode(mode === "login" ? "signup" : "login")}>
        <Text>{mode === "login" ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}</Text>
      </TouchableOpacity>

      {mode === "login" && (
        <TouchableOpacity onPress={() => router.push("/auth/forgot-password")}>
          <Text>Forgot password?</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}
```

**Authenticated state — profile with sub-tabs:**

```typescript
// src/components/profile/AuthenticatedProfile.tsx
function AuthenticatedProfile() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"profile" | "bookings" | "reviews">("profile");

  return (
    <View style={{ flex: 1 }}>
      {/* User header — avatar, name, email */}
      <ProfileHeader user={user} />

      {/* Sub-navigation tabs */}
      <SegmentedTabs
        tabs={[
          { key: "profile", label: "My Profile" },
          { key: "bookings", label: "My Bookings" },
          { key: "reviews", label: "My Reviews" },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Tab content */}
      {activeTab === "profile" && <ProfileEditForm user={user} />}
      {activeTab === "bookings" && <MyBookingsList />}
      {activeTab === "reviews" && <MyReviewsList />}
    </View>
  );
}
```

**Profile sub-sections detail:**


| Sub-Tab         | Content                                                                                                                             | Data Source                      |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| **My Profile**  | Avatar (tap to change), first name, last name, email (read-only), phone, "Save" button, "Delete Account" at bottom, "Logout" button | `GET/PATCH /api/v1/users/me`     |
| **My Bookings** | FlashList of booking cards, filter chips (All/Flights/Hotels/Cars), pull-to-refresh, pagination, tap → booking detail screen        | `GET /api/v1/bookings`           |
| **My Reviews**  | List of reviews the user has written, rating stars, review text, associated hotel/car. Empty state if none.                         | Future API (placeholder for now) |


### Deep linking scheme

```
traveltourup://                          → Home (public)
traveltourup://explore/hotels            → Hotel listing (public)
traveltourup://explore/hotels/:id        → Hotel detail (public)
traveltourup://explore/cars              → Car listing (public)
traveltourup://explore/cars/:id          → Car detail (public)
traveltourup://flights/search            → Flight search (public)
traveltourup://flights/results           → Flight results (public)
traveltourup://flights/:offerId          → Flight offer detail (public)
traveltourup://profile                   → Profile tab (login form if guest, profile if signed in)
traveltourup://bookings/:id              → Booking detail (auth required)
traveltourup://reset-password            → Password reset (from email deep link)
traveltourup://checkout/passenger-info   → Checkout (auth required — redirects to profile login form)
```

Configuration in `app.json`:

```json
{
  "expo": {
    "scheme": "traveltourup",
    "plugins": [
      ["expo-router", { "root": "app" }]
    ]
  }
}
```

---

## 9. Module Breakdown

### 9.1 Home / Search (Phase 3 — Bookings, Checkout & Home)

**Screen:** Single unified search screen with tabs (Flights / Hotels / Cars).


| Feature            | Details                                                                         |
| ------------------ | ------------------------------------------------------------------------------- |
| Flight search form | Origin, destination (airport picker), dates (calendar), passengers, cabin class |
| Hotel search form  | Location (city/coords), check-in/out, guests, rooms                             |
| Car search form    | Pickup location, dates                                                          |
| Quick actions      | Recent searches, popular destinations                                           |
| API dependency     | None initially (form only, searches in later phases)                            |


### 9.2 Flights (Phase 4 — after backend APIs are built)


| Screen         | API Endpoint                     | Notes                                        |
| -------------- | -------------------------------- | -------------------------------------------- |
| Search results | `POST /api/v1/flights/search`    | Paginated Duffel offer results               |
| Offer detail   | `GET /api/v1/flights/offers/:id` | Full offer with slices, segments, pricing    |
| Filters        | Client-side filtering            | Price range, stops, airlines, departure time |


**Data flow:**

```
Search Form → POST /flights/search → Results (list of offers)
  → Tap offer → GET /flights/offers/:id → Offer Detail
    → "Book" → Checkout flow → POST /bookings (type: "flight", flight_booking.payload: offer data)
```

### 9.3 Hotels (Phase 5)


| Screen          | API Endpoint                 | Notes                                     |
| --------------- | ---------------------------- | ----------------------------------------- |
| Catalog listing | `GET /api/v1/hotels`         | Published admin hotels (internal catalog) |
| Duffel search   | `POST /api/v1/hotels/search` | Live Duffel stays search                  |
| Hotel detail    | `GET /api/v1/hotels/:id`     | Admin hotel detail                        |
| Rate quotes     | `POST /api/v1/hotels/quotes` | Duffel rate quoting                       |


### 9.4 Cars (Phase 5)


| Screen          | API Endpoint           | Notes                   |
| --------------- | ---------------------- | ----------------------- |
| Catalog listing | `GET /api/v1/cars`     | Published admin cars    |
| Car detail      | `GET /api/v1/cars/:id` | Car detail with pricing |


### 9.5 Booking Flow (Phase 3)

The booking flow is a multi-step wizard (stack navigator):

```
1. Select (flight/hotel/car offer selected)
   ↓
2. Passenger/Guest Info (traveler details form)
   ↓
3. Payment (payment method selection — initially mock/manual)
   ↓
4. Confirmation (POST /api/v1/bookings → show booking ref)
```

**Checkout store (Zustand):**

```typescript
interface CheckoutState {
  type: "flight" | "hotel" | "car";
  selectedOffer: unknown;       // Duffel offer or admin catalog item
  guestData: GuestData | null;
  totalAmount: number;
  currency: string;

  setOffer: (type: string, offer: unknown, amount: number, currency: string) => void;
  setGuestData: (data: GuestData) => void;
  reset: () => void;
}
```

### 9.6 Profile Tab — Unified Account Hub (Phase 2)

The Profile tab is the single entry point for all authenticated features. It has two states:

**Guest state (not signed in):**


| Component | Features                                                                                                                       |
| --------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Auth form | Login form (email + password) with toggle to signup form. "Forgot password?" link. Rendered directly in the tab — no redirect. |


**Authenticated state (signed in):**


| Sub-Tab         | API                                                                              | Features                                                                                                                                                                                  |
| --------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **My Profile**  | `GET/PATCH /api/v1/users/me`, `POST /api/v1/users/me/avatar`                     | Avatar (tap to change via image picker), first name, last name, email (read-only), phone, "Save Changes" button, "Logout" button, "Delete Account" danger action                          |
| **My Bookings** | `GET /api/v1/bookings`, `GET /api/v1/bookings/:id`, `PATCH /api/v1/bookings/:id` | FlashList of booking cards, filter chips (All/Flights/Hotels/Cars), pull-to-refresh, pagination. Tap card → pushes `bookings/[id]` detail screen. Cancel action with confirmation dialog. |
| **My Reviews**  | Future API (placeholder)                                                         | List of reviews written by the user. Empty state with "You haven't written any reviews yet" message. Rating stars, review text, associated hotel/car.                                     |


**User flow:**

```
Profile tab (guest)           Profile tab (signed in)
┌───────────────────┐         ┌────────────────────────────┐
│                   │  login  │ [Avatar] John Doe          │
│  Welcome to       │ ──────► │ john@example.com           │
│  TravelTourUp     │         ├────────────────────────────┤
│                   │         │ My Profile │ My Bookings │ My Reviews │
│  [Email       ]   │         ├────────────────────────────┤
│  [Password    ]   │         │                            │
│  [  Sign In   ]   │         │  (active tab content)      │
│                   │         │                            │
│  Don't have an    │         │  [Logout]                  │
│  account? Sign Up │         │                            │
└───────────────────┘         └────────────────────────────┘
```

---

## 10. UI/UX & Design System

### Toolkit decision


| Library                             | Purpose                | Why                                                                                                                                                                                                     |
| ----------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **lucide-react-native**             | Icons                  | Same icon set as the Next.js web app (`lucide-react`). Tree-shakeable SVGs, zero font bloat. 1500+ icons including travel-specific: `Plane`, `Hotel`, `Car`, `MapPin`, `Calendar`, `Ticket`, `Luggage`. |
| **React Native Reanimated**         | Animations             | Runs on UI thread, buttery smooth                                                                                                                                                                       |
| **React Native Gesture Handler**    | Touch interactions     | Native gesture system                                                                                                                                                                                   |
| **Nativewind v4** (Tailwind for RN) | Styling                | Same Tailwind mental model as the Next.js web app                                                                                                                                                       |
| **expo-image**                      | Image rendering        | Built-in caching, progressive loading, AVIF/WebP                                                                                                                                                        |
| **@gorhom/bottom-sheet**            | Bottom sheets          | Smooth, gesture-driven sheets for filters                                                                                                                                                               |
| **react-native-mmkv**               | Fast key-value storage | For non-sensitive cached data (not tokens)                                                                                                                                                              |
| **expo-haptics**                    | Haptic feedback        | Tactile response on booking actions                                                                                                                                                                     |


### Icons: `lucide-react-native`

**Why Lucide over alternatives:**


| Library                     | Tree-shakeable?      | Bundle impact          | Consistency with web app                               |
| --------------------------- | -------------------- | ---------------------- | ------------------------------------------------------ |
| `**lucide-react-native`**   | Yes (SVG per icon)   | ~0KB unused overhead   | Identical names — `<House />`, `<Plane />`, `<User />` |
| `@expo/vector-icons`        | No (full font files) | ~2MB shipped in bundle | Different icon names, mixed styles                     |
| `react-native-vector-icons` | No                   | ~2MB                   | Requires native linking, inconsistent styles           |


**Installation:**

```bash
npm install lucide-react-native react-native-svg
npx expo install react-native-svg   # Ensure Expo-compatible version
```

**Usage — identical API to web app:**

```typescript
import { Plane, Hotel, Car, MapPin, Calendar, User, Search, ChevronRight } from "lucide-react-native";

// Tab bar icons
<Plane size={24} color={color} strokeWidth={1.5} />
<Hotel size={24} color={color} strokeWidth={1.5} />

// In a flight card
<PlaneTakeoff size={16} color={colors.neutral[500]} />
<Text>LHR → JFK</Text>
<PlaneLanding size={16} color={colors.neutral[500]} />
```

**Key travel icons available in Lucide:**


| Category      | Icons                                                                                               |
| ------------- | --------------------------------------------------------------------------------------------------- |
| Transport     | `Plane`, `PlaneTakeoff`, `PlaneLanding`, `Car`, `CarFront`, `Bus`, `Train`                          |
| Accommodation | `Hotel`, `BedDouble`, `Building2`, `Home`                                                           |
| Navigation    | `MapPin`, `Map`, `Compass`, `Globe`, `Navigation`                                                   |
| Booking       | `Calendar`, `CalendarCheck`, `CalendarClock`, `Ticket`, `CreditCard`, `Receipt`                     |
| Travel        | `Luggage`, `Backpack`, `Briefcase`, `Palmtree`, `Mountain`, `Sunrise`                               |
| UI            | `Search`, `Filter`, `SlidersHorizontal`, `ChevronRight`, `ArrowLeft`, `X`, `Check`, `Star`, `Heart` |
| Profile       | `User`, `UserCircle`, `Settings`, `LogOut`, `Bell`, `Shield`                                        |


### Theme system

```typescript
// src/theme/colors.ts
export const colors = {
  primary: { 50: "#EFF6FF", 500: "#3B82F6", 600: "#2563EB", 700: "#1D4ED8" },
  neutral: { 50: "#F9FAFB", 100: "#F3F4F6", 500: "#6B7280", 900: "#111827" },
  success: { 500: "#22C55E" },
  warning: { 500: "#F59E0B" },
  error: { 500: "#EF4444" },
  background: "#FFFFFF",
  surface: "#F9FAFB",
  text: { primary: "#111827", secondary: "#6B7280", inverse: "#FFFFFF" },
} as const;

// src/theme/typography.ts
export const typography = {
  heading1: { fontSize: 28, fontWeight: "700" as const, lineHeight: 34 },
  heading2: { fontSize: 22, fontWeight: "600" as const, lineHeight: 28 },
  heading3: { fontSize: 18, fontWeight: "600" as const, lineHeight: 24 },
  body: { fontSize: 16, fontWeight: "400" as const, lineHeight: 24 },
  bodySmall: { fontSize: 14, fontWeight: "400" as const, lineHeight: 20 },
  caption: { fontSize: 12, fontWeight: "400" as const, lineHeight: 16 },
} as const;

// src/theme/spacing.ts
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;
```

### Design patterns

1. **Card-based layouts** for listings (flights, hotels, cars, bookings)
2. **Bottom sheets** for filters and quick actions (not full-screen modals)
3. **Skeleton loaders** during data fetching (not spinners)
4. **Pull-to-refresh** on all list screens
5. **Infinite scroll** with `onEndReached` for paginated lists
6. **Haptic feedback** on booking confirmations and destructive actions

### Design inspiration — Free Figma resources & reference apps

Use these as visual references when building screens. Do NOT copy directly — extract the layout patterns, spacing, and interaction ideas.

#### Free Figma UI Kits (travel / booking specific)


| Resource                          | What It Contains                                                                                                            | Figma Link                                                                                     |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **Flavor Travel App UI Kit**      | 45+ screens: flight search, hotel booking, car rental, trip planner, boarding pass, reviews. Clean modern style.            | [Figma Community — Flavor Travel](https://www.figma.com/community/file/1120753498498595498)    |
| **Jetveo — Flight Booking App**   | Complete flight booking flow: search, results with filters, seat selection, checkout, boarding pass. Minimal design.        | [Figma Community — Jetveo](https://www.figma.com/community/file/1145709821498506960)           |
| **TravelGo — Travel App UI Kit**  | 30+ screens: home dashboard, destination explore, hotel detail, booking summary, profile. Gradient-heavy modern look.       | [Figma Community — TravelGo](https://www.figma.com/community/file/1115628498389211297)         |
| **Tripper — Travel Mobile App**   | Full travel app: explore, map view, hotel details with gallery, payment flow, trip itinerary.                               | [Figma Community — Tripper](https://www.figma.com/community/file/1102248564245498612)          |
| **Hotel Booking App Free UI Kit** | Hotel-focused: search with map, room selection, amenity cards, review cards, booking confirmation.                          | [Figma Community — Hotel Booking](https://www.figma.com/community/file/1075457810950587245)    |
| **Booking.com Redesign Concept**  | Unofficial redesign with improved UX: search flow, property detail, bottom sheet filters. Good reference for production UX. | [Figma Community — Booking Redesign](https://www.figma.com/community/file/1166040971045498167) |


#### Free Figma General Mobile UI Kits (for design system components)


| Resource                             | What It Contains                                                                                          | Why Use It                                            |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| **Untitled UI — Mobile Kit**         | 1000+ components: buttons, inputs, modals, tabs, cards, navigation bars, form controls. Production-grade. | Best free design system. Use for all base components. |
| **Ant Design Mobile**                | Full component library following Ant Design patterns. Buttons, lists, badges, toasts, action sheets.      | Enterprise-grade components reference.                |
| **Material Design 3 Kit**            | Google's official M3 components for Figma. Bottom sheets, FABs, navigation bars, chips, search bars.      | Standard for Android feel. Adapt selectively.         |
| **iOS 17 & 18 UI Kit by Joey Banks** | Complete iOS native components. Tab bars, navigation bars, action sheets, settings screens.               | Standard for iOS feel. Adapt selectively.             |


#### Production Travel Apps to Study (install and use them)


| App                     | Platform         | What to Study                                                                             |
| ----------------------- | ---------------- | ----------------------------------------------------------------------------------------- |
| **Hopper**              | iOS / Android    | Flight price prediction UI, calendar date picker UX, booking flow simplicity              |
| **Skyscanner**          | iOS / Android    | Flight search results layout, filter bottom sheet, price chart, multi-city flow           |
| **Booking.com**         | iOS / Android    | Hotel listing card design, map integration, review display, property gallery              |
| **Airbnb**              | iOS / Android    | Search UX, image carousels, bottom sheet filters, smooth animations |
| **Google Flights**      | Web (responsive) | Clean search form, timeline view for flights, price graph, "track prices" UX              |
| **Kayak**               | iOS / Android    | Price comparison layout, car rental flow, combined flight+hotel search                    |
| **Wise (TransferWise)** | iOS / Android    | Auth flow UX (biometrics, PIN), clean form design, success states                         |
| **Revolut**             | iOS / Android    | Skeleton loaders, pull-to-refresh, haptic feedback, bottom navigation                     |


#### Design Pattern Recommendations by Screen


| Screen               | Inspiration Source          | Key Pattern                                                                                                  |
| -------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Home / Search**    | Skyscanner + Hopper         | Segmented tabs (Flights / Hotels / Cars), collapsible search form, recent searches below                     |
| **Flight Results**   | Skyscanner + Google Flights | Card per offer: airline logo, times, duration, stops, price. Sticky filter bar. Sort bottom sheet.           |
| **Hotel Listing**    | Booking.com + Airbnb        | Image carousel in card, star rating + review count, price per night, "heart" save action                     |
| **Hotel Detail**     | Airbnb                      | Full-width image gallery (swipeable), sticky booking bar at bottom, expandable sections for amenities/policy |
| **Car Listing**      | Kayak                       | Car image + specs (passengers, transmission, luggage), price per day, pickup location                        |
| **Booking Checkout** | Hopper + Wise               | Multi-step wizard with progress indicator, clean form with inline validation, clear price summary            |
| **My Bookings**      | Hopper                      | Vertical timeline with status badges, expandable booking cards, boarding pass style for flights              |
| **Profile**          | Revolut + Airbnb            | Avatar + name header, settings list with icons, clean logout at bottom                                       |
| **Login / Signup**   | Wise + Revolut              | Single-field-at-a-time (optional), social login buttons at top, minimal form with clear CTAs                 |
| **Empty States**     | Airbnb                      | Illustration + short copy + single CTA button ("Search for flights")                                         |
| **Error States**     | Any well-built app          | Icon + title + description + retry button. Never a blank screen.                                             |


#### Where to Find More Free Figma Resources


| Platform              | URL                                                    | What to Search                                                                                       |
| --------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| **Figma Community**   | [figma.com/community](https://www.figma.com/community) | "travel app", "flight booking", "hotel app", "mobile UI kit"                                         |
| **Dribbble**          | [dribbble.com](https://dribbble.com)                   | "travel app UI", "flight booking mobile" — visual inspiration (not Figma files)                      |
| **Mobbin**            | [mobbin.com](https://mobbin.com)                       | Real-world app screenshots organized by pattern (search, onboarding, checkout). Free tier available. |
| **Screenlane**        | [screenlane.com](https://screenlane.com)               | Curated mobile UI inspiration by screen type. Filter by "Travel" category.                           |
| **UI8**               | [ui8.net](https://ui8.net)                             | Premium kits with occasional freebies. Search "travel" for high-quality references.                  |
| **Freebies.ByPeople** | [freebies.bypeople.com](https://freebies.bypeople.com) | Free design resources, filter by "mobile app"                                                        |


---

## 11. Performance & Optimization

### Image handling

```typescript
// Use expo-image with caching
import { Image } from "expo-image";

<Image
  source={{ uri: hotel.imageUrl }}
  placeholder={{ blurhash: hotel.blurhash }}  // Blur hash for instant preview
  contentFit="cover"
  transition={200}
  cachePolicy="memory-disk"
/>
```

### List performance


| Technique                   | Implementation                                         |
| --------------------------- | ------------------------------------------------------ |
| `FlashList` over `FlatList` | `@shopify/flash-list` — recycled cells, faster renders |
| Estimated item sizes        | Pre-compute based on card type                         |
| Key extractor               | Use stable `id` from API response                      |
| Memoization                 | `React.memo` on list item components                   |


### API optimization


| Technique            | How                                                    |
| -------------------- | ------------------------------------------------------ |
| TanStack Query cache | `staleTime: 5 min` — avoid redundant fetches           |
| Prefetching          | `queryClient.prefetchQuery` on search submit           |
| Pagination           | Server-side via `page` + `limit` params                |
| Debounced search     | 300ms debounce on text inputs before API call          |
| Cancel on unmount    | TanStack Query handles `AbortController` automatically |


### Bundle optimization


| Technique          | Implementation                                                      |
| ------------------ | ------------------------------------------------------------------- |
| Tree shaking       | Import only what's used: `import { format } from "date-fns/format"` |
| Lazy screens       | Expo Router handles lazy loading by default                         |
| Asset optimization | Use `expo-image` over `Image` from React Native                     |
| Hermes engine      | Enabled by default in Expo SDK 53 — faster JS execution             |


---

## 12. Security

### Token storage


| Data                   | Storage             | Why                                           |
| ---------------------- | ------------------- | --------------------------------------------- |
| `access_token`         | `expo-secure-store` | Encrypted keychain (iOS) / keystore (Android) |
| `refresh_token`        | `expo-secure-store` | Same — never in AsyncStorage                  |
| `expires_at`           | `expo-secure-store` | Derived value, still sensitive                |
| Search cache, UI state | `react-native-mmkv` | Non-sensitive, fast                           |
| User preferences       | `react-native-mmkv` | Non-sensitive                                 |


### API security


| Concern                | Implementation                                                  |
| ---------------------- | --------------------------------------------------------------- |
| Token transmission     | Always via `Authorization: Bearer <token>` header, never in URL |
| Certificate pinning    | Consider for production via `expo-certificate-transparency`     |
| Request validation     | Validate inputs client-side with Zod before sending             |
| No secrets in bundle   | API keys live on the server (Duffel key is server-side only)    |
| Sensitive data masking | Never log tokens or PII to console in production                |


### Additional hardening

- Enable **App Transport Security** (iOS) — HTTPS only (default in Expo)
- Set `android:usesCleartextTraffic="false"` in production builds
- Implement **biometric auth** (expo-local-authentication) for returning users (optional, Phase 6)
- Jailbreak/root detection (optional, Phase 6) via community libraries

---

## 13. Error Handling Strategy

### Layered error handling

```
Layer 1: API Client (api-client.ts)
  → Catches HTTP errors, throws typed ApiError with { code, message, status }
  → Handles 401 with automatic token refresh + retry

Layer 2: TanStack Query
  → Retries failed queries (configurable per query)
  → Exposes error state to components via { error, isError }

Layer 3: Component/Screen
  → Renders error UI based on error type
  → Provides retry action via queryClient.refetchQueries

Layer 4: Global Error Boundary
  → Catches unhandled errors in React tree
  → Shows fallback "Something went wrong" screen with restart
```

### Error code mapping

```typescript
// src/lib/error-messages.ts
const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: "Your session has expired. Please log in again.",
  FORBIDDEN: "You don't have permission to do this.",
  NOT_FOUND: "The requested resource was not found.",
  VALIDATION_ERROR: "Please check your input and try again.",
  INTERNAL_ERROR: "Something went wrong. Please try again later.",
  NETWORK_ERROR: "Unable to connect. Check your internet connection.",
};

export function getErrorMessage(code: string, fallback?: string): string {
  return ERROR_MESSAGES[code] ?? fallback ?? "An unexpected error occurred.";
}
```

### User-facing error patterns


| Error Type               | UX                                                      |
| ------------------------ | ------------------------------------------------------- |
| Network error            | Banner at top: "No internet connection" with retry      |
| 401 (after refresh fail) | Redirect to Profile tab (shows login form) with message |
| 404                      | Empty state: "Not found" with back navigation           |
| 422 (validation)         | Inline field errors on forms                            |
| 500                      | Full-screen error with retry button                     |
| Rate limit               | Toast: "Too many requests, please wait"                 |


---

## 14. Logging & Monitoring

### Development

> For full setup instructions, tool configuration, and debugging workflows, see [Section 17 — Running & Debugging](#17-running--debugging--professional-workflow).


| Tool                     | Purpose                                                             |
| ------------------------ | ------------------------------------------------------------------- |
| `expo-dev-client`        | Custom dev builds with native debugging                             |
| React DevTools           | Component tree inspection, props/state viewer, profiler             |
| Hermes Debugger (Chrome) | JS console, breakpoints, source maps, performance flamechart        |
| Reactotron               | API request logging, state inspection, TanStack Query cache viewer  |
| Charles Proxy / Proxyman | Full HTTPS traffic inspection, network throttling, response mocking |
| `console.warn` guards    | Strip `console.*` in production via Babel plugin                    |


### Production


| Tool                                 | Purpose                                                  |
| ------------------------------------ | -------------------------------------------------------- |
| **Sentry** (`@sentry/react-native`)  | Crash reporting, performance monitoring, breadcrumbs     |
| **EAS Insights**                     | Build-level analytics (free with Expo)                   |
| **Analytics** (PostHog or Amplitude) | User behavior tracking (search patterns, booking funnel) |


### Sentry configuration

```typescript
import * as Sentry from "@sentry/react-native";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  tracesSampleRate: 0.2,
  environment: __DEV__ ? "development" : "production",
  enableAutoSessionTracking: true,
  beforeSend(event) {
    // Strip PII from events
    if (event.request?.headers) {
      delete event.request.headers.Authorization;
    }
    return event;
  },
});
```

---

## 15. Offline Handling

### Strategy: Graceful degradation (not offline-first)

A travel booking app requires real-time data (flight availability, pricing). Full offline mode is not practical. Instead, implement graceful degradation:


| Scenario                    | Behavior                                                                                                          |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **No internet on launch**   | Show cached data from last session (TanStack Query persister). Display banner: "Offline — showing cached results" |
| **Connection lost mid-use** | Show banner, disable mutation buttons (book, cancel). Read-only cached data still visible                         |
| **Connection restored**     | Auto-refetch stale queries (`refetchOnReconnect: true`). Remove banner                                            |
| **Booking history**         | Cache locally with TanStack Query persistence — viewable offline                                                  |
| **Search results**          | Not cached offline — require live connection                                                                      |


### Implementation

```typescript
// TanStack Query persister for offline cache
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";

const asyncPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "REACT_QUERY_CACHE",
});

// In root layout
<PersistQueryClientProvider client={queryClient} persistOptions={{ persister: asyncPersister }}>
  {children}
</PersistQueryClientProvider>
```

### Network status monitoring

```typescript
// src/hooks/useNetworkStatus.ts
import NetInfo from "@react-native-community/netinfo";
import { onlineManager } from "@tanstack/react-query";

// Sync TanStack Query with network state
onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    setOnline(!!state.isConnected);
  });
});
```

---

## 16. Environment Setup & Prerequisites

### System requirements


| Tool              | Version                               | Purpose                              |
| ----------------- | ------------------------------------- | ------------------------------------ |
| Node.js           | 20 LTS+                               | Runtime                              |
| npm / yarn / pnpm | Latest                                | Package manager                      |
| Expo CLI          | `npx expo` (no global install needed) | Development toolkit                  |
| Expo Go app       | Latest (iOS App Store / Google Play)  | Quick testing on device              |
| EAS CLI           | `npm install -g eas-cli`              | Cloud builds + OTA updates           |
| Watchman          | Latest (macOS only)                   | File watching                        |
| Xcode             | 15+ (macOS only)                      | iOS simulator + production builds    |
| Android Studio    | Latest                                | Android emulator + production builds |


### Project initialization

```bash
# Create Expo project with latest SDK
npx create-expo-app traveltourup-mobile --template tabs

# Install core dependencies
npx expo install expo-router expo-secure-store expo-image expo-haptics
npx expo install react-native-reanimated react-native-gesture-handler
npx expo install react-native-safe-area-context react-native-screens
npx expo install @react-native-community/netinfo

# Icons (same icon set as the Next.js web app)
npm install lucide-react-native
npx expo install react-native-svg

# State & data fetching
npm install @tanstack/react-query zustand
npm install @tanstack/react-query-persist-client @react-native-async-storage/async-storage

# UI
npm install nativewind tailwindcss
npm install @gorhom/bottom-sheet
npm install @shopify/flash-list

# Validation (share schemas with web)
npm install zod

# Monitoring
npm install @sentry/react-native

# Dev tools (see Section 17 for full setup guide)
npm install -D reactotron-react-native reactotron-tanstack-react-query
npm install -D @tanstack/react-query-devtools
npm install -D @types/react @types/react-native typescript
```

### Environment variables

```bash
# .env.example
API_BASE_URL=https://your-domain.com/api/v1
SENTRY_DSN=your-sentry-dsn
```

Access via `expo-constants`:

```typescript
// src/lib/config.ts
import Constants from "expo-constants";

export const API_BASE_URL = Constants.expoConfig?.extra?.apiBaseUrl
  ?? (process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000/api/v1");
```

### `app.json` essentials

```json
{
  "expo": {
    "name": "TravelTourUp",
    "slug": "traveltourup",
    "version": "1.0.0",
    "scheme": "traveltourup",
    "platforms": ["ios", "android"],
    "plugins": [
      "expo-router",
      "expo-secure-store",
      [
        "expo-image",
        { "allowBackgroundRemoval": false }
      ],
      "@sentry/react-native/expo"
    ],
    "extra": {
      "apiBaseUrl": "${EXPO_PUBLIC_API_BASE_URL}",
      "eas": { "projectId": "your-project-id" }
    },
    "ios": {
      "bundleIdentifier": "com.traveltourup.mobile",
      "supportsTablet": true
    },
    "android": {
      "package": "com.traveltourup.mobile",
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#2563EB"
      }
    }
  }
}
```

---

## 17. Running & Debugging — Professional Workflow

> **Principle:** Never debug by staring at `console.log`. Use purpose-built tools for each concern — rendering, network, state, performance.

---

### 17.1 Running the App

#### Development modes


| Mode                                | Command                       | When to Use                                                                                                         |
| ----------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Expo Go** (fastest start)         | `npx expo start` → scan QR    | Quick iteration on JS-only code. No custom native modules.                                                          |
| **Development build** (recommended) | `npx expo start --dev-client` | When using native libs (`expo-secure-store`, `react-native-reanimated`). Closest to production.                     |
| **iOS Simulator**                   | `npx expo run:ios`            | Full native build on macOS. Required for iOS-specific testing.                                                      |
| **Android Emulator**                | `npx expo run:android`        | Full native build. Requires Android Studio + emulator running.                                                      |
| **Tunnel** (remote device)          | `npx expo start --tunnel`     | Testing on a physical device that's not on the same Wi-Fi network (e.g. real device at home, dev server at office). |


#### First-time setup for development builds

```bash
# 1. Install dev client (once)
npx expo install expo-dev-client

# 2. Create a development build via EAS (cloud — no Xcode/Android Studio locally)
eas build --profile development --platform ios
eas build --profile development --platform android

# 3. Install the build on your device/simulator
#    iOS: drag .app into Simulator, or scan QR from EAS dashboard
#    Android: adb install <path-to-apk>

# 4. Start the dev server pointing at the dev client
npx expo start --dev-client
```

#### Running on physical devices


| Platform                   | Method               | Steps                                                                               |
| -------------------------- | -------------------- | ----------------------------------------------------------------------------------- |
| **iOS (same Wi-Fi)**       | Expo Go or dev build | Scan QR code from terminal with Camera app                                          |
| **iOS (USB)**              | Dev build            | Connect via Lightning/USB-C, trust the device, `npx expo run:ios --device`          |
| **Android (same Wi-Fi)**   | Expo Go or dev build | Scan QR code from terminal with Expo Go app                                         |
| **Android (USB)**          | Dev build            | Enable USB debugging in Developer Options, connect, `npx expo run:android --device` |
| **Android (wireless ADB)** | Dev build            | `adb tcpip 5555` → `adb connect <device-ip>:5555` → `npx expo run:android --device` |


#### `package.json` scripts

```json
{
  "scripts": {
    "start": "expo start",
    "dev": "expo start --dev-client",
    "ios": "expo run:ios",
    "android": "expo run:android",
    "tunnel": "expo start --tunnel",
    "build:dev:ios": "eas build --profile development --platform ios",
    "build:dev:android": "eas build --profile development --platform android",
    "build:preview": "eas build --profile preview --platform all",
    "build:prod": "eas build --profile production --platform all",
    "update:prod": "eas update --channel production",
    "lint": "eslint . --ext .ts,.tsx",
    "typecheck": "tsc --noEmit",
    "test": "jest",
    "prebuild": "expo prebuild",
    "clean": "expo prebuild --clean"
  }
}
```

#### `eas.json` build profiles

```json
{
  "cli": { "version": ">= 12.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "channel": "development",
      "ios": { "simulator": true },
      "env": { "EXPO_PUBLIC_API_BASE_URL": "http://localhost:3000/api/v1" }
    },
    "preview": {
      "distribution": "internal",
      "channel": "preview",
      "env": { "EXPO_PUBLIC_API_BASE_URL": "https://staging.traveltourup.com/api/v1" }
    },
    "production": {
      "channel": "production",
      "distribution": "store",
      "autoIncrement": true,
      "env": { "EXPO_PUBLIC_API_BASE_URL": "https://traveltourup.com/api/v1" }
    }
  },
  "submit": {
    "production": {}
  }
}
```

---

### 17.2 Debugging & Inspection Tools

#### Tool matrix — use the right tool for each concern


| Concern                      | Tool                          | How to Access                                                                        |
| ---------------------------- | ----------------------------- | ------------------------------------------------------------------------------------ |
| **React component tree**     | React DevTools (standalone)   | `npx react-devtools` in separate terminal → auto-connects to running app             |
| **JS console / breakpoints** | Hermes Debugger (Chrome)      | Press `j` in Expo CLI terminal → opens Chrome DevTools with source maps              |
| **Network requests**         | Reactotron                    | Configure once → see every API call, headers, payloads, timing                       |
| **TanStack Query cache**     | TanStack Query DevTools       | On-device overlay showing all queries, their states, and cache data                  |
| **Zustand state**            | Reactotron + Zustand plugin   | Live state tree viewer with time-travel                                              |
| **Redux / state diffs**      | Flipper (if needed)           | Desktop app with React Native plugin                                                 |
| **Layout / styling**         | React DevTools (Elements tab) | Inspect component props, styles, dimensions in real-time                             |
| **Native logs**              | Platform tools                | iOS: `Console.app` or `xcrun simctl spawn booted log stream` / Android: `adb logcat` |
| **Crash stack traces**       | Sentry                        | Symbolicated stack traces in Sentry dashboard (production)                           |


#### Hermes Debugger (built-in, zero setup)

The recommended JS debugger for Expo SDK 53+. Replaces the old Chrome Remote Debugger.

```
1. Start the dev server: npx expo start --dev-client
2. Press 'j' in the terminal → Chrome opens with DevTools
3. Use:
   - Console tab → JS logs, errors, warnings
   - Sources tab → set breakpoints in your .ts/.tsx files (source maps included)
   - Network tab → basic request monitoring (for detailed inspection, use Reactotron)
   - Performance tab → JS thread flame charts
```

> **Important:** Do NOT use the old "Debug Remote JS" option. It runs JS in Chrome's V8 instead of Hermes, causing behavior differences and slower performance.

#### Reactotron — API + State inspector

The single best tool for inspecting network requests and state changes during development.

```bash
# Install
npm install -D reactotron-react-native reactotron-tanstack-react-query

# macOS app: brew install --cask reactotron
# Windows/Linux: download from https://github.com/infinitered/reactotron/releases
```

```typescript
// src/lib/reactotron.ts — only loaded in __DEV__
import Reactotron from "reactotron-react-native";
import { QueryClientManager, reactotronReactQuery } from "reactotron-tanstack-react-query";

const queryClientManager = new QueryClientManager({});

if (__DEV__) {
  Reactotron.configure({ name: "TravelTourUp" })
    .useReactNative({
      networking: { ignoreUrls: /symbolicate|logs/ },
      errors: { veto: () => false },
      editor: false,
    })
    .use(reactotronReactQuery(queryClientManager))
    .connect();

  // Patch console.tron for quick logging
  console.tron = Reactotron;
}

export { Reactotron, queryClientManager };
```

```typescript
// In root _layout.tsx — import early so Reactotron connects before any API calls
if (__DEV__) {
  require("@/lib/reactotron");
}
```

**What Reactotron shows:**


| Panel               | What You See                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------- |
| **Timeline**        | Every API request/response with method, URL, status, duration, headers, body                |
| **State**           | Zustand store snapshots — subscribe to specific slices                                      |
| **React Query**     | All queries + mutations, their status (loading/success/error), cache data, refetch triggers |
| **Async Storage**   | Browse all key-value pairs in AsyncStorage                                                  |
| **Benchmarks**      | Custom timing markers (`Reactotron.benchmark(...)`)                                         |
| **Custom commands** | Trigger actions from desktop (e.g., "Clear auth tokens", "Force refresh")                   |


#### TanStack Query DevTools (on-device)

Adds a floating button on the app that opens a panel showing every query, its status, data, and timing — directly on the device.

```bash
npm install -D @tanstack/react-query-devtools
```

```typescript
// In root _layout.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// On-device devtools (dev only)
let DevTools: React.ComponentType | null = null;
if (__DEV__) {
  const { ReactQueryDevtools } = require("@tanstack/react-query-devtools");
  DevTools = ReactQueryDevtools;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* ... app content ... */}
      {DevTools && <DevTools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
```

#### React DevTools (standalone)

```bash
# Run in a separate terminal — auto-connects to the running app
npx react-devtools
```

**Key uses:**

- **Components tab:** Inspect any component's props, state, hooks, and context values. Click a component → see its current `useQuery` data, `useAuthStore` state, etc.
- **Profiler tab:** Record a user interaction → see which components re-rendered, why they re-rendered (props changed? state changed? parent re-rendered?), and how long each render took.
- **Highlight updates:** Enable "Highlight updates when components render" to visually spot unnecessary re-renders.

---

### 17.3 Network Debugging — Inspecting API Calls


| Method                          | Pros                                                                                | Cons                                        | Best For                                      |
| ------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------- | --------------------------------------------- |
| **Reactotron** (recommended)    | Zero config, shows req + res + timing, integrates with TanStack Query               | Desktop app required                        | Daily development                             |
| **Hermes Debugger Network tab** | Built-in, no extra tools                                                            | Less detail than Reactotron                 | Quick checks                                  |
| **Charles Proxy / Proxyman**    | See ALL traffic (including third-party SDKs), SSL proxying, throttling, breakpoints | Setup required (SSL cert install on device) | Deep network debugging, testing slow networks |
| `**api-client.ts` logging**     | Always available                                                                    | Clutters console                            | Fallback when tools aren't available          |


#### Charles Proxy / Proxyman setup (for deep inspection)

```
1. Install: Charles Proxy (cross-platform) or Proxyman (macOS, better UX)
2. Configure device proxy:
   - iOS Simulator: automatic (uses host machine's proxy)
   - Android Emulator: Settings → Wi-Fi → modify network → manual proxy → host IP + port 8888
   - Physical device: same as emulator, use computer's local IP
3. Install SSL certificate on device (required for HTTPS):
   - Charles: Help → SSL Proxying → Install Charles Root Certificate on Mobile Device
   - Proxyman: Certificate → Install on iOS Simulator / Android
4. Enable SSL Proxying for your API domain:
   - Charles: Proxy → SSL Proxying Settings → Add "*.traveltourup.com"
   - Proxyman: automatic
5. Now you see every request/response with full headers, body, timing, and TLS details
```

**When to use a proxy instead of Reactotron:**

- Debugging CORS or SSL issues
- Inspecting third-party SDK traffic (Sentry, analytics)
- Simulating slow networks (Charles → Proxy → Throttle Settings → choose "3G", "Edge", etc.)
- Modifying responses on the fly (Charles → Breakpoints → edit response before it reaches the app)

---

### 17.4 Performance Profiling


| What to Measure             | Tool                                                       | How                                                                    |
| --------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------- |
| **JS thread FPS**           | React Native Performance Monitor                           | Shake device → "Show Perf Monitor" → watch JS/UI frame rates           |
| **Component re-renders**    | React DevTools Profiler                                    | Record interaction → "Why did this render?" for each component         |
| **List scroll performance** | FlashList built-in metrics                                 | `<FlashList onBlankArea={...} />` reports blank area during scroll     |
| **Memory usage**            | Xcode Instruments / Android Studio Profiler                | Monitor heap size during navigation cycles — detect leaks              |
| **App startup time**        | `expo-splash-screen` timing                                | Measure from `SplashScreen.hideAsync()` call to first meaningful paint |
| **Bundle size**             | `npx expo export --dump-sourcemap` + `source-map-explorer` | Analyze which dependencies contribute most to bundle size              |
| **API call timing**         | Reactotron Timeline                                        | Duration column shows each request's time-to-response                  |


#### React Native Performance Monitor (built-in)

```
1. Shake device (or Cmd+D in iOS Simulator / Cmd+M in Android Emulator)
2. Tap "Show Perf Monitor"
3. Watch two numbers:
   - UI thread: should stay at 60 FPS (120 on ProMotion devices)
   - JS thread: drops below 60 → your JS code is doing too much on the main thread
4. If JS drops during scroll → memoize list items, move computation to useMemo
5. If UI drops during animation → move animation to UI thread (Reanimated worklets)
```

#### Memory leak detection

```
1. Open Xcode → Debug → Attach to Process → select your app
2. Use the Memory gauge in the Debug Navigator
3. Navigate: Home → Search → Results → Detail → Back → repeat 20 times
4. If memory keeps growing without releasing → you have a leak
5. Common causes:
   - Event listeners not cleaned up in useEffect
   - Zustand subscriptions without cleanup
   - Large images not being released (use expo-image which handles this)
```

#### Bundle size analysis

```bash
# Export with source maps
npx expo export --dump-sourcemap --platform ios

# Analyze (find which packages are largest)
npx source-map-explorer dist/bundles/ios-*.js.map

# Opens interactive treemap in browser showing:
# - Total bundle size
# - Size per package (e.g., date-fns: 45KB, @tanstack/react-query: 38KB)
# - Your app code vs dependencies
```

**Budget targets:**


| Metric                           | Target      | Why                                                       |
| -------------------------------- | ----------- | --------------------------------------------------------- |
| JS bundle                        | < 5 MB      | Fast download + parse time, especially on low-end Android |
| Cold start (time to interactive) | < 2 seconds | Users abandon apps slower than 3s                         |
| FlashList blank area             | < 5%        | Smooth scrolling without visible blanks                   |
| JS thread FPS during scroll      | ≥ 55 FPS    | Perceptibly smooth (below 45 feels janky)                 |
| Memory (steady state)            | < 200 MB    | Avoid OS killing the app in background                    |


---

### 17.5 Debugging Checklist by Symptom


| Symptom                              | First Tool to Open                           | What to Look For                                                          |
| ------------------------------------ | -------------------------------------------- | ------------------------------------------------------------------------- |
| App crashes on launch                | Sentry dashboard, `adb logcat` / Console.app | Native crash stack trace, missing native module                           |
| API call fails silently              | Reactotron Timeline                          | Request never sent? 401? 500? CORS error?                                 |
| Screen shows stale data              | TanStack Query DevTools                      | Is the query stale? Is `staleTime` too long? Cache key mismatch?          |
| Login doesn't persist                | Reactotron → Async Storage panel             | Are tokens being saved to SecureStore? Check `ttu_access_token` key       |
| White screen after navigation        | React DevTools → Components                  | Is the target screen rendering? Error boundary caught something?          |
| Slow list scrolling                  | Perf Monitor + React DevTools Profiler       | JS thread drops → memoize items. UI thread drops → reduce shadows/opacity |
| Memory keeps growing                 | Xcode Instruments / Android Studio Profiler  | Check for leaked subscriptions, un-cleaned useEffect                      |
| App works in dev, crashes in prod    | Hermes compile error                         | `npx expo run:ios --configuration Release` to test locally                |
| Different behavior on iOS vs Android | Platform-specific code check                 | `Platform.OS` branching, gesture handler differences, keyboard behavior   |


---

### 17.6 Recommended Development Environment Setup

```
Terminal 1: npx expo start --dev-client          # Dev server
Terminal 2: npx react-devtools                    # Component inspector (auto-connects)
Desktop:    Reactotron app running                # Network + state inspector (auto-connects)
Browser:    Press 'j' in Terminal 1 → Chrome      # JS debugger with breakpoints
```

All four tools auto-connect to the running app — no manual configuration needed after initial setup.

**VS Code extensions for React Native development:**


| Extension                          | Purpose                                                        |
| ---------------------------------- | -------------------------------------------------------------- |
| **React Native Tools** (Microsoft) | Debugger integration, launch configs, IntelliSense             |
| **Expo Tools**                     | Autocomplete for `app.json`, `eas.json`, Expo config files     |
| **ESLint**                         | Inline lint errors matching the project config                 |
| **Prettier**                       | Auto-format on save                                            |
| **Tailwind CSS IntelliSense**      | Nativewind class autocomplete (configure for `className` prop) |
| **Error Lens**                     | Inline error/warning display (no need to hover)                |
| **GitLens**                        | Blame annotations, history                                     |


---

## 18. Implementation Roadmap

> **Philosophy:** Each phase produces a **working, testable app**. Foundation includes all cross-cutting concerns (security, error handling, monitoring, offline, design system) — not deferred to later phases.

---

### Phase 1: Project Setup, Infrastructure & Design System (Week 1)

> **Goal:** Fully configured development environment with design system, API client, error handling, monitoring, and offline detection — all ready before any screen is built.
> **Backend changes:** None.

#### 1A — Environment & Tooling


| #    | Task                                                                                       | Output                   |
| ---- | ------------------------------------------------------------------------------------------ | ------------------------ |
| 1A.1 | Run `npx create-expo-app traveltourup-mobile --template tabs`                              | Project scaffolded       |
| 1A.2 | Configure TypeScript strict mode (`tsconfig.json` with `strict: true`, path aliases `@/`*) | Type safety enforced     |
| 1A.3 | Set up ESLint + Prettier (`eslint-config-expo`, `prettier`)                                | Code quality enforced    |
| 1A.4 | Install all core dependencies (see [Section 16](#16-environment-setup--prerequisites))     | `package.json` finalized |
| 1A.5 | Configure `app.json` — name, slug, scheme, bundle ID, plugins                              | App identity locked      |
| 1A.6 | Create `.env.example` + `src/lib/config.ts` (API_BASE_URL, SENTRY_DSN)                     | Environment management   |
| 1A.7 | Initialize Git repo, `.gitignore`, initial commit                                          | Version control          |


#### 1B — Design System (UI/UX Foundation)


| #     | Task                                                                                                                        | Output                  |
| ----- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| 1B.1  | Set up Nativewind v4 (`tailwind.config.js`, `global.css`, Babel plugin)                                                     | Tailwind styling active |
| 1B.2  | Create `src/theme/` — `colors.ts`, `typography.ts`, `spacing.ts`, `index.ts`                                                | Theme tokens defined    |
| 1B.3  | Build `Button` component (primary, secondary, outline, destructive variants, loading state)                                 | Core CTA                |
| 1B.4  | Build `Input` component (text, email, password with toggle, error state, label)                                             | Core form input         |
| 1B.5  | Build `Card` component (shadow, padding, press animation)                                                                   | Core container          |
| 1B.6  | Build `Badge` component (status colors: success, warning, error, info)                                                      | Status indicators       |
| 1B.7  | Build `Skeleton` loader (animated shimmer, adaptable size)                                                                  | Loading states          |
| 1B.8  | Build `EmptyState` component (icon + title + description + optional CTA)                                                    | Zero-data states        |
| 1B.9  | Build `BottomSheet` wrapper around `@gorhom/bottom-sheet`                                                                   | Filters/actions         |
| 1B.10 | Build `Toast` / notification component (success, error, info)                                                               | User feedback           |
| 1B.11 | Build `LoadingOverlay` (full-screen translucent overlay with activity indicator)                                            | Blocking operations     |
| 1B.12 | Export all from `src/components/ui/index.ts` barrel file                                                                    | Clean imports           |
| 1B.13 | Create `src/lib/platform/shadows.ts` — `Platform.select` shadow presets (`sm`, `md`, `lg`) used by all Card-like components | Cross-platform shadows  |
| 1B.14 | Create `src/lib/platform/haptics.ts` — `expo-haptics` wrapper (`light`, `medium`, `success`, `error`, `selection`)          | Cross-platform haptics  |
| 1B.15 | Create `src/lib/platform/keyboard.ts` — `KeyboardAvoidingView` behavior + offset per platform                               | Cross-platform keyboard |
| 1B.16 | Export all from `src/lib/platform/index.ts` barrel file                                                                     | Clean imports           |


#### 1C — API Client, Security & Error Handling


| #    | Task                                                                                                                                                            | Output               |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| 1C.1 | Implement `src/lib/storage.ts` — `expo-secure-store` wrapper for tokens (`save`, `getAccessToken`, `getRefreshToken`, `getExpiresAt`, `clear`)                  | Secure token storage |
| 1C.2 | Implement `src/services/api-client.ts` — generic `apiRequest<T>`, `apiGet`, `apiPost`, `apiPatch`, `apiDelete`, `apiPaginated` with Bearer token injection      | HTTP layer           |
| 1C.3 | Add proactive token refresh (check `expiresAt - 60s` before every call) + reactive 401 retry in `api-client.ts`                                                 | Token lifecycle      |
| 1C.4 | Implement `ApiError` class (`code`, `message`, `status`, `issues`) matching backend error envelope                                                              | Typed errors         |
| 1C.5 | Create `src/lib/error-messages.ts` — human-friendly mapping for `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `INTERNAL_ERROR`, `NETWORK_ERROR` | User-facing messages |
| 1C.6 | Build `ErrorBoundary` component (catches React tree crashes, shows retry screen)                                                                                | Global crash safety  |
| 1C.7 | Create `src/types/api.ts` — `ApiSuccessResponse<T>`, `ApiPaginatedResponse<T>`, `ApiErrorResponse` matching backend envelope                                    | Response types       |
| 1C.8 | Validate all inputs client-side with Zod before sending (`npm install zod`)                                                                                     | Input validation     |


#### 1D — Monitoring, Offline & Performance Setup


| #    | Task                                                                                                                              | Output                 |
| ---- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| 1D.1 | Install and configure Sentry (`@sentry/react-native`) — DSN from env, strip PII in `beforeSend`, `tracesSampleRate: 0.2`          | Crash reporting active |
| 1D.2 | Add Babel plugin to strip `console.`* in production builds                                                                        | No debug logs in prod  |
| 1D.3 | Implement `src/hooks/useNetworkStatus.ts` — `@react-native-community/netinfo` synced with `onlineManager` from TanStack Query     | Network awareness      |
| 1D.4 | Build `OfflineBanner` component (animated top banner: "No internet — showing cached data")                                        | Offline UX             |
| 1D.5 | Configure TanStack Query with `QueryClient` defaults (`staleTime: 5min`, `gcTime: 30min`, `retry: 2`, `refetchOnReconnect: true`) | Cache strategy         |
| 1D.6 | Set up `PersistQueryClientProvider` with `AsyncStorage` persister for offline cache                                               | Offline data           |
| 1D.7 | Configure `react-native-mmkv` for non-sensitive fast storage (search history, UI preferences)                                     | Fast local storage     |


**Phase 1 verification:** Run `npx tsc --noEmit` (zero errors), Sentry test event reaches dashboard, network banner shows/hides correctly, all UI components render on **both iOS Simulator AND Android Emulator** (shadows, keyboard behavior, haptics all verified per platform).

---

### Phase 2: Authentication & Navigation Shell (Week 2)

> **Goal:** Complete auth flow (signup → email confirm → login → auto-refresh → logout → forgot password) with protected navigation. First real user-facing screens.
> **Backend changes:** None — all auth endpoints already exist.

#### 2A — Auth Services & State


| #    | Task                                                                                                                                                                                                                                                 | Output              |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| 2A.1 | Implement `src/services/auth.service.ts` — `login`, `signup`, `refreshTokens`, `logout`, `forgotPassword` calling `/api/v1/auth/`*                                                                                                                   | Auth API layer      |
| 2A.2 | Create `src/stores/auth.store.ts` (Zustand) — `accessToken`, `refreshToken`, `expiresAt`, `user`, `isAuthenticated`, `isLoading`, `pendingReturnTo` + actions: `login`, `signup`, `logout`, `refreshSession`, `restoreSession`, `setPendingReturnTo` | Auth state          |
| 2A.3 | Implement session restoration in store — on app launch, read tokens from SecureStore → validate expiry → refresh if needed → set authenticated or redirect to login                                                                                  | Persistent sessions |
| 2A.4 | Implement `src/services/user.service.ts` — `getMyProfile`, `updateMyProfile`, `uploadAvatar` calling `/api/v1/users/me`                                                                                                                              | Profile API         |


#### 2B — Auth Components & Guards


| #    | Task                                                                                                                                                                   | Output             |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| 2B.1 | Build `src/components/profile/AuthForm.tsx` — login/signup form with toggle ("Don't have an account? Sign Up"), "Forgot password?" link, Zod validation, error display | Profile auth form  |
| 2B.2 | Build `LoginForm` sub-component — email + password fields, submit button, loading state                                                                                | Login form         |
| 2B.3 | Build `SignupForm` sub-component — first name, last name, email, password (with strength indicator), submit button                                                     | Signup form        |
| 2B.4 | Build `app/auth/forgot-password.tsx` — email input, success state ("Check your inbox"), deep link support for `redirect_to`                                            | Password reset     |
| 2B.5 | Create `src/hooks/useRequireAuth.ts` — `guardAction()` that checks `isAuthenticated` and redirects to Profile tab (which shows login form) if not signed in            | Action-level guard |


#### 2C — Main Navigation (Browse-First) & Profile Tab


| #     | Task                                                                                                                                                                                                    | Output             |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| 2C.1  | Build `app/_layout.tsx` — root layout with providers (QueryClient, Zustand, Sentry, ErrorBoundary), **no global auth gate** — always shows tabs. Background auth restoration on mount. OTA update check | App entry point    |
| 2C.2  | Build `app/(tabs)/_layout.tsx` — bottom tab navigator (**3 tabs:** Home, Explore, Profile) with icons, active/inactive states                                                                           | Tab bar            |
| 2C.3  | Build `app/(tabs)/index.tsx` — Home screen (search form skeleton with Flights/Hotels/Cars tabs, recent searches from MMKV). **Public**                                                                  | Home screen        |
| 2C.4  | Build `app/(tabs)/explore/_layout.tsx` + `index.tsx` — Explore tab (category cards: Hotels, Cars). **Public**                                                                                           | Explore shell      |
| 2C.5  | Build `src/components/profile/ProfileHeader.tsx` — avatar (tap to change), name, email display                                                                                                          | Profile header     |
| 2C.6  | Build `src/components/profile/SegmentedTabs.tsx` — reusable tab bar (My Profile / My Bookings / My Reviews)                                                                                             | Segmented tabs     |
| 2C.7  | Build `src/components/profile/ProfileEditForm.tsx` — first name, last name, phone fields, "Save" button, "Logout" button with confirmation, "Delete Account" at bottom                                  | Profile edit form  |
| 2C.8  | Build `src/components/profile/AuthenticatedProfile.tsx` — assembles ProfileHeader + SegmentedTabs + tab content (ProfileEditForm, MyBookingsList placeholder, MyReviewsList placeholder)                | Authenticated view |
| 2C.9  | Build `app/(tabs)/profile/index.tsx` — **dual behavior:** shows `AuthForm` if guest, shows `AuthenticatedProfile` if signed in                                                                          | Profile screen     |
| 2C.10 | Create `src/hooks/useProfile.ts` — TanStack Query hook wrapping `user.service.ts` (only enabled when `isAuthenticated`)                                                                                 | Profile data       |


**Phase 2 deliverable:** App launches directly to Home tab (no auth gate). User can browse all 3 tabs. Profile tab shows login/signup form when not signed in — after signing in, it transitions to full profile with editable fields and My Bookings / My Reviews sub-tabs (placeholders for now). Session persists across app restarts.

---

### Phase 3: Bookings, Checkout & Home (Week 3-4)

> **Goal:** Full booking lifecycle — view bookings, booking detail with status, cancel, and a complete checkout wizard (using mock/manual offer data initially).
> **Backend changes:** None — booking APIs already exist.

#### 3A — Booking Module


| #    | Task                                                                                                                                                                                                                                                            | Output                    |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| 3A.1 | Create `src/types/booking.ts` — `Booking`, `BookingDetail`, `CreateBookingPayload` DTOs matching backend response                                                                                                                                               | Booking types             |
| 3A.2 | Implement `src/services/booking.service.ts` — `list`, `getById`, `create`, `cancel` calling `/api/v1/bookings`                                                                                                                                                  | Booking API               |
| 3A.3 | Create `src/hooks/useBookings.ts` — `useBookings(filters)`, `useBookingDetail(id)`, `useCancelBooking()`, `useCreateBooking()` with query key factory                                                                                                           | Booking hooks             |
| 3A.4 | Build `BookingCard` — type badge (flight/hotel/car), ref number, date, amount, status badge, press to navigate to `bookings/[id]`                                                                                                                               | Listing card              |
| 3A.5 | Build `BookingStatusBadge` — color-coded: pending (yellow), confirmed (green), cancelled (red), completed (blue)                                                                                                                                                | Status indicator          |
| 3A.6 | Build `BookingTimeline` — vertical timeline of status changes                                                                                                                                                                                                   | Detail component          |
| 3A.7 | Build `src/components/profile/MyBookingsList.tsx` — FlashList of BookingCards inside Profile tab's "My Bookings" sub-tab. Pull-to-refresh, infinite scroll pagination, filter chips (All/Flights/Hotels/Cars), skeleton loading, empty state                    | Booking list (in Profile) |
| 3A.8 | Build `app/bookings/[id].tsx` — auth-gated (redirect to Profile login if not authenticated). Full detail: ref number, type, status timeline, guest data, amount, cancel button (with confirmation dialog), child payload display. Pushed from My Bookings list. | Booking detail            |


#### 3B — Checkout Flow


| #    | Task                                                                                                                                                                                | Output         |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| 3B.1 | Create `src/stores/checkout.store.ts` (Zustand) — `type`, `selectedOffer`, `guestData`, `totalAmount`, `currency` + actions: `setOffer`, `setGuestData`, `reset`                    | Checkout state |
| 3B.2 | Build `app/checkout/_layout.tsx` — **layout-level auth gate** (redirects to login if not authenticated), stack navigator (modal presentation), progress bar (3 steps)               | Checkout nav   |
| 3B.3 | Build `app/checkout/passenger-info.tsx` — traveler details form (first name, last name, email, phone, passport for flights), Zod validation                                         | Step 1         |
| 3B.4 | Build `app/checkout/payment.tsx` — order summary card, payment method selection (mock initially, Stripe later), total breakdown                                                     | Step 2         |
| 3B.5 | Build `app/checkout/confirmation.tsx` — success animation (Lottie/Reanimated), booking ref, "View Booking" + "Back to Home" CTAs                                                    | Step 3         |
| 3B.6 | Wire checkout submission — call `bookingService.create()` with assembled payload, handle loading + error states, navigate to confirmation on success, invalidate booking list cache | E2E flow       |


#### 3C — Home Screen


| #    | Task                                                                                                                                                                   | Output       |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| 3C.1 | Build `FlightSearchForm` — origin/destination inputs, date pickers (departure + optional return), passenger counter, cabin class selector                              | Search form  |
| 3C.2 | Build `HotelSearchForm` — location input, check-in/out date pickers, guest counter, room counter                                                                       | Search form  |
| 3C.3 | Build `CarSearchForm` — pickup location, pickup/return dates                                                                                                           | Search form  |
| 3C.4 | Build `app/(tabs)/index.tsx` — segmented tabs (Flights / Hotels / Cars), search form per tab, recent searches below (from MMKV), popular destinations (static for now) | Home screen  |
| 3C.5 | Create `src/stores/search.store.ts` (Zustand) — search params per type, recent searches persistence                                                                    | Search state |


**Phase 3 deliverable:** Complete booking lifecycle. User searches (form only, no API results yet), views existing bookings, sees booking details, cancels bookings. Checkout wizard creates real bookings via API. Home screen has functional search forms.

---

### Phase 4: Flight Search & Booking (Week 5-6)

> **Goal:** End-to-end flight booking — search → results → offer detail → checkout → booking confirmation.
> **Backend changes required:** `POST /api/v1/flights/search`, `GET /api/v1/flights/offers/:id`

#### 4A — Backend Prerequisites (parallel with mobile work)


| #    | Backend Task                                                                                             | API                              |
| ---- | -------------------------------------------------------------------------------------------------------- | -------------------------------- |
| 4A.1 | Create `flight.controller.ts` with `handleFlightSearch` calling `searchFlights()` from Duffel            | `POST /api/v1/flights/search`    |
| 4A.2 | Add `handleGetFlightOffer` calling `duffelFlights.getOffer(id)`                                          | `GET /api/v1/flights/offers/:id` |
| 4A.3 | Create route files at `app/api/v1/flights/search/route.ts` and `app/api/v1/flights/offers/[id]/route.ts` | Route wiring                     |


#### 4B — Mobile Flight Module


| #     | Task                                                                                                                                                                       | Output                |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| 4B.1  | Create `src/types/flight.ts` — `FlightOffer`, `FlightSlice`, `FlightSegment`, `FlightSearchParams` DTOs                                                                    | Flight types          |
| 4B.2  | Implement `src/services/flight.service.ts` — `search(params)`, `getOffer(id)`                                                                                              | Flight API            |
| 4B.3  | Create `src/hooks/useFlights.ts` — `useFlightSearch(params)` (mutation-style, not auto-fetch), `useFlightOffer(id)`                                                        | Flight hooks          |
| 4B.4  | Build `FlightCard` — airline logo, departure/arrival times, duration, stops count, price, cabin class badge                                                                | Result card           |
| 4B.5  | Build `FlightFilterSheet` — bottom sheet: price range slider, max stops (0/1/2+), departure time ranges, airline checkboxes                                                | Client-side filtering |
| 4B.6  | Build `app/flights/_layout.tsx` — stack navigator                                                                                                                          | Flight nav            |
| 4B.7  | Build `app/flights/search.tsx` — pre-filled from Home search form (via search.store), edit + submit                                                                        | Search screen         |
| 4B.8  | Build `app/flights/results.tsx` — FlashList of `FlightCard`, sort dropdown (price/duration/departure), filter button → `FlightFilterSheet`, skeleton loading, empty state  | Results screen        |
| 4B.9  | Build `app/flights/[offerId].tsx` — full offer detail: slices with segments (departure → layover → arrival), baggage info, fare rules, total price, "Book this flight" CTA | Detail screen         |
| 4B.10 | Wire "Book" button → `checkout.store.setOffer('flight', offer, amount, currency)` → navigate to `app/checkout/passenger-info`                                              | Flight → Checkout     |


**Phase 4 deliverable:** User searches flights from Home → sees results → filters/sorts → taps offer → sees detail → books → booking appears in My Bookings.

---

### Phase 5: Hotels & Cars Catalog (Week 7-8)

> **Goal:** Browse hotel and car catalogs, view details, book from catalog.
> **Backend changes required:** Public `GET /api/v1/hotels`, `GET /api/v1/cars`, `GET /api/v1/hotels/:id`, `GET /api/v1/cars/:id`

#### 5A — Backend Prerequisites


| #    | Backend Task                                                                                                                                             | API                                              |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| 5A.1 | Refactor hotel routes: merge admin-only `/api/v1/admin/hotels` into `/api/v1/hotels` with permission-branched GET (admin → all, public → published only) | `GET /api/v1/hotels`                             |
| 5A.2 | Same for cars: merge into `/api/v1/cars`                                                                                                                 | `GET /api/v1/cars`                               |
| 5A.3 | Add public detail endpoints                                                                                                                              | `GET /api/v1/hotels/:id`, `GET /api/v1/cars/:id` |


#### 5B — Mobile Hotel Module


| #    | Task                                                                                                                                                | Output           |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| 5B.1 | Create `src/types/hotel.ts` — `Hotel`, `HotelDetail` DTOs                                                                                           | Hotel types      |
| 5B.2 | Implement `src/services/hotel.service.ts` — `list(params)`, `getById(id)`                                                                           | Hotel API        |
| 5B.3 | Create `src/hooks/useHotels.ts` — `useHotels(filters)`, `useHotelDetail(id)`                                                                        | Hotel hooks      |
| 5B.4 | Build `HotelCard` — image (expo-image with blurhash), name, stars, location, price/night, amenity chips                                             | Listing card     |
| 5B.5 | Build `HotelFilterSheet` — price range, star rating, amenities checkboxes                                                                           | Filters          |
| 5B.6 | Build `app/(tabs)/explore/hotels/index.tsx` — FlashList, pull-to-refresh, pagination, filters, skeleton                                             | Hotel listing    |
| 5B.7 | Build `app/(tabs)/explore/hotels/[id].tsx` — image gallery (Swiper), description, amenities grid, location map (Leaflet/MapView), price, "Book" CTA | Hotel detail     |
| 5B.8 | Wire "Book" → checkout flow with `type: 'hotel'`                                                                                                    | Hotel → Checkout |


#### 5C — Mobile Car Module


| #    | Task                                                                                    | Output         |
| ---- | --------------------------------------------------------------------------------------- | -------------- |
| 5C.1 | Create `src/types/car.ts` — `Car`, `CarDetail` DTOs                                     | Car types      |
| 5C.2 | Implement `src/services/car.service.ts` — `list(params)`, `getById(id)`                 | Car API        |
| 5C.3 | Create `src/hooks/useCars.ts` — `useCars(filters)`, `useCarDetail(id)`                  | Car hooks      |
| 5C.4 | Build `CarCard` — image, name, passengers, transmission, price/day                      | Listing card   |
| 5C.5 | Build `app/(tabs)/explore/cars/index.tsx` — FlashList, filters, pagination              | Car listing    |
| 5C.6 | Build `app/(tabs)/explore/cars/[id].tsx` — image, specs, description, price, "Book" CTA | Car detail     |
| 5C.7 | Wire "Book" → checkout flow with `type: 'car'`                                          | Car → Checkout |


#### 5D — Explore Tab Landing


| #    | Task                                                                                                                  | Output      |
| ---- | --------------------------------------------------------------------------------------------------------------------- | ----------- |
| 5D.1 | Build `app/(tabs)/explore/index.tsx` — category cards (Hotels, Cars) with counts, featured items carousel, search bar | Explore hub |


**Phase 5 deliverable:** Full explore experience — browse hotels/cars, filter, view details, book. All three booking types (flight, hotel, car) flow through the unified checkout.

---

### Phase 6: Polish, Production & Store Submission (Week 9-10)

> **Goal:** Production-ready app submitted to both stores.
> **Backend changes:** None (or minor: `GET /api/v1/app-config` for version check).

#### 6A — Branding & Assets


| #    | Task                                                           | Priority |
| ---- | -------------------------------------------------------------- | -------- |
| 6A.1 | Design and configure app icon (1024x1024 PNG) in `app.json`    | P0       |
| 6A.2 | Design and configure splash screen (Expo SplashScreen API)     | P0       |
| 6A.3 | Design adaptive icon for Android                               | P0       |
| 6A.4 | Capture App Store screenshots (6.7", 6.5", iPad if applicable) | P0       |
| 6A.5 | Capture Play Store screenshots + feature graphic (1024x500)    | P0       |


#### 6B — Deep Linking & Notifications


| #    | Task                                                                                                 | Priority |
| ---- | ---------------------------------------------------------------------------------------------------- | -------- |
| 6B.1 | Configure deep link scheme (`traveltourup://`) with associated domains (iOS) and app links (Android) | P1       |
| 6B.2 | Test deep links: `bookings/:id`, `explore/hotels/:id`, `reset-password`                              | P1       |
| 6B.3 | Set up `expo-notifications` for push notifications (booking status updates)                          | P1       |
| 6B.4 | Add biometric auth option for returning users (`expo-local-authentication`)                          | P2       |


#### 6C — Performance & Security Hardening


| #    | Task                                                                    | Priority |
| ---- | ----------------------------------------------------------------------- | -------- |
| 6C.1 | Profile and fix any frame drops in FlashLists (target 60 FPS)           | P1       |
| 6C.2 | Audit memory usage — navigate all flows 20+ times, check for leaks      | P1       |
| 6C.3 | Verify all tokens in SecureStore, none in AsyncStorage/MMKV             | P0       |
| 6C.4 | Verify no `console.log` in production build (Babel strip plugin)        | P0       |
| 6C.5 | Verify HTTPS-only (no cleartext) + PII not logged to Sentry             | P0       |
| 6C.6 | Test slow network (2G/3G simulation) — no crashes, graceful degradation | P1       |
| 6C.7 | Accessibility audit: VoiceOver (iOS) + TalkBack (Android) on key flows  | P1       |


#### 6D — Build & Submit


| #    | Task                                                                                         | Priority |
| ---- | -------------------------------------------------------------------------------------------- | -------- |
| 6D.1 | Configure `eas.json` — development, preview, production profiles with correct env vars       | P0       |
| 6D.2 | Run EAS Build for iOS + Android (production profile)                                         | P0       |
| 6D.3 | Test production build on real devices (minimum: 1 iOS + 1 Android)                           | P0       |
| 6D.4 | Submit to TestFlight (iOS) — internal testing with team                                      | P0       |
| 6D.5 | Submit to Play Console Internal track — 20 testers for 14 days                               | P0       |
| 6D.6 | Fill App Store and Play Store metadata (title, description, privacy policy URL, data safety) | P0       |
| 6D.7 | Submit for App Store Review + Play Store Production review                                   | P0       |
| 6D.8 | Configure OTA update channels and verify `eas update` works                                  | P1       |
| 6D.9 | Set up CI/CD via GitHub Actions for automated builds on merge to `main`                      | P1       |


**Phase 6 deliverable:** App live on App Store and Play Store.

---

### Phase Summary

```
Phase 1    │ Setup + Design System + API Client + Security + Monitoring + Offline
                     │ ─── No screens yet, but entire infrastructure is solid ───
                     │
Phase 2    │ Auth Flow + Navigation Shell + Profile
                     │ ─── Demo: signup, login, profile, tabs ───
                     │
Phase 3   │ Bookings + Checkout + Home Search Forms
                     │ ─── Demo: full booking lifecycle, checkout wizard ───
                     │
Phase 4  │ Flight Search + Booking (needs backend API)
                     │ ─── Demo: search → results → detail → book ───
                     │
Phase 5  │ Hotels + Cars Catalog + Booking
                     │ ─── Demo: browse → detail → book for all 3 types ───
                     │
Phase 6  │ Polish + Branding + Store Submission
                     │ ─── Deliverable: live on App Store + Play Store ───
```

---

## 18.1 Template & Source Code References

Use these **premium and open-source templates** for code patterns, UI structure, and implementation guidance. Study the architecture, not just the UI.

### Premium Templates (CodeCanyon / Envato)


| Template                                       | Price           | What To Study                                                                                                                                                                                 | Link                                                                                                                                           |
| ---------------------------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **SkyFly — Flight & Hotel Booking App**        | ~$25            | Complete flight + hotel booking UI kit for React Native. Includes Figma files. Search forms, results lists, detail screens, checkout flow.                                                    | [codecanyon.net/item/51618585](https://codecanyon.net/item/online-flight-hotelplace-booking-app-ui-kit-reactnative-figma-free-skyfly/51618585) |
| **Travelin — Air, Hotel & Tour Booking**       | ~$49            | Full React Native + Expo app with Duffel API integration, Laravel backend, real flight search, hotel discovery, booking management, push notifications. Study the Duffel integration pattern. | [codecanyon.net — Travelin](https://codecanyon.net/search/travelin+react+native)                                                               |
| **Felix Travel — Complete RN Travel Template** | ~$25            | 40+ screens: destinations, hotels, flights, car rentals, bookings, profile. Modern card-based UI. Study the navigation structure and screen compositions.                                     | [codecanyon.net/item/24277209](https://codecanyon.net/item/felix-travel-complete-react-native-travel-app-template/24277209)                    |
| **Bravel — Travel Booking RN App**             | Envato Elements | 33+ screens: house rental, hotel, flights, car bookings. Study the filter UI patterns and listing layouts.                                                                                    | [elements.envato.com — Bravel](https://elements.envato.com/bravel-travel-booking-react-native-app-A6X6EGF)                                     |
| **AeroCloud — Travel & Booking RN Template**   | ~$29            | Light + dark mode, personalized recommendations, destination guides, itinerary management. Study the theming implementation.                                                                  | [templatelelo.com — AeroCloud](https://templatelelo.com/item/aerocloud-travel-booking-mobile-app-react-native-template/7448)                   |
| **Nomadia — Travel RN Expo UI Kit**            | ~$39            | 130+ screens, maps, favorites, multiple payment methods, light/dark mode. The most comprehensive UI kit. Study for exhaustive screen coverage.                                                | [Search "Nomadia travel react native"](https://codecanyon.net/search/nomadia+react+native)                                                     |


### Premium Templates (Other Platforms)


| Template                              | Platform       | What To Study                                                                                                                                      | Link                                                                                                                                                 |
| ------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Propia — Airbnb-style Booking App** | Medium/Gumroad | 35+ screens, React Native + Expo + NativeWind (Tailwind). TypeScript. Matches our tech stack exactly. Study the NativeWind + Expo Router patterns. | [Search "Propia react native expo nativewind"](https://medium.com/@the.zeman_97093/react-native-expo-airbnb-style-booking-app-template-494a85cba4b3) |
| **AI Hotel Booking UI Kit**           | Codester       | 80+ screens with AI-powered search, calendar booking, payment flow. Study the advanced search UX patterns.                                         | [codester.com/items/59039](https://www.codester.com/items/59039/ai-hotel-booking-ui-kit-react-native)                                                |


### Open-Source References (GitHub)


| Repository                   | Stars  | What To Study                                                                                                                                          | Link                                                                                                                |
| ---------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| **TravelStay**               | Active | Expo + TypeScript hotel booking app inspired by Airbnb. Clerk auth, Google Maps, property listings. Study the Expo + TypeScript project structure.     | [github.com/AyushSinghbharti/TravelStay](https://github.com/AyushSinghbharti/TravelStay---Travel-anywhere-carefree) |
| **Expo examples (official)** | N/A    | Official Expo examples for auth, navigation, API integration. The gold standard for Expo patterns.                                                     | [github.com/expo/examples](https://github.com/expo/examples)                                                        |
| **Obytes Starter**           | 2K+    | Production-ready Expo starter with TypeScript, TanStack Query, Zustand, Nativewind, testing. Matches our exact stack. Study as architecture reference. | [github.com/obytes/react-native-template-obytes](https://github.com/obytes/react-native-template-obytes)            |
| **Ignite by Infinite Red**   | 15K+   | Battle-tested RN boilerplate with MobX/Zustand, generators, demo screens. Study the folder structure and generator patterns.                           | [github.com/infinitered/ignite](https://github.com/infinitered/ignite)                                              |


### How to Use These Templates

1. **Do NOT copy-paste code** — templates use different backends, auth systems, and state management
2. **Study the UI patterns** — screen layouts, card designs, animation approaches, filter UX
3. **Study the architecture** — folder structure, service layer patterns, hook organization
4. **Extract reusable patterns** — date pickers, airport/location pickers, price formatters, booking cards
5. **Match to your stack** — our stack is Expo + TypeScript + NativeWind + TanStack Query + Zustand + Supabase. Translate patterns to fit.

---

## 19. Versioning & OTA Updates

### Versioning strategy

```
version: "1.0.0"  ← User-facing (App Store / Play Store)
runtimeVersion: "1.0.0"  ← OTA compatibility check
buildNumber: auto-incremented by EAS
```

**Rules:**

- **Patch** (1.0.X): Bug fixes, copy changes → deploy via OTA (`expo-updates`)
- **Minor** (1.X.0): New features, new screens → OTA if no native changes, otherwise new build
- **Major** (X.0.0): Native module changes, SDK upgrades → new App Store / Play Store build

### OTA update configuration

```json
// eas.json
{
  "build": {
    "production": {
      "channel": "production",
      "distribution": "store"
    },
    "preview": {
      "channel": "preview",
      "distribution": "internal"
    }
  },
  "submit": {
    "production": {}
  }
}
```

```typescript
// In root _layout.tsx
import * as Updates from "expo-updates";

useEffect(() => {
  async function checkForUpdate() {
    if (__DEV__) return;
    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        await Updates.fetchUpdateAsync();
        await Updates.reloadAsync();
      }
    } catch (e) {
      // Silently fail — user continues with current version
    }
  }
  checkForUpdate();
}, []);
```

---

## 20. Backend API Gaps — Required Before Mobile

These endpoints need to be created in the Next.js backend following the existing [Module Blueprint](../MODULE_BLUEPRINT.md) pattern. They are listed in priority order.

### P0 — Required for Phase 3 (Flight Search)

#### `POST /api/v1/flights/search`

```
Request:
{
  "origin": "LHR",              // IATA airport code
  "destination": "JFK",
  "departure_date": "2026-05-15",
  "return_date": "2026-05-22",  // optional (one-way if omitted)
  "passengers": [{ "type": "adult" }],
  "cabin_class": "economy"      // economy | premium_economy | business | first
}

Response: { success: true, data: { offer_request_id, offers: [...] } }
```

**Implementation:** Create a `flight.controller.ts` that calls the existing `searchFlights()` from `src/lib/duffel/flights.ts`. Requires auth (customer role). Add return-trip support (second slice).

#### `GET /api/v1/flights/offers/:id`

```
Response: { success: true, data: { id, slices: [...], total_amount, total_currency, ... } }
```

**Implementation:** Call `duffelFlights.getOffer(id)` and transform the response.

### P0 — Required for Phase 3 (Hotel & Car Catalog)

#### `GET /api/v1/hotels` (public catalog)

Expose published `AdminHotel` records to unauthenticated/customer users. Follow the permission-branched GET pattern:

- Admin with `admin.hotels:read` → all hotels (paginated, all statuses)
- Otherwise → published hotels only

#### `GET /api/v1/hotels/:id` (public detail)

Same permission branching as above for single hotel.

#### `GET /api/v1/cars` (public catalog)

Same pattern as hotels, exposing published `AdminCar` records.

#### `GET /api/v1/cars/:id` (public detail)

Same pattern for single car.

### P1 — Required for Phase 3 (Duffel Stays)

#### `POST /api/v1/hotels/search` (Duffel search)

```
Request:
{
  "check_in": "2026-05-15",
  "check_out": "2026-05-18",
  "guests": [{ "type": "adult" }],
  "rooms": 1,
  "location": { "lat": 51.5074, "lng": -0.1278, "radius_km": 10 }
}

Response: { success: true, data: { search_result_id, results: [...] } }
```

#### `GET /api/v1/hotels/search-results/:searchResultId/rates`

Call `duffelStays.fetchAllRates(searchResultId)`.

#### `POST /api/v1/hotels/quotes`

```
Request: { "rate_id": "..." }
Response: { success: true, data: { quote_id, total_amount, currency, ... } }
```

### P2 — Nice to Have


| Endpoint                            | Purpose                                                      |
| ----------------------------------- | ------------------------------------------------------------ |
| `POST /api/v1/flights/orders`       | Create Duffel order (real booking)                           |
| `POST /api/v1/hotels/bookings`      | Create Duffel stays booking                                  |
| `GET /api/v1/airports/search?q=lon` | Airport autocomplete (can use Duffel places API)             |
| `GET /api/v1/blogs` (verify)        | Confirm unauthenticated public access works for blog listing |


---

## Summary


| Decision         | Choice                                                   | Rationale                                                          |
| ---------------- | -------------------------------------------------------- | ------------------------------------------------------------------ |
| **Language**     | **TypeScript (strict mode)**                             | Shared types/schemas with Next.js backend, zero `.js` files        |
| Framework        | React Native + Expo SDK 53                               | Existing RN skills, TypeScript sharing, Expo DX                    |
| Cross-platform   | 95%+ shared code, `Platform.select` for visual diffs     | Single codebase; platform files only when UX fundamentally differs |
| Navigation       | expo-router v4 (file-based)                              | Matches Next.js mental model, built-in deep linking                |
| Server state     | TanStack Query v5                                        | Caching, pagination, background refetch                            |
| UI state         | Zustand                                                  | Lightweight, accessible outside React                              |
| Styling          | Nativewind v4 (Tailwind CSS)                             | Consistent with web app's Tailwind                                 |
| Icons            | `lucide-react-native`                                    | Same icon set as web app (`lucide-react`), tree-shakeable          |
| Auth             | Bearer tokens via `expo-secure-store`                    | Secure, works with existing `getServerAuthz()`                     |
| Lists            | `@shopify/flash-list`                                    | Performant recycled lists                                          |
| Monitoring       | Sentry + EAS Insights                                    | Crash reporting + build analytics                                  |
| OTA              | `expo-updates`                                           | Ship JS-only fixes without App Store review                        |
| Design reference | Figma Community kits + Skyscanner/Hopper/Airbnb patterns | Professional travel UI patterns                                    |


> **Next step:** Begin Phase 1 — project setup, design system, API client, security, monitoring, and offline infrastructure. No backend changes required. No screens yet — just the rock-solid foundation.

