

# TravelTourUp — Multi-Domain & Multi-Country Strategy

# Complete Planning & Architecture Document

**Document Version:** 1.0  
**Created:** March 12, 2026  
**Classification:** Strategic Architecture Planning  
**Main Site:** traveltourup.com  
**Stack:** PHP Backend + Next.js Frontend + MySQL Database + Duffel API  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Business Context & Requirements](#2-business-context--requirements)
3. [Approach 1: WordPress Satellite Sites + Main App](#3-approach-1-wordpress-satellite-sites--main-app)
4. [Approach 2: Unified Multi-Domain Single Codebase](#4-approach-2-unified-multi-domain-single-codebase)
5. [Approach 3: Headless Multi-Tenant with Next.js (INDUSTRY BEST PRACTICE)](#5-approach-3-headless-multi-tenant-with-nextjs-industry-best-practice)
6. [Approach 4: Hybrid — WordPress for Content + API-Driven Booking](#6-approach-4-hybrid--wordpress-for-content--api-driven-booking)
7. [Comparison Matrix](#7-comparison-matrix)
8. [RECOMMENDED APPROACH: Detailed Implementation Plan](#8-recommended-approach-detailed-implementation-plan)
9. [SEO Strategy for Multi-Domain Multi-Country](#9-seo-strategy-for-multi-domain-multi-country)
10. [Domain & DNS Architecture](#10-domain--dns-architecture)
11. [Database Architecture for Multi-Domain](#11-database-architecture-for-multi-domain)
12. [Backend Changes Required (PHP)](#12-backend-changes-required-php)
13. [Frontend Changes Required (Next.js)](#13-frontend-changes-required-nextjs)
14. [WordPress Integration Guide (If WordPress Sites Used)](#14-wordpress-integration-guide-if-wordpress-sites-used)
15. [Security Considerations](#15-security-considerations)
16. [Deployment & Infrastructure](#16-deployment--infrastructure)
17. [Monitoring & Analytics](#17-monitoring--analytics)
18. [Implementation Timeline](#18-implementation-timeline)
19. [Risk Assessment & Mitigation](#19-risk-assessment--mitigation)
20. [Final Recommendation & Next Steps](#20-final-recommendation--next-steps)
21. [SEO Admin Panel & WordPress-Level SEO for Approach 3 (Full SEO Team Guide)](#21-seo-admin-panel--wordpress-level-seo-for-approach-3-full-seo-team-guide)
22. [Complete SEO Panel Coding Plan — Libraries, Complexity & Full Implementation](#22-complete-seo-panel-coding-plan--libraries-complexity--full-implementation)

---

## 1. Executive Summary

### Problem Statement

TravelTourUp (traveltourup.com) needs to expand internationally by launching country-specific domains (e.g., travelup.pk for Pakistan, travelup.ae for UAE, etc.) to target local audiences.  
**Core requirement:** All domains must share the **same backend, database, and booking engine** (Duffel API) while having:

- **Unique SEO** per domain/country (separate meta tags, structured data, sitemaps)
- **Customizable design/branding** per domain
- **Shared booking infrastructure** (flights, hotels, cars via Duffel)

### Key Decision

This document evaluates **4 approaches**, analyzing pros, cons, industry practices, and ultimately recommends the best architecture for TravelTourUp's specific needs — balancing SEO control, development cost, maintainability, and scalability.

### Quick Recommendation Preview

> **Approach 3 (Headless Multi-Tenant with Next.js)** is recommended as the primary strategy, with elements of **Approach 4 (Hybrid)** if strong content marketing per country is needed. WordPress satellite sites (Approach 1) are **not recommended** due to sync complexity, security surface, and poor user experience from cross-domain redirects.

---

## 2. Business Context & Requirements

### 2.1 Current Architecture

```
┌─────────────────────────────────────────────────────┐
│                  traveltourup.com                     │
│                                                       │
│  ┌──────────┐   ┌──────────┐   ┌──────────────────┐ │
│  │ Next.js  │──▶│ PHP API  │──▶│ MySQL (single DB)│ │
│  │ Frontend │   │ Backend  │   │ trevaltour_db     │ │
│  └──────────┘   └──────────┘   └──────────────────┘ │
│                      │                                │
│                      ▼                                │
│               ┌──────────────┐                       │
│               │  Duffel API  │                       │
│               │  (Flights,   │                       │
│               │   Hotels,    │                       │
│               │   Cars)      │                       │
│               └──────────────┘                       │
└─────────────────────────────────────────────────────┘
```

### 2.2 Target Architecture

```
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│travelup  │ │travelup  │ │travelup  │ │travelup  │ ... more
│   .pk    │ │   .ae    │ │   .co.uk │ │   .sa    │ domains
└────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘
     │            │            │            │
     └────────────┴─────┬──────┴────────────┘
                        │
                        ▼
          ┌──────────────────────────┐
          │   SHARED INFRASTRUCTURE  │
          │                          │
          │  Same Backend (PHP API)  │
          │  Same Database (MySQL)   │
          │  Same Duffel Integration │
          │                          │
          │  Domain-Aware Logic:     │
          │  • SEO per domain        │
          │  • Design per domain     │
          │  • Currency per domain   │
          │  • Language per domain   │
          └──────────────────────────┘
```

### 2.3 Requirements Matrix


| Requirement             | Priority      | Description                                                                  |
| ----------------------- | ------------- | ---------------------------------------------------------------------------- |
| **Shared Backend & DB** | P0 (Critical) | All domains use same PHP API, same MySQL DB, same Duffel integration         |
| **Per-Domain SEO**      | P0 (Critical) | Unique title, meta description, OG tags, structured data, sitemap per domain |
| **Per-Domain Design**   | P1 (High)     | Different theme/colors/hero images per country domain                        |
| **Per-Domain Currency** | P1 (High)     | Default currency matching country (PKR for .pk, AED for .ae, etc.)           |
| **Per-Domain Language** | P1 (High)     | Default language matching country (Urdu for .pk, Arabic for .sa, etc.)       |
| **Continuous SEO Work** | P0 (Critical) | Ability to do ongoing SEO for each domain independently                      |
| **Scalability**         | P1 (High)     | Easy to add new country domains without major code changes                   |
| **Single Admin Panel**  | P1 (High)     | Manage all domains from one admin interface                                  |
| **Booking Flow**        | P0 (Critical) | Seamless booking on any domain — no awkward redirects                        |
| **Content Management**  | P2 (Medium)   | Blog/CMS content per country for local SEO                                   |


### 2.4 Example Domains Planned


| Domain           | Country         | Currency | Language       | Flag      |
| ---------------- | --------------- | -------- | -------------- | --------- |
| traveltourup.com | Global (USA/UK) | USD/GBP  | English        | 🇺🇸/🇬🇧 |
| travelup.pk      | Pakistan        | PKR      | Urdu/English   | 🇵🇰      |
| travelup.ae      | UAE             | AED      | Arabic/English | 🇦🇪      |
| travelup.sa      | Saudi Arabia    | SAR      | Arabic         | 🇸🇦      |
| travelup.co.uk   | United Kingdom  | GBP      | English        | 🇬🇧      |
| travelup.de      | Germany         | EUR      | German         | 🇩🇪      |


---

## 3. Approach 1: WordPress Satellite Sites + Main App

### 3.1 Description

Create a **separate WordPress website** for each country domain (travelup.pk, travelup.ae, etc.). Each WordPress site functions as a **landing/marketing site** with:

- Flight search form
- Blog content for local SEO
- "My Booking" login page

When a user searches for flights, they are **redirected to traveltourup.com** (the main app) with search parameters in the URL. All booking, payment, and management happens on the main site.

### 3.2 Flow Diagram

```
User visits travelup.pk (WordPress)
         │
         ▼
┌─────────────────────────┐
│   WordPress Site (.pk)  │
│                         │
│  • SEO-optimized pages  │
│  • Blog content (Urdu)  │
│  • Flight search form   │
│  • "My Bookings" link   │
└──────────┬──────────────┘
           │ User searches flights
           │ (from, to, date, passengers)
           ▼
┌──────────────────────────────────────────┐
│  REDIRECT to traveltourup.com            │
│                                          │
│  traveltourup.com/flights/search         │
│    ?from=KHI                             │
│    &to=DXB                               │
│    &date=2026-04-15                      │
│    &passengers=2                         │
│    &source=travelup.pk                   │
│    &lang=ur                              │
│    &currency=PKR                         │
└──────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────┐
│  Main App handles:       │
│  • Flight search         │
│  • Results display       │
│  • Booking               │
│  • Payment               │
│  • Confirmation          │
└──────────────────────────┘
```

### 3.3 WordPress-to-Main-App Connection (How It Would Work)

#### Search Form in WordPress

```html
<!-- WordPress theme: flight-search-form.php -->
<form id="flight-search" action="" method="GET">
    <input type="text" name="from" placeholder="From (e.g., KHI)" required />
    <input type="text" name="to" placeholder="To (e.g., DXB)" required />
    <input type="date" name="departure_date" required />
    <input type="date" name="return_date" />
    <select name="trip_type">
        <option value="one_way">One Way</option>
        <option value="round_trip">Round Trip</option>
    </select>
    <input type="number" name="adults" value="1" min="1" max="9" />
    <input type="number" name="children" value="0" min="0" max="9" />
    <input type="number" name="infants" value="0" min="0" max="4" />
    <select name="cabin_class">
        <option value="economy">Economy</option>
        <option value="business">Business</option>
        <option value="first">First</option>
    </select>
    <button type="submit">Search Flights</button>
</form>

<script>
document.getElementById('flight-search').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const params = new URLSearchParams(formData);
    
    // Add source domain tracking
    params.append('source_domain', window.location.hostname);
    params.append('source_country', 'PK'); // Set per WordPress site
    params.append('default_currency', 'PKR');
    params.append('default_lang', 'ur');
    
    // Redirect to main application
    const mainAppUrl = 'https://traveltourup.com/flights/search';
    window.location.href = mainAppUrl + '?' + params.toString();
});
</script>
```

#### "My Bookings" Login in WordPress

```html
<!-- WordPress theme: my-bookings.php -->
<form id="booking-login" action="" method="POST">
    <input type="email" name="email" placeholder="Email" required />
    <input type="password" name="password" placeholder="Password" required />
    <button type="submit">View My Bookings</button>
</form>

<script>
document.getElementById('booking-login').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const email = this.querySelector('[name="email"]').value;
    const password = this.querySelector('[name="password"]').value;
    
    // Option A: Direct redirect to main site login
    const loginUrl = 'https://traveltourup.com/login';
    const params = new URLSearchParams({
        email: email,
        redirect: '/my-bookings',
        source: window.location.hostname
    });
    window.location.href = loginUrl + '?' + params.toString();
    
    // Note: Do NOT send password via URL params!
    // Use a POST form submission or token-based approach instead.
});
</script>
```

#### Secure Login Alternative (POST-based)

```html
<!-- WordPress: Secure login redirect via hidden form -->
<form id="secure-redirect" method="POST" action="https://traveltourup.com/api/auth/external-login">
    <input type="hidden" name="email" />
    <input type="hidden" name="password" />
    <input type="hidden" name="source_domain" />
    <input type="hidden" name="redirect_after" value="/my-bookings" />
    <input type="hidden" name="csrf_token" />
</form>

<script>
document.getElementById('booking-login').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const secureForm = document.getElementById('secure-redirect');
    secureForm.querySelector('[name="email"]').value = this.email.value;
    secureForm.querySelector('[name="password"]').value = this.password.value;
    secureForm.querySelector('[name="source_domain"]').value = window.location.hostname;
    
    // Get CSRF token from main app API
    fetch('https://traveltourup.com/api/auth/csrf-token', {
        credentials: 'include'
    })
    .then(r => r.json())
    .then(data => {
        secureForm.querySelector('[name="csrf_token"]').value = data.token;
        secureForm.submit(); // POST to main app
    });
});
</script>
```

### 3.4 Pros


| #   | Advantage                  | Detail                                                                      |
| --- | -------------------------- | --------------------------------------------------------------------------- |
| 1   | **SEO Flexibility**        | WordPress has excellent SEO plugins (Yoast, Rank Math) for per-page control |
| 2   | **Design Freedom**         | Each WordPress site can have a completely unique theme and design           |
| 3   | **Content Management**     | Non-technical staff can manage blogs, pages, and content easily             |
| 4   | **Plugin Ecosystem**       | Access to 60,000+ WordPress plugins for analytics, SEO, forms, etc.         |
| 5   | **Independent Deployment** | Each site can be updated without affecting the main booking app             |
| 6   | **Proven CMS**             | WordPress powers 43% of the web — mature, well-documented                   |
| 7   | **Local Content Teams**    | Country-specific teams can manage their own WordPress site                  |
| 8   | **Fast Initial Setup**     | Can launch a new country site quickly with a WordPress template             |


### 3.5 Cons


| #   | Disadvantage                    | Severity    | Detail                                                                                                              |
| --- | ------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------- |
| 1   | **User Experience Break**       | 🔴 Critical | Redirect from WordPress → main app is jarring. Users lose trust when the domain changes mid-booking                 |
| 2   | **Cross-Domain Session Issues** | 🔴 Critical | Cookies don't transfer across domains. Login sessions are not shared. Complex OAuth/token schemes needed            |
| 3   | **Double Infrastructure Cost**  | 🟠 High     | Each WordPress site needs its own hosting, SSL, maintenance, updates, backups                                       |
| 4   | **Security Surface**            | 🟠 High     | WordPress is the #1 target for hackers. Each site is an attack vector. Plugin vulnerabilities are constant          |
| 5   | **Maintenance Burden**          | 🟠 High     | N WordPress sites = N × (theme updates + plugin updates + PHP updates + security patches)                           |
| 6   | **Brand Inconsistency**         | 🟡 Medium   | Booking experience differs from landing page design; feels like two separate companies                              |
| 7   | **SEO Link Juice Loss**         | 🟡 Medium   | Redirecting users to a different domain loses referral signals and can confuse search engines                       |
| 8   | **Analytics Fragmentation**     | 🟡 Medium   | User journey is split across two properties; harder to track conversion funnels                                     |
| 9   | **Mobile UX Degradation**       | 🟠 High     | Cross-domain redirect on mobile is slow and breaks browser back-button behavior                                     |
| 10  | **No Booking on Satellite**     | 🟡 Medium   | Users cannot complete any booking action on the WordPress site — limits engagement                                  |
| 11  | **Duplicate Content Risk**      | 🟡 Medium   | Search form, flight info repeated across WordPress and main app — duplicate content penalties                       |
| 12  | **Password Handling Risk**      | 🔴 Critical | Sending credentials cross-domain is a significant security concern unless done very carefully (POST + HTTPS + CSRF) |


### 3.6 Verdict on Approach 1

> **⚠️ NOT RECOMMENDED as primary strategy.**  
> The cross-domain redirect creates a broken user experience, session management nightmare, and increased security attack surface. While WordPress excels at content/SEO, using it as a "search form gateway" to another application is an anti-pattern in the industry.

---

## 4. Approach 2: Unified Multi-Domain Single Codebase

### 4.1 Description

All country domains (travelup.pk, travelup.ae, etc.) point to the **exact same server** running the **same Next.js frontend and PHP backend**. The application detects the incoming domain via `$_SERVER['HTTP_HOST']` (PHP) or `req.headers.host` (Next.js) and dynamically adjusts:

- SEO meta tags
- Default language & currency
- Theme/design elements
- Content (blogs, pages)
- Popular routes & destinations

### 4.2 Architecture

```
DNS Configuration:
  travelup.pk    → A record → 123.45.67.89 (same server)
  travelup.ae    → A record → 123.45.67.89 (same server)
  travelup.co.uk → A record → 123.45.67.89 (same server)
  traveltourup.com → A record → 123.45.67.89 (same server)

                    ┌──────────────┐
                    │   Nginx /    │
                    │   Apache     │
                    │  (Reverse    │
                    │   Proxy)     │
                    └──────┬───────┘
                           │ Detects domain from Host header
                           │
                    ┌──────▼───────┐
                    │  Next.js App │ ← Domain-aware middleware
                    │  (Frontend)  │   sets locale, currency,
                    │              │   SEO, theme per domain
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │   PHP API    │ ← Domain-aware: reads
                    │   Backend    │   domain_settings table
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │    MySQL     │
                    │   Database   │
                    │              │
                    │ Tables:      │
                    │ • domain_settings │
                    │ • domain_seo │
                    │ • domain_content │
                    │ • bookings   │ (shared across all)
                    │ • users      │ (shared across all)
                    └──────────────┘
```

### 4.3 How Domain Detection Works

#### Next.js Middleware (Frontend)

```javascript
// middleware.js (Next.js)
import { NextResponse } from 'next/server';

const DOMAIN_CONFIG = {
    'travelup.pk': {
        country: 'PK',
        currency: 'PKR',
        language: 'ur',
        locale: 'ur-PK',
        direction: 'rtl'
    },
    'travelup.ae': {
        country: 'AE',
        currency: 'AED',
        language: 'ar',
        locale: 'ar-AE',
        direction: 'rtl'
    },
    'travelup.co.uk': {
        country: 'GB',
        currency: 'GBP',
        language: 'en',
        locale: 'en-GB',
        direction: 'ltr'
    },
    'traveltourup.com': {
        country: 'US',
        currency: 'USD',
        language: 'en',
        locale: 'en-US',
        direction: 'ltr'
    }
};

export function middleware(request) {
    const hostname = request.headers.get('host') || '';
    const domain = hostname.replace(/^www\./, '').split(':')[0];
    
    const config = DOMAIN_CONFIG[domain] || DOMAIN_CONFIG['traveltourup.com'];
    
    const response = NextResponse.next();
    
    // Pass domain config to the app via headers
    response.headers.set('x-domain', domain);
    response.headers.set('x-country', config.country);
    response.headers.set('x-currency', config.currency);
    response.headers.set('x-language', config.language);
    response.headers.set('x-locale', config.locale);
    response.headers.set('x-direction', config.direction);
    
    return response;
}
```

#### PHP Backend Domain Detection

```php
// _domain.php (included in _config.php)
function getDomainConfig() {
    $host = $_SERVER['HTTP_HOST'] ?? 'traveltourup.com';
    $host = preg_replace('/^www\./', '', $host);
    $host = strtok($host, ':'); // Remove port
    
    // Fetch from database
    global $db;
    $config = $db->get('domain_settings', '*', ['domain' => $host]);
    
    if (!$config) {
        // Fallback to default
        $config = $db->get('domain_settings', '*', ['is_default' => 1]);
    }
    
    return $config;
}
```

### 4.4 Pros


| #   | Advantage               | Detail                                                           |
| --- | ----------------------- | ---------------------------------------------------------------- |
| 1   | **Seamless UX**         | User stays on the same domain throughout the entire booking flow |
| 2   | **Single Codebase**     | One frontend, one backend, one deployment — maximum efficiency   |
| 3   | **Shared Sessions**     | Login works across all pages; no cross-domain session issues     |
| 4   | **Lower Cost**          | One server, one SSL wildcard cert, one deployment pipeline       |
| 5   | **Consistent Branding** | Same UI components with configurable themes — professional feel  |
| 6   | **Easy to Scale**       | Adding a new country = adding a DB row + DNS record              |
| 7   | **Unified Analytics**   | One Google Analytics property with domain as dimension           |
| 8   | **Single Admin Panel**  | Manage all domains, SEO, designs from one admin interface        |
| 9   | **No Redirect Penalty** | No cross-domain redirects = faster, better for SEO and UX        |


### 4.5 Cons


| #   | Disadvantage                | Severity  | Detail                                                                                                       |
| --- | --------------------------- | --------- | ------------------------------------------------------------------------------------------------------------ |
| 1   | **SEO Complexity**          | 🟡 Medium | Need careful per-domain meta management, hreflang tags, separate sitemaps — achievable but requires planning |
| 2   | **Design Limitations**      | 🟡 Medium | Design customization is theme-based (colors, logos, images) not fully independent layouts per domain         |
| 3   | **Single Point of Failure** | 🟡 Medium | If the server goes down, ALL domains go down (mitigated with CDN/load balancing)                             |
| 4   | **Complex Middleware**      | 🟡 Medium | Domain detection logic adds complexity to every request                                                      |
| 5   | **Content Management**      | 🟡 Medium | Need to build CMS features for per-domain blog/content — no WordPress CMS ease                               |
| 6   | **Testing Overhead**        | 🟡 Medium | Need to test every feature across all domain configurations                                                  |


### 4.6 Verdict on Approach 2

> **✅ STRONGLY RECOMMENDED — Best balance of all requirements.**  
> This is the industry standard used by Booking.com, Skyscanner, Kayak, and most major OTAs. It provides the best user experience, easiest maintenance, and strongest SEO when properly implemented.

---

## 5. Approach 3: Headless Multi-Tenant with Next.js (INDUSTRY BEST PRACTICE)

### 5.1 Description

An **enhanced version of Approach 2** that leverages Next.js advanced features for maximum SEO performance. Uses Next.js as a **headless frontend** with:

- **Server-Side Rendering (SSR)** for SEO-critical pages
- **Static Site Generation (SSG)** for blog/content pages
- **Domain-Based Routing** via Next.js middleware
- **Headless CMS** (optional: Strapi, WordPress as headless, or custom) for content

This is how **Skyscanner, Kayak, Wego, Momondo, and Kiwi.com** handle multi-country domains.

### 5.2 Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     CDN (Cloudflare/Vercel)                   │
│  SSL termination, caching, DDoS protection, edge functions   │
└──────────────────────────┬───────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
    ┌─────▼─────┐   ┌─────▼─────┐   ┌─────▼─────┐
    │travelup.pk│   │travelup.ae│   │travelup   │ ... all point
    │  (DNS)    │   │  (DNS)    │   │  .co.uk   │     to same
    └─────┬─────┘   └─────┬─────┘   └─────┬─────┘     origin
          │               │               │
          └───────────────┬┘───────────────┘
                          │
                   ┌──────▼───────┐
                   │  Next.js     │
                   │  App Server  │  ← Domain-aware middleware
                   │              │  ← SSR for search/booking
                   │  Features:   │  ← SSG for blog/content
                   │  • i18n      │  ← Dynamic meta tags
                   │  • Themes    │  ← Per-domain themes
                   │  • SEO       │  ← Per-domain sitemaps
                   └──────┬───────┘
                          │
                   ┌──────▼───────┐
                   │  PHP API     │  ← Domain-aware API
                   │  Backend     │  ← Shared business logic
                   │              │  ← Duffel integration
                   └──────┬───────┘
                          │
                   ┌──────▼───────┐
                   │   MySQL DB   │  ← Single shared database
                   │  + Redis     │  ← Caching layer
                   └──────────────┘
```

### 5.3 Next.js Implementation Details

#### Domain-Aware Layout

```jsx
// app/layout.jsx
import { headers } from 'next/headers';
import { getDomainConfig } from '@/config/domains';

export async function generateMetadata() {
    const headersList = headers();
    const domain = headersList.get('host')?.replace(/^www\./, '') || 'traveltourup.com';
    const config = await getDomainConfig(domain);
    
    return {
        title: config.seo.title,
        description: config.seo.description,
        openGraph: {
            title: config.seo.og_title,
            description: config.seo.og_description,
            images: [config.seo.og_image],
            locale: config.locale,
            siteName: config.site_name,
        },
        alternates: {
            canonical: `https://${domain}`,
            languages: config.hreflang_tags,
        },
        other: {
            'geo.region': config.country,
            'geo.placename': config.country_name,
        }
    };
}

export default async function RootLayout({ children }) {
    const headersList = headers();
    const domain = headersList.get('host')?.replace(/^www\./, '') || 'traveltourup.com';
    const config = await getDomainConfig(domain);
    
    return (
        <html lang={config.language} dir={config.direction}>
            <head>
                {/* Per-domain structured data */}
                <script type="application/ld+json">
                    {JSON.stringify(config.structured_data)}
                </script>
                {/* hreflang tags for all country variants */}
                {config.hreflang_tags.map(tag => (
                    <link key={tag.lang} rel="alternate" 
                          hrefLang={tag.lang} href={tag.url} />
                ))}
            </head>
            <body className={config.theme_class}>
                <DomainProvider config={config}>
                    <Navbar config={config} />
                    {children}
                    <Footer config={config} />
                </DomainProvider>
            </body>
        </html>
    );
}
```

#### Per-Domain SEO for Pages

```jsx
// app/flights/search/page.jsx
import { headers } from 'next/headers';
import { getDomainConfig } from '@/config/domains';

export async function generateMetadata() {
    const headersList = headers();
    const domain = headersList.get('host')?.replace(/^www\./, '');
    const config = await getDomainConfig(domain);
    
    // Country-specific SEO for flight search page
    return {
        title: `${config.translations.search_flights} | ${config.site_name}`,
        description: config.seo.pages.flight_search.description,
        keywords: config.seo.pages.flight_search.keywords,
        openGraph: {
            title: config.seo.pages.flight_search.og_title,
            description: config.seo.pages.flight_search.og_description,
            url: `https://${domain}/flights/search`,
        }
    };
}
```

#### Per-Domain Sitemap

```jsx
// app/sitemap.js (Next.js dynamic sitemap)
import { getDomainConfig, getAllDomains } from '@/config/domains';

export default async function sitemap() {
    const host = headers().get('host')?.replace(/^www\./, '');
    const config = await getDomainConfig(host);
    
    const staticPages = [
        { url: `https://${host}`, lastModified: new Date(), priority: 1.0 },
        { url: `https://${host}/flights/search`, lastModified: new Date(), priority: 0.9 },
        { url: `https://${host}/hotels/search`, lastModified: new Date(), priority: 0.9 },
        { url: `https://${host}/cars/search`, lastModified: new Date(), priority: 0.8 },
        { url: `https://${host}/about`, lastModified: new Date(), priority: 0.5 },
        { url: `https://${host}/contact`, lastModified: new Date(), priority: 0.5 },
    ];
    
    // Add country-specific popular route pages
    const popularRoutes = await getPopularRoutes(config.country);
    const routePages = popularRoutes.map(route => ({
        url: `https://${host}/flights/${route.from}-to-${route.to}`,
        lastModified: new Date(),
        priority: 0.7,
    }));
    
    // Add blog posts for this domain
    const blogs = await getDomainBlogs(host);
    const blogPages = blogs.map(blog => ({
        url: `https://${host}/blog/${blog.slug}`,
        lastModified: blog.updated_at,
        priority: 0.6,
    }));
    
    return [...staticPages, ...routePages, ...blogPages];
}
```

### 5.4 Pros


| #   | Advantage                | Detail                                                                                                      |
| --- | ------------------------ | ----------------------------------------------------------------------------------------------------------- |
| 1   | **Best SEO Performance** | SSR + SSG = perfect Lighthouse scores, instant indexing. Next.js generateMetadata is purpose-built for this |
| 2   | **Industry Standard**    | Exact approach used by Skyscanner, Kayak, Wego, Momondo for multi-country sites                             |
| 3   | **Perfect UX**           | No redirects, fast page loads, SPA-like navigation, consistent design                                       |
| 4   | **Single Codebase**      | One deployment, one repository, domain-aware configuration                                                  |
| 5   | **Edge Rendering**       | Deploy to Vercel/Cloudflare for per-region edge rendering — faster for all countries                        |
| 6   | **Built-in i18n**        | Next.js has native internationalization support                                                             |
| 7   | **Dynamic Sitemaps**     | Generate per-domain sitemaps automatically                                                                  |
| 8   | **hreflang Support**     | Properly link all country variants for Google                                                               |
| 9   | **Theme System**         | CSS variables + Tailwind config per domain = fully customizable look                                        |
| 10  | **Shared Auth**          | Single session, single login — works across all routes on same domain                                       |


### 5.5 Cons


| #   | Disadvantage              | Severity  | Detail                                                                                                                   |
| --- | ------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Higher Dev Complexity** | 🟡 Medium | Requires careful domain-aware middleware and configuration management                                                    |
| 2   | **No Visual CMS**         | 🟡 Medium | Content editors need a CMS tool or admin panel to manage per-domain content (solvable with headless CMS or custom admin) |
| 3   | **Testing Matrix**        | 🟡 Medium | Need to test features across all domain configurations                                                                   |
| 4   | **Initial Setup Time**    | 🟡 Medium | More upfront work than WordPress but pays off in long term                                                               |


### 5.6 Verdict on Approach 3

> **✅ MOST RECOMMENDED — Industry best practice for travel companies.**  
> This is the gold standard. Your existing Next.js frontend already supports this pattern. Adding domain-awareness is a natural extension of the current architecture.

---

## 6. Approach 4: Hybrid — WordPress for Content + API-Driven Booking

### 6.1 Description

Use **WordPress as a headless CMS** (content only) while the **Next.js app handles all rendering and booking**. WordPress provides:

- Blog post management per country
- Page content management
- SEO plugin interface (Yoast/Rank Math)

But there's **NO separate WordPress website** visible to users. Next.js fetches content from WordPress REST API and renders it within the unified design.

### 6.2 Architecture

```
┌─────────────────────────────────────────────────┐
│              User visits travelup.pk             │
└───────────────────┬─────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│            Next.js App (Frontend)                │
│                                                  │
│  Domain Detection → Theme + SEO + Language       │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │ Flights  │  │  Hotels  │  │  Content  │      │
│  │ Search & │  │  Search &│  │  Pages &  │      │
│  │ Booking  │  │  Booking │  │  Blogs    │      │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘      │
│       │              │              │            │
└───────┼──────────────┼──────────────┼────────────┘
        │              │              │
        ▼              ▼              ▼
┌──────────────┐  ┌──────────┐ ┌──────────────┐
│  PHP API     │  │PHP API   │ │WordPress     │
│  (Flights,   │  │(Hotels,  │ │REST API      │
│   Bookings)  │  │ Cars)    │ │(Content Only)│
│              │  │          │ │              │
│  ┌─────────┐│  │┌────────┐│ │ • Blog posts │
│  │ Duffel  ││  ││Duffel  ││ │ • Pages      │
│  │ API     ││  ││API     ││ │ • Categories │
│  └─────────┘│  │└────────┘│ │ • SEO meta   │
└──────┬───────┘  └────┬─────┘ └──────┬───────┘
       │               │              │
       └───────────────┬┘──────────────┘
                       │
                ┌──────▼──────┐
                │   MySQL DB  │  ← Shared database
                │ (single)    │  ← WordPress tables
                │             │  ← App tables
                └─────────────┘
```

### 6.3 Pros


| #   | Advantage               | Detail                                                                 |
| --- | ----------------------- | ---------------------------------------------------------------------- |
| 1   | **Best of Both Worlds** | WordPress CMS ease for content + Next.js performance for booking       |
| 2   | **SEO Plugins**         | Use Yoast/Rank Math for content SEO management (familiar to SEO teams) |
| 3   | **Content Workflow**    | Non-technical staff manage blogs in WordPress admin                    |
| 4   | **Unified Frontend**    | Users see ONE consistent site — no redirects                           |
| 5   | **Scalable Content**    | WordPress handles content complexity; Next.js handles app complexity   |


### 6.4 Cons


| #   | Disadvantage           | Severity  | Detail                                                                                        |
| --- | ---------------------- | --------- | --------------------------------------------------------------------------------------------- |
| 1   | **Two Systems**        | 🟡 Medium | Need to maintain WordPress + Next.js + PHP backend — three components                         |
| 2   | **WordPress Security** | 🟡 Medium | WordPress still needs updates/security (but less exposed since it's headless)                 |
| 3   | **API Latency**        | 🟡 Medium | Fetching content from WordPress API adds latency to page renders (mitigated with caching/SSG) |
| 4   | **Complexity**         | 🟡 Medium | More moving parts to coordinate                                                               |
| 5   | **WordPress Hosting**  | 🟢 Low    | Still need to host WordPress somewhere (but single instance, not per-domain)                  |


### 6.5 Verdict on Approach 4

> **✅ GOOD OPTION if content marketing is a major priority.**  
> Use this if your SEO strategy heavily relies on blogging, guides, and content marketing per country and you want non-technical content teams to use a familiar CMS. Otherwise, Approach 3 is simpler and sufficient.

---

## 7. Comparison Matrix

### 7.1 Feature Comparison


| Feature                | Approach 1 (WP Satellite) | Approach 2 (Unified Codebase) | Approach 3 (Headless Multi-Tenant) | Approach 4 (Hybrid)  |
| ---------------------- | ------------------------- | ----------------------------- | ---------------------------------- | -------------------- |
| **User Experience**    | ❌ Poor (redirects)        | ✅ Excellent                   | ✅ Excellent                        | ✅ Excellent          |
| **SEO Control**        | ✅ Great (Yoast)           | ✅ Good (needs custom)         | ✅ Excellent (SSR+SSG)              | ✅ Excellent          |
| **Per-Domain Design**  | ✅ Full freedom            | ✅ Theme-based                 | ✅ Theme-based + SSR                | ✅ Theme-based        |
| **Single Backend/DB**  | ✅ Yes                     | ✅ Yes                         | ✅ Yes                              | ✅ Yes                |
| **Session Management** | ❌ Broken cross-domain     | ✅ Seamless                    | ✅ Seamless                         | ✅ Seamless           |
| **Development Cost**   | 🟡 Medium per site        | 🟢 Low (one codebase)         | 🟡 Medium (initial)                | 🟡 Medium-High       |
| **Maintenance Cost**   | ❌ High (N sites)          | 🟢 Low                        | 🟢 Low                             | 🟡 Medium            |
| **Security**           | ❌ High risk (N WP sites)  | ✅ Good                        | ✅ Good                             | ✅ Good               |
| **Scalability**        | ❌ Linear cost per domain  | ✅ Minimal per domain          | ✅ Minimal per domain               | ✅ Good               |
| **Content Management** | ✅ WordPress CMS           | 🟡 Needs custom CMS           | 🟡 Needs custom CMS                | ✅ WordPress headless |
| **Analytics**          | ❌ Fragmented              | ✅ Unified                     | ✅ Unified                          | ✅ Unified            |
| **Time to Launch**     | 🟡 Moderate               | 🟢 Fast after initial         | 🟢 Fast after initial              | 🟡 Moderate          |
| **Industry Usage**     | ❌ Not standard            | ✅ Common                      | ✅ Industry standard                | ✅ Growing trend      |


### 7.2 Cost Comparison (5 Country Domains Over 1 Year)


| Cost Item               | Approach 1                | Approach 2              | Approach 3             | Approach 4               |
| ----------------------- | ------------------------- | ----------------------- | ---------------------- | ------------------------ |
| **Initial Development** | $8K-15K                   | $5K-10K                 | $8K-15K                | $12K-20K                 |
| **Per-Domain Setup**    | $2K-4K × 5 = $10K-20K     | $200-500 × 5 = $1K-2.5K | $500-1K × 5 = $2.5K-5K | $500-1K × 5 = $2.5K-5K   |
| **Annual Hosting**      | $600-1200 × 5 = $3K-6K    | $600-1800 (one server)  | $600-1800 (one server) | $1200-2400 (server + WP) |
| **SSL Certificates**    | $0-50 × 5 (Let's Encrypt) | $0-50 (wildcard)        | $0-50 (wildcard)       | $0-100                   |
| **Annual Maintenance**  | $3K-6K (5 WP sites)       | $1K-2K                  | $1K-2K                 | $2K-3K                   |
| **SEO Tools**           | $500/yr × 5 = $2.5K       | $500/yr (one)           | $500/yr (one)          | $500/yr (one)            |
| **TOTAL YEAR 1**        | **$26.5K-47K**            | **$8.3K-16.3K**         | **$12.6K-23.8K**       | **$18.7K-30.5K**         |
| **TOTAL YEAR 2+**       | **$9K-13.5K/yr**          | **$2.1K-5.3K/yr**       | **$2.1K-5.3K/yr**      | **$3.7K-5.5K/yr**        |


### 7.3 Industry Examples


| Company         | Approach Used | Notes                                                           |
| --------------- | ------------- | --------------------------------------------------------------- |
| **Booking.com** | Approach 3    | Single codebase, domain-based locale detection, per-country SEO |
| **Skyscanner**  | Approach 3    | skyscanner.co.uk, skyscanner.com.pk — same app, domain-aware    |
| **Kayak**       | Approach 3    | kayak.com, kayak.co.uk — Next.js-like SPA with SSR              |
| **Wego**        | Approach 3    | wego.pk, wego.ae — unified frontend, multi-domain               |
| **Expedia**     | Approach 2/3  | expedia.com, expedia.co.uk — unified with locale routing        |
| **Airbnb**      | Approach 2    | Single domain with locale paths (airbnb.com/en-PK)              |
| **TripAdvisor** | Approach 3    | tripadvisor.pk, tripadvisor.ae — domain-based                   |
| **Agoda**       | Approach 3    | agoda.com with locale — unified rendering                       |


---

## 8. RECOMMENDED APPROACH: Detailed Implementation Plan

### 8.1 Final Recommendation

> ### **Approach 3: Headless Multi-Tenant with Next.js**
>
> **With optional elements from Approach 4** (headless WordPress for blog content) if content marketing is a priority.
>
> This approach provides:
>
> - Best SEO (SSR + dynamic per-domain meta)
> - Best UX (no redirects, fast, consistent)
> - Lowest long-term cost
> - Easiest to scale to new countries
> - Industry-proven by major OTAs

### 8.2 Implementation Overview

```
Phase 1: Domain Configuration System     (Week 1-2)
Phase 2: Backend Multi-Domain Support     (Week 2-3)
Phase 3: Frontend Domain-Aware Rendering  (Week 3-5)
Phase 4: Per-Domain SEO Engine            (Week 4-6)
Phase 5: Per-Domain Theming & Design      (Week 5-7)
Phase 6: Content Management Per Domain    (Week 6-8)
Phase 7: DNS, SSL & Deployment            (Week 8-9)
Phase 8: Testing & QA                     (Week 9-10)
Phase 9: Launch & SEO Submission          (Week 10-11)
```

### 8.3 Phase 1: Domain Configuration System (Week 1-2)

#### Database Schema

```sql
-- ============================================
-- CORE: Domain Settings Table
-- ============================================
CREATE TABLE `domain_settings` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `domain` VARCHAR(255) NOT NULL UNIQUE,
    `country_code` CHAR(2) NOT NULL,          -- ISO 3166-1 alpha-2 (PK, AE, GB)
    `country_name` VARCHAR(100) NOT NULL,      -- "Pakistan", "UAE", "United Kingdom"
    `site_name` VARCHAR(255) NOT NULL,         -- "TravelUp Pakistan"
    `site_tagline` VARCHAR(500),               -- "Book Cheap Flights from Pakistan"
    `default_language` VARCHAR(5) NOT NULL,     -- "ur", "ar", "en"
    `default_currency` VARCHAR(3) NOT NULL,     -- "PKR", "AED", "GBP"
    `supported_languages` JSON,                 -- ["ur","en"] 
    `supported_currencies` JSON,                -- ["PKR","USD"]
    `timezone` VARCHAR(50),                     -- "Asia/Karachi"
    `direction` ENUM('ltr', 'rtl') DEFAULT 'ltr',
    `is_default` TINYINT(1) DEFAULT 0,
    `is_active` TINYINT(1) DEFAULT 1,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_domain` (`domain`),
    INDEX `idx_country` (`country_code`),
    INDEX `idx_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- SEO: Per-Domain SEO Settings
-- ============================================
CREATE TABLE `domain_seo` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `domain_id` INT NOT NULL,
    `page_key` VARCHAR(100) NOT NULL,          -- "home", "flight_search", "hotel_search", etc.
    `title` VARCHAR(255),
    `meta_description` TEXT,
    `meta_keywords` TEXT,
    `og_title` VARCHAR(255),
    `og_description` TEXT,
    `og_image` VARCHAR(500),
    `canonical_url` VARCHAR(500),
    `robots` VARCHAR(100) DEFAULT 'index, follow',
    `structured_data` JSON,                     -- JSON-LD schema
    `custom_head_tags` TEXT,                    -- Additional <head> tags
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`domain_id`) REFERENCES `domain_settings`(`id`) ON DELETE CASCADE,
    UNIQUE KEY `uk_domain_page` (`domain_id`, `page_key`),
    INDEX `idx_page_key` (`page_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- THEME: Per-Domain Design/Theme Settings
-- ============================================
CREATE TABLE `domain_themes` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `domain_id` INT NOT NULL,
    `primary_color` VARCHAR(7) DEFAULT '#0066FF',
    `secondary_color` VARCHAR(7) DEFAULT '#FF6600',
    `accent_color` VARCHAR(7) DEFAULT '#00CC66',
    `background_color` VARCHAR(7) DEFAULT '#FFFFFF',
    `text_color` VARCHAR(7) DEFAULT '#333333',
    `logo_url` VARCHAR(500),
    `favicon_url` VARCHAR(500),
    `hero_image_url` VARCHAR(500),
    `hero_title` VARCHAR(255),
    `hero_subtitle` VARCHAR(500),
    `font_family` VARCHAR(100) DEFAULT 'Inter',
    `custom_css` TEXT,                          -- Per-domain custom CSS overrides
    `navbar_style` ENUM('light','dark','transparent') DEFAULT 'light',
    `footer_style` ENUM('light','dark') DEFAULT 'dark',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`domain_id`) REFERENCES `domain_settings`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- CONTENT: Per-Domain Content & Pages
-- ============================================
CREATE TABLE `domain_content` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `domain_id` INT NOT NULL,
    `content_type` ENUM('page','blog','faq','announcement') NOT NULL,
    `slug` VARCHAR(255) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `content` LONGTEXT,
    `excerpt` TEXT,
    `featured_image` VARCHAR(500),
    `author` VARCHAR(100),
    `language` VARCHAR(5),
    `status` ENUM('draft','published','archived') DEFAULT 'draft',
    `seo_title` VARCHAR(255),
    `seo_description` TEXT,
    `published_at` TIMESTAMP NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`domain_id`) REFERENCES `domain_settings`(`id`) ON DELETE CASCADE,
    UNIQUE KEY `uk_domain_slug` (`domain_id`, `slug`, `language`),
    INDEX `idx_status` (`status`),
    INDEX `idx_type` (`content_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- POPULAR ROUTES: Per-Country Popular Routes (for SEO pages)
-- ============================================
CREATE TABLE `domain_popular_routes` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `domain_id` INT NOT NULL,
    `origin_code` VARCHAR(3) NOT NULL,          -- IATA code (KHI, LHE, ISB)
    `origin_name` VARCHAR(100) NOT NULL,        -- "Karachi"
    `destination_code` VARCHAR(3) NOT NULL,     -- IATA code (DXB, JED, LHR)
    `destination_name` VARCHAR(100) NOT NULL,   -- "Dubai"
    `slug` VARCHAR(255),                        -- "karachi-to-dubai-flights"
    `seo_title` VARCHAR(255),
    `seo_description` TEXT,
    `typical_price` DECIMAL(10,2),
    `currency` VARCHAR(3),
    `display_order` INT DEFAULT 0,
    `is_active` TINYINT(1) DEFAULT 1,
    FOREIGN KEY (`domain_id`) REFERENCES `domain_settings`(`id`) ON DELETE CASCADE,
    INDEX `idx_route` (`origin_code`, `destination_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- HREFLANG: Cross-Domain Language Linking
-- ============================================
CREATE TABLE `domain_hreflang` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `page_path` VARCHAR(500) NOT NULL,          -- "/flights/search"
    `domain_id` INT NOT NULL,
    `hreflang` VARCHAR(10) NOT NULL,            -- "en-PK", "ur-PK", "ar-AE"
    `url` VARCHAR(500) NOT NULL,                -- "https://travelup.pk/flights/search"
    FOREIGN KEY (`domain_id`) REFERENCES `domain_settings`(`id`) ON DELETE CASCADE,
    INDEX `idx_path` (`page_path`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- SAMPLE DATA
-- ============================================

-- Default domain (main site)
INSERT INTO `domain_settings` 
(`domain`, `country_code`, `country_name`, `site_name`, `site_tagline`, 
 `default_language`, `default_currency`, `supported_languages`, `supported_currencies`,
 `timezone`, `direction`, `is_default`) 
VALUES
('traveltourup.com', 'US', 'United States', 'TravelTourUp', 
 'Book Flights, Hotels & Cars Worldwide',
 'en', 'USD', '["en"]', '["USD","GBP","EUR"]',
 'America/New_York', 'ltr', 1),

('travelup.pk', 'PK', 'Pakistan', 'TravelUp Pakistan', 
 'Book Cheap Flights from Pakistan - Best Deals on Hotels & Cars',
 'ur', 'PKR', '["ur","en"]', '["PKR","USD"]',
 'Asia/Karachi', 'rtl', 0),

('travelup.ae', 'AE', 'United Arab Emirates', 'TravelUp UAE', 
 'Book Flights & Hotels from UAE - Best Travel Deals',
 'ar', 'AED', '["ar","en"]', '["AED","USD"]',
 'Asia/Dubai', 'rtl', 0),

('travelup.sa', 'SA', 'Saudi Arabia', 'TravelUp Saudi Arabia', 
 'Book Flights & Hotels from Saudi Arabia',
 'ar', 'SAR', '["ar","en"]', '["SAR","USD"]',
 'Asia/Riyadh', 'rtl', 0),

('travelup.co.uk', 'GB', 'United Kingdom', 'TravelUp UK', 
 'Book Cheap Flights & Hotels from the UK',
 'en', 'GBP', '["en"]', '["GBP","EUR","USD"]',
 'Europe/London', 'ltr', 0);

-- SEO for Pakistan domain
INSERT INTO `domain_seo` 
(`domain_id`, `page_key`, `title`, `meta_description`, `og_title`, `og_description`) 
VALUES
(2, 'home', 
 'TravelUp Pakistan - سستی پروازیں اور ہوٹل بک کریں',
 'پاکستان سے سستی پروازیں بک کریں۔ دبئی، لندن، استنبول اور دنیا بھر میں بہترین ڈیلز۔ ہوٹل اور گاڑیاں بھی بک کریں۔',
 'TravelUp Pakistan - Book Cheap Flights',
 'Best flight deals from Pakistan to worldwide destinations'),

(2, 'flight_search',
 'Search Flights from Pakistan - Cheap Air Tickets | TravelUp.pk',
 'Search and compare cheap flights from Pakistan. Find best deals on air tickets from Karachi, Lahore, Islamabad to Dubai, London, Istanbul and more.',
 'Search Flights from Pakistan',
 'Compare and book cheap flights from Pakistan'),

(2, 'hotel_search',
 'Book Hotels in Pakistan & Worldwide | TravelUp.pk',
 'Find and book best hotel deals in Pakistan and worldwide. Compare prices from top hotels in Karachi, Lahore, Islamabad, Dubai, London.',
 'Book Hotels - TravelUp Pakistan',
 'Best hotel deals in Pakistan and worldwide');

-- Theme for Pakistan domain
INSERT INTO `domain_themes`
(`domain_id`, `primary_color`, `secondary_color`, `logo_url`, `hero_title`, `hero_subtitle`)
VALUES
(2, '#006600', '#FFFFFF', '/assets/img/logos/travelup-pk.svg',
 'سستی پروازیں بک کریں', 'پاکستان سے دنیا بھر میں بہترین ڈیلز');

-- Popular routes for Pakistan
INSERT INTO `domain_popular_routes`
(`domain_id`, `origin_code`, `origin_name`, `destination_code`, `destination_name`, 
 `slug`, `seo_title`, `seo_description`, `typical_price`, `currency`, `display_order`)
VALUES
(2, 'KHI', 'Karachi', 'DXB', 'Dubai', 'karachi-to-dubai-flights',
 'Cheap Flights from Karachi to Dubai | TravelUp.pk',
 'Find cheapest flights from Karachi to Dubai. Compare prices from PIA, Emirates, flydubai and more.',
 45000, 'PKR', 1),
(2, 'LHE', 'Lahore', 'JED', 'Jeddah', 'lahore-to-jeddah-flights',
 'Cheap Flights from Lahore to Jeddah | TravelUp.pk',
 'Book cheap flights from Lahore to Jeddah for Umrah and Hajj. Best deals on Saudi Arabia flights.',
 85000, 'PKR', 2),
(2, 'ISB', 'Islamabad', 'LHR', 'London', 'islamabad-to-london-flights',
 'Cheap Flights from Islamabad to London | TravelUp.pk',
 'Find cheapest flights from Islamabad to London Heathrow. Compare PIA, British Airways, Turkish Airlines.',
 150000, 'PKR', 3);
```

### 8.4 Phase 2: Backend Multi-Domain Support (Week 2-3)

#### Core Domain Service (PHP)

```php
<?php
// services/DomainService.php

class DomainService {
    
    private $db;
    private $config;
    private $domain;
    
    public function __construct($db) {
        $this->db = $db;
        $this->domain = $this->detectDomain();
        $this->config = $this->loadDomainConfig();
    }
    
    /**
     * Detect current domain from HTTP_HOST
     */
    private function detectDomain() {
        $host = $_SERVER['HTTP_HOST'] ?? 'traveltourup.com';
        // Remove www prefix and port
        $host = preg_replace('/^www\./', '', $host);
        $host = strtok($host, ':');
        return strtolower($host);
    }
    
    /**
     * Load domain configuration from database (cached)
     */
    private function loadDomainConfig() {
        $cacheKey = 'domain_config_' . $this->domain;
        
        // Check cache first (file-based or Redis)
        $cached = $this->getCache($cacheKey);
        if ($cached) return $cached;
        
        // Load from database
        $config = $this->db->get('domain_settings', '*', [
            'domain' => $this->domain,
            'is_active' => 1
        ]);
        
        if (!$config) {
            // Fallback to default domain
            $config = $this->db->get('domain_settings', '*', [
                'is_default' => 1
            ]);
        }
        
        // Load SEO settings
        $config['seo'] = $this->db->select('domain_seo', '*', [
            'domain_id' => $config['id']
        ]);
        
        // Load theme settings
        $config['theme'] = $this->db->get('domain_themes', '*', [
            'domain_id' => $config['id']
        ]);
        
        // Load popular routes
        $config['popular_routes'] = $this->db->select('domain_popular_routes', '*', [
            'domain_id' => $config['id'],
            'is_active' => 1,
            'ORDER' => ['display_order' => 'ASC']
        ]);
        
        // Cache for 5 minutes
        $this->setCache($cacheKey, $config, 300);
        
        return $config;
    }
    
    /**
     * Get current domain configuration
     */
    public function getConfig() {
        return $this->config;
    }
    
    /**
     * Get SEO data for a specific page
     */
    public function getPageSEO($pageKey) {
        foreach ($this->config['seo'] as $seo) {
            if ($seo['page_key'] === $pageKey) {
                return $seo;
            }
        }
        return null;
    }
    
    /**
     * Get default currency for current domain
     */
    public function getDefaultCurrency() {
        return $this->config['default_currency'];
    }
    
    /**
     * Get default language for current domain
     */
    public function getDefaultLanguage() {
        return $this->config['default_language'];
    }
    
    /**
     * Get country code for current domain
     */
    public function getCountryCode() {
        return $this->config['country_code'];
    }
    
    /**
     * Get all active domains (for hreflang generation)
     */
    public function getAllDomains() {
        return $this->db->select('domain_settings', '*', [
            'is_active' => 1,
            'ORDER' => ['is_default' => 'DESC']
        ]);
    }
    
    /**
     * Generate hreflang tags for a given page path
     */
    public function getHreflangTags($pagePath) {
        $domains = $this->getAllDomains();
        $tags = [];
        
        foreach ($domains as $d) {
            $languages = json_decode($d['supported_languages'], true);
            foreach ($languages as $lang) {
                $tags[] = [
                    'hreflang' => $lang . '-' . $d['country_code'],
                    'href' => 'https://' . $d['domain'] . $pagePath
                ];
            }
        }
        
        // Add x-default (main site)
        $tags[] = [
            'hreflang' => 'x-default',
            'href' => 'https://traveltourup.com' . $pagePath
        ];
        
        return $tags;
    }
    
    // Simple file cache methods
    private function getCache($key) {
        $file = __DIR__ . '/../cache/' . md5($key) . '.cache';
        if (file_exists($file) && (time() - filemtime($file)) < 300) {
            return json_decode(file_get_contents($file), true);
        }
        return null;
    }
    
    private function setCache($key, $data, $ttl) {
        $file = __DIR__ . '/../cache/' . md5($key) . '.cache';
        file_put_contents($file, json_encode($data));
    }
}
```

#### API Endpoint for Domain Config

```php
<?php
// api/routes/Domain.php

$app->group('/domain', function() use ($app, $db) {
    
    /**
     * GET /api/domain/config
     * Returns current domain configuration for the frontend
     */
    $app->get('/config', function() use ($db) {
        $domainService = new DomainService($db);
        $config = $domainService->getConfig();
        
        // Return sanitized config (exclude internal fields)
        echo json_encode([
            'success' => true,
            'data' => [
                'domain' => $config['domain'],
                'country_code' => $config['country_code'],
                'country_name' => $config['country_name'],
                'site_name' => $config['site_name'],
                'site_tagline' => $config['site_tagline'],
                'default_language' => $config['default_language'],
                'default_currency' => $config['default_currency'],
                'supported_languages' => json_decode($config['supported_languages']),
                'supported_currencies' => json_decode($config['supported_currencies']),
                'timezone' => $config['timezone'],
                'direction' => $config['direction'],
                'theme' => $config['theme'],
                'popular_routes' => $config['popular_routes'],
            ]
        ]);
    });
    
    /**
     * GET /api/domain/seo/:page_key
     * Returns SEO data for a specific page  
     */
    $app->get('/seo/:page_key', function($pageKey) use ($db) {
        $domainService = new DomainService($db);
        $seo = $domainService->getPageSEO($pageKey);
        $hreflang = $domainService->getHreflangTags('/' . str_replace('_', '/', $pageKey));
        
        echo json_encode([
            'success' => true,
            'data' => [
                'seo' => $seo,
                'hreflang' => $hreflang
            ]
        ]);
    });
    
    /**
     * GET /api/domain/sitemap
     * Returns sitemap data for current domain
     */
    $app->get('/sitemap', function() use ($db) {
        $domainService = new DomainService($db);
        $config = $domainService->getConfig();
        
        // Get all content for this domain
        $content = $db->select('domain_content', '*', [
            'domain_id' => $config['id'],
            'status' => 'published'
        ]);
        
        // Get popular routes
        $routes = $config['popular_routes'];
        
        echo json_encode([
            'success' => true,
            'data' => [
                'domain' => $config['domain'],
                'content' => $content,
                'popular_routes' => $routes
            ]
        ]);
    });
    
    /**
     * GET /api/domain/all
     * Returns all active domains (for hreflang & admin)
     */
    $app->get('/all', function() use ($db) {
        $domainService = new DomainService($db);
        $domains = $domainService->getAllDomains();
        
        echo json_encode([
            'success' => true,
            'data' => $domains
        ]);
    });
});
```

### 8.5 Phase 3: Frontend Domain-Aware Rendering (Week 3-5)

#### Domain Configuration Module

```javascript
// src/config/domains.js

/**
 * Fallback domain config (used when API is not yet loaded)
 * After initial load, configs are fetched from PHP API
 */
const FALLBACK_CONFIGS = {
    'traveltourup.com': {
        country_code: 'US',
        default_language: 'en',
        default_currency: 'USD',
        direction: 'ltr',
        site_name: 'TravelTourUp',
    },
    'travelup.pk': {
        country_code: 'PK',
        default_language: 'ur',
        default_currency: 'PKR',
        direction: 'rtl',
        site_name: 'TravelUp Pakistan',
    },
    // ... add more as needed
};

/**
 * Get domain from request headers (server-side) or window (client-side)
 */
export function getCurrentDomain() {
    if (typeof window !== 'undefined') {
        return window.location.hostname.replace(/^www\./, '');
    }
    return 'traveltourup.com'; // Server-side default
}

/**
 * Fetch full domain config from API
 */
export async function getDomainConfig(domain) {
    try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
        const response = await fetch(`${apiBase}/api/domain/config`, {
            headers: {
                'Host': domain, // Important: pass the domain
            },
            next: { revalidate: 300 } // Cache for 5 minutes (Next.js ISR)
        });
        
        if (!response.ok) throw new Error('Failed to fetch domain config');
        
        const data = await response.json();
        return data.data;
    } catch (error) {
        console.error('Domain config fetch failed:', error);
        return FALLBACK_CONFIGS[domain] || FALLBACK_CONFIGS['traveltourup.com'];
    }
}

/**
 * Fetch SEO data for a page
 */
export async function getPageSEO(domain, pageKey) {
    try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
        const response = await fetch(`${apiBase}/api/domain/seo/${pageKey}`, {
            headers: { 'Host': domain },
            next: { revalidate: 300 }
        });
        
        if (!response.ok) throw new Error('Failed to fetch SEO data');
        
        const data = await response.json();
        return data.data;
    } catch (error) {
        console.error('SEO fetch failed:', error);
        return null;
    }
}
```

#### Domain Context Provider

```jsx
// src/components/DomainProvider.jsx
'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const DomainContext = createContext(null);

export function DomainProvider({ children, initialConfig }) {
    const [config, setConfig] = useState(initialConfig);
    const [currency, setCurrency] = useState(initialConfig?.default_currency || 'USD');
    const [language, setLanguage] = useState(initialConfig?.default_language || 'en');
    
    const value = {
        config,
        currency,
        setCurrency,
        language,
        setLanguage,
        countryCode: config?.country_code || 'US',
        direction: config?.direction || 'ltr',
        siteName: config?.site_name || 'TravelTourUp',
        theme: config?.theme || {},
        popularRoutes: config?.popular_routes || [],
    };
    
    return (
        <DomainContext.Provider value={value}>
            {children}
        </DomainContext.Provider>
    );
}

export function useDomain() {
    const context = useContext(DomainContext);
    if (!context) {
        throw new Error('useDomain must be used within a DomainProvider');
    }
    return context;
}
```

#### Updated Root Layout

```jsx
// app/layout.jsx
import { headers } from 'next/headers';
import { getDomainConfig } from '@/config/domains';
import { DomainProvider } from '@/components/DomainProvider';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export async function generateMetadata() {
    const headersList = headers();
    const host = headersList.get('host')?.replace(/^www\./, '') || 'traveltourup.com';
    const config = await getDomainConfig(host);
    
    if (!config) {
        return { title: 'TravelTourUp' };
    }
    
    return {
        title: {
            default: config.site_name,
            template: `%s | ${config.site_name}`,
        },
        description: config.site_tagline,
        metadataBase: new URL(`https://${host}`),
        alternates: {
            canonical: `https://${host}`,
        },
        openGraph: {
            siteName: config.site_name,
            locale: `${config.default_language}_${config.country_code}`,
        },
        other: {
            'geo.region': config.country_code,
            'geo.placename': config.country_name,
        },
    };
}

export default async function RootLayout({ children }) {
    const headersList = headers();
    const host = headersList.get('host')?.replace(/^www\./, '') || 'traveltourup.com';
    const config = await getDomainConfig(host);
    
    return (
        <html lang={config?.default_language || 'en'} dir={config?.direction || 'ltr'}>
            <head>
                {/* Per-domain favicon */}
                <link rel="icon" href={config?.theme?.favicon_url || '/favicon.ico'} />
                
                {/* Per-domain custom CSS variables */}
                <style>{`
                    :root {
                        --primary-color: ${config?.theme?.primary_color || '#0066FF'};
                        --secondary-color: ${config?.theme?.secondary_color || '#FF6600'};
                        --accent-color: ${config?.theme?.accent_color || '#00CC66'};
                    }
                `}</style>
            </head>
            <body>
                <DomainProvider initialConfig={config}>
                    <Navbar />
                    <main>{children}</main>
                    <Footer />
                </DomainProvider>
            </body>
        </html>
    );
}
```

#### Example: Domain-Aware Home Page

```jsx
// app/page.jsx
import { headers } from 'next/headers';
import { getDomainConfig, getPageSEO } from '@/config/domains';
import HeroSection from '@/components/HeroSection';
import SearchForm from '@/components/SearchForm';
import PopularRoutes from '@/components/PopularRoutes';

export async function generateMetadata() {
    const host = headers().get('host')?.replace(/^www\./, '');
    const seoData = await getPageSEO(host, 'home');
    const config = await getDomainConfig(host);
    
    return {
        title: seoData?.seo?.title || config?.site_name,
        description: seoData?.seo?.meta_description || config?.site_tagline,
        openGraph: {
            title: seoData?.seo?.og_title,
            description: seoData?.seo?.og_description,
            images: seoData?.seo?.og_image ? [seoData.seo.og_image] : [],
        },
        alternates: {
            languages: seoData?.hreflang?.reduce((acc, tag) => {
                acc[tag.hreflang] = tag.href;
                return acc;
            }, {}),
        },
    };
}

export default async function HomePage() {
    const host = headers().get('host')?.replace(/^www\./, '');
    const config = await getDomainConfig(host);
    
    return (
        <>
            <HeroSection 
                title={config?.theme?.hero_title}
                subtitle={config?.theme?.hero_subtitle}
                backgroundImage={config?.theme?.hero_image_url}
            />
            <SearchForm 
                defaultCurrency={config?.default_currency}
                defaultLanguage={config?.default_language}
            />
            <PopularRoutes routes={config?.popular_routes} />
        </>
    );
}
```

### 8.6 Phase 4: Per-Domain SEO Engine (Week 4-6)

#### Complete SEO Implementation

```jsx
// src/components/SEOHead.jsx
/**
 * Reusable SEO component for any page
 * Generates all necessary meta tags, structured data, and hreflang
 */
export default function SEOHead({ seoData, config, pageUrl }) {
    const domain = config?.domain || 'traveltourup.com';
    const fullUrl = `https://${domain}${pageUrl}`;
    
    // Generate structured data
    const organizationSchema = {
        "@context": "https://schema.org",
        "@type": "TravelAgency",
        "name": config?.site_name,
        "url": `https://${domain}`,
        "logo": config?.theme?.logo_url,
        "description": config?.site_tagline,
        "address": {
            "@type": "PostalAddress",
            "addressCountry": config?.country_code
        },
        "sameAs": [
            config?.social?.facebook,
            config?.social?.twitter,
            config?.social?.instagram
        ].filter(Boolean)
    };
    
    return (
        <>
            {/* Essential Meta Tags */}
            <meta name="robots" content={seoData?.robots || 'index, follow'} />
            <meta name="geo.region" content={config?.country_code} />
            <meta name="geo.placename" content={config?.country_name} />
            <meta name="language" content={config?.default_language} />
            <meta name="content-language" content={`${config?.default_language}-${config?.country_code}`} />
            
            {/* Canonical */}
            <link rel="canonical" href={seoData?.canonical_url || fullUrl} />
            
            {/* hreflang tags */}
            {seoData?.hreflang?.map(tag => (
                <link key={tag.hreflang} rel="alternate" 
                      hrefLang={tag.hreflang} href={tag.href} />
            ))}
            
            {/* Structured Data */}
            <script type="application/ld+json">
                {JSON.stringify(organizationSchema)}
            </script>
            
            {/* Page-specific structured data */}
            {seoData?.structured_data && (
                <script type="application/ld+json">
                    {JSON.stringify(seoData.structured_data)}
                </script>
            )}
        </>
    );
}
```

#### Per-Domain Sitemap Generation

```jsx
// app/sitemap.js
import { getDomainConfig } from '@/config/domains';
import { headers } from 'next/headers';

export default async function sitemap() {
    const host = headers().get('host')?.replace(/^www\./, '') || 'traveltourup.com';
    const config = await getDomainConfig(host);
    
    const baseUrl = `https://${host}`;
    
    // Static pages
    const staticPages = [
        { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
        { url: `${baseUrl}/flights/search`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
        { url: `${baseUrl}/hotels/search`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
        { url: `${baseUrl}/cars/search`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
        { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
        { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
        { url: `${baseUrl}/terms`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
        { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    ];
    
    // Popular route pages (country-specific)
    const routePages = (config?.popular_routes || []).map(route => ({
        url: `${baseUrl}/flights/${route.slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
    }));
    
    // Blog/content pages
    // Fetch from API
    let blogPages = [];
    try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
        const res = await fetch(`${apiBase}/api/domain/sitemap`, {
            headers: { 'Host': host },
            next: { revalidate: 3600 }
        });
        const data = await res.json();
        blogPages = (data?.data?.content || []).map(post => ({
            url: `${baseUrl}/blog/${post.slug}`,
            lastModified: new Date(post.updated_at),
            changeFrequency: 'weekly',
            priority: 0.6,
        }));
    } catch (e) {
        console.error('Failed to fetch sitemap data');
    }
    
    return [...staticPages, ...routePages, ...blogPages];
}
```

#### robots.txt Per Domain

```jsx
// app/robots.js
import { headers } from 'next/headers';

export default function robots() {
    const host = headers().get('host')?.replace(/^www\./, '') || 'traveltourup.com';
    
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: ['/api/', '/admin/', '/login', '/signup'],
            },
        ],
        sitemap: `https://${host}/sitemap.xml`,
    };
}
```

### 8.7 Phase 5: Per-Domain Theming & Design (Week 5-7)

#### Tailwind CSS Domain Theming

```javascript
// tailwind.config.js
module.exports = {
    content: ['./app/**/*.{js,jsx}', './src/**/*.{js,jsx}'],
    theme: {
        extend: {
            colors: {
                primary: 'var(--primary-color)',
                secondary: 'var(--secondary-color)',
                accent: 'var(--accent-color)',
            },
        },
    },
    plugins: [],
};
```

#### Theme Component

```jsx
// src/components/ThemeProvider.jsx
'use client';

import { useDomain } from './DomainProvider';
import { useEffect } from 'react';

export default function ThemeProvider({ children }) {
    const { config } = useDomain();
    const theme = config?.theme;
    
    useEffect(() => {
        if (theme) {
            const root = document.documentElement;
            root.style.setProperty('--primary-color', theme.primary_color || '#0066FF');
            root.style.setProperty('--secondary-color', theme.secondary_color || '#FF6600');
            root.style.setProperty('--accent-color', theme.accent_color || '#00CC66');
            root.style.setProperty('--bg-color', theme.background_color || '#FFFFFF');
            root.style.setProperty('--text-color', theme.text_color || '#333333');
            
            // Load custom CSS if present
            if (theme.custom_css) {
                const style = document.createElement('style');
                style.textContent = theme.custom_css;
                style.id = 'domain-custom-css';
                // Remove existing custom CSS
                document.getElementById('domain-custom-css')?.remove();
                document.head.appendChild(style);
            }
        }
    }, [theme]);
    
    return <>{children}</>;
}
```

---

## 9. SEO Strategy for Multi-Domain Multi-Country

### 9.1 SEO Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    SEO STRATEGY                      │
│                                                      │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐       │
│  │ Per-Domain│  │ Per-Domain│  │ Cross-    │       │
│  │ Meta Tags │  │ Sitemaps  │  │ Domain    │       │
│  │           │  │           │  │ hreflang  │       │
│  └───────────┘  └───────────┘  └───────────┘       │
│                                                      │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐       │
│  │ Schema.org│  │ Per-Domain│  │ Country-  │       │
│  │ Structured│  │ Blog/     │  │ Specific  │       │
│  │ Data      │  │ Content   │  │ Route     │       │
│  └───────────┘  └───────────┘  │ Pages     │       │
│                                 └───────────┘       │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐       │
│  │ Google    │  │ Bing      │  │ Local     │       │
│  │ Search    │  │ Webmaster │  │ Search    │       │
│  │ Console   │  │ Tools     │  │ Engines   │       │
│  │ (per      │  │ (per      │  │ (if any)  │       │
│  │  domain)  │  │  domain)  │  │           │       │
│  └───────────┘  └───────────┘  └───────────┘       │
└─────────────────────────────────────────────────────┘
```

### 9.2 Google Search Console Setup

Each domain MUST be added as a **separate property** in Google Search Console:


| Domain           | GSC Property     | Targeting      |
| ---------------- | ---------------- | -------------- |
| traveltourup.com | traveltourup.com | International  |
| travelup.pk      | travelup.pk      | Pakistan       |
| travelup.ae      | travelup.ae      | UAE            |
| travelup.sa      | travelup.sa      | Saudi Arabia   |
| travelup.co.uk   | travelup.co.uk   | United Kingdom |


**Steps per domain:**

1. Add domain property in GSC
2. Verify via DNS TXT record
3. Set international targeting (country)
4. Submit domain-specific sitemap
5. Monitor indexing and performance separately

### 9.3 hreflang Implementation

hreflang tags are **critical** for multi-country domains. They tell Google which version of a page to show to users in different countries.

```html
<!-- On travelup.pk homepage -->
<link rel="alternate" hreflang="ur-PK" href="https://travelup.pk/" />
<link rel="alternate" hreflang="en-PK" href="https://travelup.pk/" />
<link rel="alternate" hreflang="en-US" href="https://traveltourup.com/" />
<link rel="alternate" hreflang="ar-AE" href="https://travelup.ae/" />
<link rel="alternate" hreflang="en-AE" href="https://travelup.ae/" />
<link rel="alternate" hreflang="ar-SA" href="https://travelup.sa/" />
<link rel="alternate" hreflang="en-GB" href="https://travelup.co.uk/" />
<link rel="alternate" hreflang="x-default" href="https://traveltourup.com/" />
```

### 9.4 Country-Specific Content Strategy


| Country                | Content Type           | SEO Focus                                  | Examples                                                |
| ---------------------- | ---------------------- | ------------------------------------------ | ------------------------------------------------------- |
| **Pakistan (.pk)**     | Urdu + English blogs   | Popular routes, Umrah flights, visa guides | "Karachi to Dubai cheap flights", "Umrah packages 2026" |
| **UAE (.ae)**          | Arabic + English blogs | Regional routes, tourism, business travel  | "Cheap flights from Dubai", "Abu Dhabi hotel deals"     |
| **Saudi Arabia (.sa)** | Arabic blogs           | Hajj/Umrah, regional travel, tourism       | "Flights to Madinah", "Jeddah hotel booking"            |
| **UK (.co.uk)**        | English blogs          | Europe routes, holiday packages            | "Cheap flights from London", "Europe travel deals"      |


### 9.5 Structured Data Per Domain

```json
{
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    "name": "TravelUp Pakistan",
    "url": "https://travelup.pk",
    "logo": "https://travelup.pk/assets/img/logos/travelup-pk.svg",
    "description": "Book cheap flights, hotels and cars from Pakistan",
    "address": {
        "@type": "PostalAddress",
        "addressCountry": "PK",
        "addressLocality": "Karachi"
    },
    "areaServed": {
        "@type": "Country",
        "name": "Pakistan"
    },
    "priceRange": "PKR",
    "telephone": "+92-XXX-XXXXXXX",
    "openingHoursSpecification": {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],
        "opens": "00:00",
        "closes": "23:59"
    }
}
```

### 9.6 Ongoing SEO Checklist Per Domain

```
□ Google Search Console property created and verified
□ Bing Webmaster Tools property created
□ Sitemap submitted (domain-specific)
□ hreflang tags implemented correctly (verify with hreflang testing tool)
□ Meta title and description set for all pages
□ Open Graph tags set for all pages
□ Structured data (JSON-LD) on all pages
□ Country-specific robots.txt live
□ Blog posts published (weekly minimum)
□ Popular route pages created with SEO content
□ Google Analytics / GA4 tracking with domain dimension
□ Core Web Vitals passing on all pages
□ Mobile-friendly test passing
□ Page speed optimized (<3s LCP)
□ Internal linking between pages
□ Image alt tags in local language
□ Local business directory submissions (if applicable)
□ Social media profiles linked
```

---

## 10. Domain & DNS Architecture

### 10.1 DNS Configuration

All country domains must point to the same server (or CDN/load balancer).

```
;; DNS Records for each domain

;; travelup.pk
travelup.pk.          A     203.0.113.10        ; Main server IP
www.travelup.pk.      CNAME travelup.pk.        ; www redirect
travelup.pk.          TXT   "v=spf1 include:_spf.google.com ~all"
travelup.pk.          TXT   "google-site-verification=XXXXX"
_dmarc.travelup.pk.   TXT   "v=DMARC1; p=quarantine"

;; travelup.ae
travelup.ae.          A     203.0.113.10
www.travelup.ae.      CNAME travelup.ae.
travelup.ae.          TXT   "google-site-verification=YYYYY"

;; travelup.co.uk
travelup.co.uk.       A     203.0.113.10
www.travelup.co.uk.   CNAME travelup.co.uk.
travelup.co.uk.       TXT   "google-site-verification=ZZZZZ"

;; Option: Use Cloudflare for all domains (recommended)
;; All DNS managed in Cloudflare, proxy enabled
```

### 10.2 SSL Certificate Strategy


| Option                         | Description                               | Recommendation                                     |
| ------------------------------ | ----------------------------------------- | -------------------------------------------------- |
| **Let's Encrypt (per domain)** | Free, auto-renewing, 90-day certs         | ✅ Best for cost-effectiveness                      |
| **Wildcard cert**              | Only if using subdomains (*.travelup.com) | ❌ Not applicable (different TLDs)                  |
| **Cloudflare Universal SSL**   | Free with Cloudflare proxy                | ✅ Best overall — handles all domains automatically |
| **Paid multi-domain SSL**      | One cert with multiple SANs               | 🟡 Works but unnecessary cost                      |


**Recommendation:** Use **Cloudflare** as DNS/CDN for all domains. Cloudflare provides:

- Free SSL for all domains
- DDoS protection
- CDN caching (faster for all countries)
- Page rules and redirects
- Analytics per domain

### 10.3 Server Configuration (Apache/Nginx)

#### Apache (httpd-vhosts.conf)

```apache
# All domains served by same Next.js app
# Apache proxies to Next.js dev server or serves static export

<VirtualHost *:443>
    ServerName traveltourup.com
    ServerAlias travelup.pk travelup.ae travelup.sa travelup.co.uk
    ServerAlias www.traveltourup.com www.travelup.pk www.travelup.ae www.travelup.sa www.travelup.co.uk
    
    # SSL per domain (Let's Encrypt or Cloudflare)
    SSLEngine on
    SSLCertificateFile /etc/ssl/certs/multi-domain.crt
    SSLCertificateKeyFile /etc/ssl/private/multi-domain.key
    
    # www to non-www redirect
    RewriteEngine On
    RewriteCond %{HTTP_HOST} ^www\.(.+)$ [NC]
    RewriteRule ^(.*)$ https://%1$1 [R=301,L]
    
    # Proxy to Next.js app (if running as server)
    ProxyPreserveHost On
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/
    
    # PHP API (served separately)
    Alias /api /var/www/traveltourup/api
    <Directory /var/www/traveltourup/api>
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
```

#### Nginx (nginx.conf)

```nginx
# All domains → same upstream
server {
    listen 443 ssl http2;
    server_name traveltourup.com travelup.pk travelup.ae travelup.sa travelup.co.uk
                www.traveltourup.com www.travelup.pk www.travelup.ae www.travelup.sa www.travelup.co.uk;
    
    # SSL (use Cloudflare or certbot multi-domain)
    ssl_certificate /etc/ssl/certs/multi-domain.crt;
    ssl_certificate_key /etc/ssl/private/multi-domain.key;
    
    # www → non-www redirect
    if ($host ~* ^www\.(.*)) {
        return 301 https://$1$request_uri;
    }
    
    # Next.js App
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
    }
    
    # PHP API
    location /api {
        alias /var/www/traveltourup/api;
        try_files $uri $uri/ /api/index.php?$args;
        
        location ~ \.php$ {
            fastcgi_pass unix:/run/php/php8.2-fpm.sock;
            fastcgi_param SCRIPT_FILENAME $request_filename;
            include fastcgi_params;
            # Pass original host to PHP
            fastcgi_param HTTP_HOST $host;
        }
    }
    
    # Admin panel
    location /admin {
        alias /var/www/traveltourup/admin;
        try_files $uri $uri/ /admin/index.php?$args;
        
        location ~ \.php$ {
            fastcgi_pass unix:/run/php/php8.2-fpm.sock;
            fastcgi_param SCRIPT_FILENAME $request_filename;
            include fastcgi_params;
        }
    }
}

# HTTP → HTTPS redirect
server {
    listen 80;
    server_name traveltourup.com travelup.pk travelup.ae travelup.sa travelup.co.uk
                www.traveltourup.com www.travelup.pk www.travelup.ae www.travelup.sa www.travelup.co.uk;
    return 301 https://$host$request_uri;
}
```

---

## 11. Database Architecture for Multi-Domain

### 11.1 Design Principle

**Single database, domain-aware queries.** The database stays shared. Domain-specific data is isolated through foreign keys to the `domain_settings` table.

```
                    ┌─────────────────────┐
                    │   domain_settings   │ ← Central domain registry
                    │   (id, domain, ...) │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
    ┌─────────▼──────┐ ┌──────▼────────┐ ┌─────▼─────────┐
    │  domain_seo    │ │ domain_themes │ │domain_content │
    │  (domain_id FK)│ │ (domain_id FK)│ │(domain_id FK) │
    └────────────────┘ └───────────────┘ └───────────────┘
    
    ┌────────────────────────────────────────────────────┐
    │           SHARED TABLES (no domain_id)             │
    │                                                    │
    │  • users                    • flights              │
    │  • bookings                 • hotels               │
    │  • payments                 • cars                  │
    │  • transactions             • currencies            │
    │  • airlines                 • airports              │
    │                                                    │
    │  These are GLOBAL — same data across all domains   │
    └────────────────────────────────────────────────────┘
```

### 11.2 Which Tables Are Domain-Specific vs Shared


| Table                         | Scope                    | Reason                                           |
| ----------------------------- | ------------------------ | ------------------------------------------------ |
| `domain_settings`             | Per-Domain               | Core domain configuration                        |
| `domain_seo`                  | Per-Domain               | SEO meta tags differ by country                  |
| `domain_themes`               | Per-Domain               | Visual design differs by domain                  |
| `domain_content`              | Per-Domain               | Blog posts, pages are country-specific           |
| `domain_popular_routes`       | Per-Domain               | Popular routes differ by country                 |
| `domain_hreflang`             | Per-Domain               | Cross-domain language linking                    |
| `users`                       | **Shared**               | A user can book from any domain                  |
| `bookings`                    | **Shared**               | Bookings are global (+ `source_domain` column)   |
| `payments`                    | **Shared**               | Payments are global                              |
| `flights` / `hotels` / `cars` | **Shared**               | Inventory is global (Duffel API)                 |
| `airlines` / `airports`       | **Shared**               | Reference data is global                         |
| `currencies`                  | **Shared**               | Currency rates are global                        |
| `markups`                     | **Shared or Per-Domain** | Can add `domain_id` if markups differ by country |


### 11.3 Booking Source Tracking

Add `source_domain` to bookings table to track which domain the booking originated from:

```sql
ALTER TABLE `bookings` 
ADD COLUMN `source_domain` VARCHAR(255) DEFAULT 'traveltourup.com' AFTER `user_id`,
ADD INDEX `idx_source_domain` (`source_domain`);
```

This enables:

- Revenue reporting per domain
- Conversion tracking per country
- Domain-specific analytics

---

## 12. Backend Changes Required (PHP)

### 12.1 Changes Summary


| File/Area                         | Change Required                                   | Effort |
| --------------------------------- | ------------------------------------------------- | ------ |
| `_config.php`                     | Add DomainService initialization                  | Low    |
| `api/config.php`                  | Add domain detection, pass to API routes          | Low    |
| `api/routes/*.php`                | Accept domain parameter, filter content           | Medium |
| New: `services/DomainService.php` | Complete domain service (see Phase 2 code)        | Medium |
| `admin/settings.php`              | Add domain management UI                          | Medium |
| New: `admin/domains.php`          | Admin page to manage domain settings, SEO, themes | Medium |
| `admin/_core.php`                 | Add domain helper functions                       | Low    |
| Bookings creation                 | Add `source_domain` tracking                      | Low    |
| API responses                     | Include domain context in responses               | Low    |


### 12.2 Admin Panel — Domain Management Page

```php
<?php
// admin/domains.php — Domain management interface
// This page allows admin to:
// 1. View all domains
// 2. Add/edit domain settings
// 3. Configure SEO per domain per page
// 4. Set theme/design per domain
// 5. Manage popular routes per domain
// 6. Manage blog/content per domain

// Key admin operations:
// - CRUD for domain_settings
// - CRUD for domain_seo  
// - CRUD for domain_themes
// - CRUD for domain_content
// - CRUD for domain_popular_routes
// - Cache invalidation when settings change
// - Preview per-domain rendering
```

---

## 13. Frontend Changes Required (Next.js)

### 13.1 Changes Summary


| File/Area                           | Change Required                                | Effort |
| ----------------------------------- | ---------------------------------------------- | ------ |
| `app/layout.jsx`                    | Domain-aware metadata, direction, language     | Medium |
| `src/config/domains.js`             | NEW: Domain config fetcher                     | Medium |
| `src/components/DomainProvider.jsx` | NEW: Context provider for domain config        | Medium |
| `src/components/Navbar.jsx`         | Use domain config for logo, language, currency | Low    |
| `src/components/Footer.jsx`         | Use domain config for contact, links           | Low    |
| `src/components/HeroSection.jsx`    | Use domain config for hero text/image          | Low    |
| `src/config/navbar.config.js`       | Replace hardcoded with domain-aware config     | Low    |
| `src/config/footer.config.js`       | Replace hardcoded with domain-aware config     | Low    |
| `middleware.js`                     | NEW: Domain detection middleware               | Medium |
| `app/sitemap.js`                    | NEW: Per-domain dynamic sitemap                | Medium |
| `app/robots.js`                     | NEW: Per-domain robots.txt                     | Low    |
| All page components                 | Add domain-specific generateMetadata           | Medium |
| Tailwind config                     | CSS variables for dynamic theming              | Low    |


### 13.2 Key Principle

> **The frontend should NEVER hardcode domain-specific values.**  
> All domain-specific data (SEO, theme, currency, language, routes) comes from the PHP API via the `DomainService`.  
> The frontend simply **renders** whatever the API returns for the current domain.

---

## 14. WordPress Integration Guide (If WordPress Sites Used)

> **Note:** This section is provided for reference in case you still want to use WordPress for content on any domain. The recommended approach does NOT require separate WordPress installations.

### 14.0 Travel search widget (satellite WordPress sites)

Use the self-contained embed file [`z-docs/docs/wordpress/ttu-travel-search-widget-embed.html`](wordpress/ttu-travel-search-widget-embed.html):

1. Paste the entire file into a WordPress **Custom HTML** block or Elementor **HTML** widget.
2. Default redirect target is `https://traveltourup.com` (`MAIN_SITE` constant at top of script).
3. On each country WordPress site, set `CORS_ALLOWED_ORIGIN` on the main Next.js app to allow that domain (see `proxy.ts`) so airport/hotel typeahead can call `/api/v1/flights/airports` and `/api/v1/stays/places`.
4. Regenerate static airport/destination data after app changes: `node scripts/sync-widget-search-data.mjs`.

**Redirect examples (QA):**

- Flights: `https://traveltourup.com/flights?origin=JFK&destination=LHR&departure_date=2026-06-08&trip=one_way&cabin_class=economy&adults=1&children=0&infants=0&supplier_timeout=60000`
- Hotels: `https://traveltourup.com/hotels?stays_results=1&check_in=2026-06-10&check_out=2026-06-12&rooms=1&adults=2&children=0&dest_kind=popular&dest_code=NYC&dest_name=New%20York%20City&dest_country=United%20States`
- Cars: `https://traveltourup.com/cars?pickup=JFK&date=2026-06-08&adults=1&children=0`
- More services: `https://traveltourup.com/`

The main app hydrates hotel searches from URL query params (cross-domain handoff); flights already used URL params.

### 14.1 If Using WordPress as Headless CMS (Approach 4 Element)

Install **one** WordPress instance that serves as a headless content API:

```
WordPress Instance (headless)
├── wp-json/wp/v2/posts      → Blog posts per category (domain as category)
├── wp-json/wp/v2/pages      → Static pages per domain
├── wp-json/yoast/v1/seo     → SEO data from Yoast plugin
└── Custom endpoints          → Domain-specific content
```

#### WordPress Custom Post Type for Domain Content

```php
// WordPress: functions.php
// Register custom taxonomy to categorize content by domain
function register_domain_taxonomy() {
    register_taxonomy('domain', ['post', 'page'], [
        'label' => 'Domain',
        'rewrite' => ['slug' => 'domain'],
        'hierarchical' => false,
        'show_in_rest' => true, // Required for Gutenberg + REST API
    ]);
}
add_action('init', 'register_domain_taxonomy');

// Add domain terms
function add_default_domains() {
    $domains = ['traveltourup.com', 'travelup.pk', 'travelup.ae', 'travelup.sa', 'travelup.co.uk'];
    foreach ($domains as $domain) {
        if (!term_exists($domain, 'domain')) {
            wp_insert_term($domain, 'domain');
        }
    }
}
add_action('init', 'add_default_domains');
```

#### Next.js Fetching WordPress Content

```javascript
// src/lib/wordpress.js
const WP_API_URL = process.env.WORDPRESS_API_URL || 'https://cms.traveltourup.com/wp-json';

export async function getDomainPosts(domain, page = 1, perPage = 10) {
    const response = await fetch(
        `${WP_API_URL}/wp/v2/posts?domain=${encodeURIComponent(domain)}&page=${page}&per_page=${perPage}&_embed`,
        { next: { revalidate: 600 } } // Cache for 10 minutes
    );
    
    if (!response.ok) return { posts: [], total: 0 };
    
    const posts = await response.json();
    const total = parseInt(response.headers.get('X-WP-Total') || '0');
    
    return { posts, total };
}

export async function getDomainPost(domain, slug) {
    const response = await fetch(
        `${WP_API_URL}/wp/v2/posts?domain=${encodeURIComponent(domain)}&slug=${slug}&_embed`,
        { next: { revalidate: 600 } }
    );
    
    if (!response.ok) return null;
    
    const posts = await response.json();
    return posts[0] || null;
}
```

### 14.2 If Using Separate WordPress Sites (Approach 1 — NOT Recommended)

If you still want to try WordPress satellites despite the recommendation against it, here's the search form connection:

#### WordPress Search Form → Main App

```php
<?php
// WordPress Theme: search-form-template.php
// This creates a search form that redirects to the main TravelTourUp application

// Define main app URL (set in WordPress admin → Settings → General → Main App URL)
$main_app_url = get_option('traveltourup_main_app_url', 'https://traveltourup.com');
$source_domain = $_SERVER['HTTP_HOST'];
$default_currency = get_option('default_currency', 'PKR');
$default_lang = get_option('default_language', 'ur');
?>

<div id="flight-search-widget" class="travelup-search-widget">
    <form id="wp-flight-search" method="GET">
        <div class="search-row">
            <div class="field">
                <label>From</label>
                <input type="text" name="from" id="origin-input" 
                       placeholder="City or Airport" required 
                       autocomplete="off" />
                <input type="hidden" name="origin_code" id="origin-code" />
            </div>
            <div class="field">
                <label>To</label>
                <input type="text" name="to" id="dest-input" 
                       placeholder="City or Airport" required 
                       autocomplete="off" />
                <input type="hidden" name="dest_code" id="dest-code" />
            </div>
            <div class="field">
                <label>Depart</label>
                <input type="date" name="departure_date" required 
                       min="<?php echo date('Y-m-d'); ?>" />
            </div>
            <div class="field">
                <label>Return</label>
                <input type="date" name="return_date" />
            </div>
            <div class="field">
                <label>Passengers</label>
                <select name="adults">
                    <?php for($i=1; $i<=9; $i++): ?>
                    <option value="<?php echo $i; ?>"><?php echo $i; ?> Adult<?php echo $i>1?'s':''; ?></option>
                    <?php endfor; ?>
                </select>
            </div>
            <div class="field">
                <label>Class</label>
                <select name="cabin_class">
                    <option value="economy">Economy</option>
                    <option value="premium_economy">Premium Economy</option>
                    <option value="business">Business</option>
                    <option value="first">First</option>
                </select>
            </div>
            <button type="submit" class="search-btn">Search Flights</button>
        </div>
    </form>
</div>

<script>
(function() {
    const MAIN_APP_URL = '<?php echo esc_js($main_app_url); ?>';
    const SOURCE_DOMAIN = '<?php echo esc_js($source_domain); ?>';
    const DEFAULT_CURRENCY = '<?php echo esc_js($default_currency); ?>';
    const DEFAULT_LANG = '<?php echo esc_js($default_lang); ?>';
    
    // Airport autocomplete (fetches from main app API)
    async function searchAirports(query) {
        try {
            const response = await fetch(
                `${MAIN_APP_URL}/api/flights/airports/search?q=${encodeURIComponent(query)}`,
                { mode: 'cors' }
            );
            return await response.json();
        } catch (error) {
            console.error('Airport search failed:', error);
            return [];
        }
    }
    
    // Initialize autocomplete for origin and destination
    let originTimeout, destTimeout;
    
    document.getElementById('origin-input').addEventListener('input', function() {
        clearTimeout(originTimeout);
        originTimeout = setTimeout(async () => {
            if (this.value.length >= 2) {
                const results = await searchAirports(this.value);
                showSuggestions(this, results, 'origin-code');
            }
        }, 300);
    });
    
    document.getElementById('dest-input').addEventListener('input', function() {
        clearTimeout(destTimeout);
        destTimeout = setTimeout(async () => {
            if (this.value.length >= 2) {
                const results = await searchAirports(this.value);
                showSuggestions(this, results, 'dest-code');
            }
        }, 300);
    });
    
    function showSuggestions(input, results, codeFieldId) {
        // Remove existing dropdown
        const existingDropdown = input.parentElement.querySelector('.suggestions');
        if (existingDropdown) existingDropdown.remove();
        
        if (!results.data || results.data.length === 0) return;
        
        const dropdown = document.createElement('div');
        dropdown.className = 'suggestions';
        
        results.data.forEach(airport => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.textContent = `${airport.name} (${airport.iata_code}) - ${airport.city_name}`;
            item.addEventListener('click', () => {
                input.value = `${airport.city_name} (${airport.iata_code})`;
                document.getElementById(codeFieldId).value = airport.iata_code;
                dropdown.remove();
            });
            dropdown.appendChild(item);
        });
        
        input.parentElement.appendChild(dropdown);
    }
    
    // Form submission → redirect to main app
    document.getElementById('wp-flight-search').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const originCode = document.getElementById('origin-code').value;
        const destCode = document.getElementById('dest-code').value;
        
        if (!originCode || !destCode) {
            alert('Please select valid airports');
            return;
        }
        
        const formData = new FormData(this);
        const params = new URLSearchParams();
        
        params.set('from', originCode);
        params.set('to', destCode);
        params.set('departure_date', formData.get('departure_date'));
        if (formData.get('return_date')) {
            params.set('return_date', formData.get('return_date'));
        }
        params.set('adults', formData.get('adults'));
        params.set('cabin_class', formData.get('cabin_class'));
        params.set('source', SOURCE_DOMAIN);
        params.set('currency', DEFAULT_CURRENCY);
        params.set('lang', DEFAULT_LANG);
        
        // Redirect to main app search results
        window.location.href = `${MAIN_APP_URL}/flights/search?${params.toString()}`;
    });
})();
</script>
```

#### Required: CORS on Main App API

```php
// api/config.php — Add CORS for WordPress satellite domains
$allowed_origins = [
    'https://travelup.pk',
    'https://travelup.ae',
    'https://travelup.sa',
    'https://travelup.co.uk',
    'https://traveltourup.com',
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
    header("Access-Control-Allow-Credentials: true");
} else {
    header("Access-Control-Allow-Origin: https://traveltourup.com");
}
```

---

## 15. Security Considerations

### 15.1 Security Checklist for Multi-Domain


| Risk                      | Mitigation                                                | Priority    |
| ------------------------- | --------------------------------------------------------- | ----------- |
| **Cross-Domain XSS**      | Strict CSP headers per domain, sanitize all inputs        | 🔴 Critical |
| **CORS Misconfiguration** | Whitelist only known domains, never use `*` in production | 🔴 Critical |
| **Session Hijacking**     | Use `SameSite=Strict` cookies when on same domain         | 🔴 Critical |
| **DNS Hijacking**         | Use DNSSEC, Cloudflare proxy, domain lock                 | 🟠 High     |
| **SSL Downgrade**         | HSTS headers, auto-redirect HTTP → HTTPS                  | 🟠 High     |
| **Domain Spoofing**       | Validate domain against DB whitelist on every request     | 🟠 High     |
| **Admin Access**          | Restrict admin panel to main domain only, IP whitelist    | 🟠 High     |
| **API Abuse**             | Rate limiting per domain, API key validation              | 🟡 Medium   |
| **Content Injection**     | Sanitize per-domain content from DB (XSS prevention)      | 🟠 High     |
| **Supply Chain**          | Lock npm/composer dependencies, audit regularly           | 🟡 Medium   |


### 15.2 Domain Validation (Backend)

```php
// services/DomainService.php — Always validate domain
private function detectDomain() {
    $host = $_SERVER['HTTP_HOST'] ?? '';
    $host = preg_replace('/^www\./', '', $host);
    $host = strtok($host, ':');
    $host = strtolower($host);
    
    // SECURITY: Validate domain format
    if (!preg_match('/^[a-z0-9]([a-z0-9\-]*[a-z0-9])?(\.[a-z]{2,})+$/', $host)) {
        return 'traveltourup.com'; // Fallback to default
    }
    
    // SECURITY: Check against database whitelist
    $isValid = $this->db->has('domain_settings', [
        'domain' => $host,
        'is_active' => 1
    ]);
    
    if (!$isValid) {
        return 'traveltourup.com'; // Fallback to default
    }
    
    return $host;
}
```

---

## 16. Deployment & Infrastructure

### 16.1 Recommended Stack

```
┌─────────────────────────────────────────────────────┐
│                  PRODUCTION STACK                     │
│                                                      │
│  DNS/CDN:    Cloudflare (all domains)                │
│  Server:     VPS or Cloud (DigitalOcean/AWS/Hetzner) │
│  OS:         Ubuntu 22.04 LTS                        │
│  Web:        Nginx (reverse proxy)                   │
│  Frontend:   Next.js (Node.js 20, PM2 managed)      │
│  Backend:    PHP 8.2+ (PHP-FPM)                      │
│  Database:   MySQL 8.0 (single instance)             │
│  Cache:      Redis (session + domain config cache)   │
│  SSL:        Cloudflare (automatic)                  │
│  Monitoring: UptimeRobot + Cloudflare Analytics      │
│  CI/CD:      GitHub Actions                          │
└─────────────────────────────────────────────────────┘
```

### 16.2 Adding a New Country Domain

Step-by-step process to add a new country domain (e.g., travelup.de for Germany):

```
1. Purchase domain (travelup.de)
2. Add DNS records in Cloudflare → point to same server
3. Add SSL (automatic via Cloudflare)
4. Insert row in domain_settings table:
   INSERT INTO domain_settings (domain, country_code, country_name, ...)
   VALUES ('travelup.de', 'DE', 'Germany', ...);
5. Insert SEO data in domain_seo table
6. Insert theme in domain_themes table
7. Insert popular routes in domain_popular_routes table
8. Add domain to Nginx server_name directive (reload Nginx)
9. Clear domain config cache
10. Verify in browser: https://travelup.de
11. Add to Google Search Console
12. Submit sitemap
13. Start content creation for Germany

Time: ~1-2 hours for technical setup
No code changes needed!
```

### 16.3 Monitoring Per Domain

```
Uptime Monitoring:
├── Monitor https://traveltourup.com (every 1 min)
├── Monitor https://travelup.pk (every 1 min)
├── Monitor https://travelup.ae (every 1 min)
├── Monitor https://travelup.sa (every 1 min)
└── Monitor https://travelup.co.uk (every 1 min)

Performance Monitoring:
├── Core Web Vitals per domain (Google PSI API)
├── API response time per domain
├── Error rate per domain
└── Booking conversion per domain

SEO Monitoring:
├── Google Search Console per domain
├── Keyword rankings per country
├── Organic traffic per domain
└── Indexing status per domain
```

---

## 17. Monitoring & Analytics

### 17.1 Google Analytics 4 Setup

Use a **single GA4 property** with custom dimensions for domain:

```javascript
// src/lib/analytics.js
export function initAnalytics(domain, countryCode) {
    // GA4 with domain dimension
    gtag('config', 'G-XXXXXXXXXX', {
        'custom_map': {
            'dimension1': 'source_domain',
            'dimension2': 'country_code'
        },
        'source_domain': domain,
        'country_code': countryCode,
        'currency': getCurrencyForCountry(countryCode),
    });
}

// Track events with domain context
export function trackEvent(eventName, params = {}) {
    gtag('event', eventName, {
        ...params,
        source_domain: getCurrentDomain(),
    });
}

// Usage:
// trackEvent('flight_search', { from: 'KHI', to: 'DXB' });
// trackEvent('booking_complete', { value: 45000, currency: 'PKR' });
```

### 17.2 Analytics Dashboard Requirements


| Report                 | Description                              | Key Metrics                        |
| ---------------------- | ---------------------------------------- | ---------------------------------- |
| **Domain Performance** | Revenue, bookings, users per domain      | Bookings/day, Revenue/day, AOV     |
| **SEO Performance**    | Organic traffic per domain               | Impressions, Clicks, CTR, Position |
| **Conversion Funnel**  | Search → Select → Book → Pay per domain  | Conversion rate at each step       |
| **Geographic**         | Where users from each domain are located | Country, city, device              |
| **Popular Routes**     | Most searched/booked routes per domain   | Route, searches, bookings          |


---

## 18. Implementation Timeline

### 18.1 Phase-by-Phase Timeline

```
Week 1-2:  ██████████  Domain Configuration System (DB schema, DomainService, API endpoints)
Week 2-3:  ██████████  Backend Multi-Domain Support (PHP changes, API routes, admin panel)
Week 3-5:  ████████████████████ Frontend Domain-Aware Rendering (Next.js middleware, context, layouts)
Week 4-6:  ████████████████████ Per-Domain SEO Engine (meta tags, sitemaps, hreflang, structured data)
Week 5-7:  ████████████████████ Per-Domain Theming (CSS variables, theme system, per-domain design)
Week 6-8:  ████████████████████ Content Management (blog system, popular routes pages)
Week 8-9:  ██████████  DNS, SSL & Deployment (Cloudflare, Nginx, SSL, go-live)
Week 9-10: ██████████  Testing & QA (cross-domain testing, SEO audit, performance)
Week 10-11: ████████████████  Launch & SEO Submission (GSC, sitemaps, initial content)
```

### 18.2 Milestone Checkpoints


| Milestone                         | Week    | Deliverable                                                     |
| --------------------------------- | ------- | --------------------------------------------------------------- |
| **M1: Infrastructure Ready**      | Week 2  | DB schema created, DomainService working, API endpoints live    |
| **M2: Frontend Domain-Aware**     | Week 5  | Next.js detects domain, renders correct theme/language/currency |
| **M3: SEO Engine Live**           | Week 6  | Per-domain meta tags, sitemaps, hreflang all working            |
| **M4: First Country Domain Live** | Week 9  | travelup.pk (or chosen first domain) live and functional        |
| **M5: All Domains Live**          | Week 11 | All planned domains live, indexed, content published            |


### 18.3 Team Requirements


| Role                   | Effort    | Tasks                                                |
| ---------------------- | --------- | ---------------------------------------------------- |
| **Backend Developer**  | 3-4 weeks | DomainService, API endpoints, admin panel, DB schema |
| **Frontend Developer** | 4-5 weeks | Domain-aware components, theming, SEO integration    |
| **DevOps**             | 1-2 weeks | Cloudflare setup, Nginx config, SSL, deployment      |
| **SEO Specialist**     | Ongoing   | Meta tags, content strategy, GSC setup, monitoring   |
| **Content Writer**     | Ongoing   | Blog posts, route descriptions per country/language  |
| **Designer**           | 1-2 weeks | Per-domain themes (colors, logos, hero images)       |


---

## 19. Risk Assessment & Mitigation

### 19.1 Risk Matrix


| Risk                                   | Probability | Impact | Mitigation                                                     |
| -------------------------------------- | ----------- | ------ | -------------------------------------------------------------- |
| **Domain detection fails**             | Low         | High   | Fallback to default domain always; comprehensive testing       |
| **SEO cannibalization**                | Medium      | High   | Proper hreflang implementation; unique content per domain      |
| **Performance degradation**            | Low         | Medium | Cache domain configs aggressively (Redis); CDN for all domains |
| **Search engine confusion**            | Medium      | High   | Separate GSC properties; unique sitemaps; canonical URLs       |
| **Design inconsistency**               | Low         | Low    | Component-based theming; design system documentation           |
| **Admin complexity**                   | Medium      | Medium | Intuitive domain management UI; per-domain preview             |
| **DNS propagation delays**             | Low         | Low    | Plan 48h for new domain DNS propagation                        |
| **SSL certificate issues**             | Low         | Medium | Use Cloudflare (automatic SSL); monitor cert expiry            |
| **Database performance**               | Low         | High   | Index domain_id columns; cache config queries                  |
| **Content duplication across domains** | Medium      | High   | Unique content per domain; use hreflang to signal variants     |


### 19.2 Critical Do's and Don'ts

#### ✅ DO:

- Use unique, localized content on each domain
- Implement hreflang tags on EVERY page across ALL domains
- Submit separate sitemaps to separate Google Search Console properties
- Cache domain configuration aggressively
- Monitor each domain's SEO performance independently
- Use the same backend and database for all domains
- Track booking source domain for analytics
- Validate domain against whitelist on every request

#### ❌ DON'T:

- Don't create separate WordPress installations for each domain (Approach 1)
- Don't redirect users between domains during booking flow
- Don't duplicate content verbatim across domains (SEO penalty)
- Don't use `Access-Control-Allow-Origin: `* in production
- Don't hardcode domain-specific values in frontend code
- Don't forget to set up HSTS headers
- Don't forget `x-default` hreflang tag
- Don't launch a domain without unique SEO content ready

---

## 20. Final Recommendation & Next Steps

### 20.1 Recommended Architecture

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│   APPROACH 3: Headless Multi-Tenant with Next.js         │
│                                                          │
│   ✅ Single Next.js frontend (domain-aware)              │
│   ✅ Single PHP backend (domain-aware)                   │
│   ✅ Single MySQL database (domain-scoped tables)        │
│   ✅ Single Duffel API integration                       │
│   ✅ Cloudflare for DNS/CDN/SSL on all domains           │
│   ✅ Per-domain SEO, theming, content, language, currency│
│   ✅ Add new country = DB row + DNS record (no code)     │
│                                                          │
│   Optional: Headless WordPress as CMS for blog content   │
│   (Approach 4 element — only if heavy content marketing) │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 20.2 Why This Is the Best Choice for TravelTourUp

1. **Industry Proven:** Skyscanner, Kayak, Wego, Booking.com all use this exact approach
2. **Best UX:** Users stay on their country domain throughout the entire booking journey
3. **Best SEO:** SSR + dynamic meta + per-domain sitemaps + hreflang = maximum SEO power
4. **Lowest Cost:** One server, one codebase, one team — dramatically lower TCO
5. **Most Scalable:** Adding a new country takes hours, not weeks
6. **Easiest Maintenance:** Fix a bug once, it's fixed for all domains
7. **Strongest Security:** One attack surface to protect, not N WordPress sites
8. **Unified Analytics:** Complete user journey visibility across all domains
9. **Shared Sessions:** Login once, works everywhere (same domain in booking flow)
10. **Future-Proof:** Easy to add features (mobile app, partner APIs) that work for all domains

### 20.3 Immediate Next Steps

```
Step 1: ☐ Create database tables (domain_settings, domain_seo, domain_themes, etc.)
Step 2: ☐ Build DomainService.php (backend domain detection + config loading)
Step 3: ☐ Build API endpoints (/api/domain/config, /api/domain/seo/:page)
Step 4: ☐ Build Next.js middleware for domain detection
Step 5: ☐ Build DomainProvider React context
Step 6: ☐ Update layout.jsx for domain-aware rendering
Step 7: ☐ Purchase first country domain (e.g., travelup.pk)
Step 8: ☐ Setup Cloudflare for DNS/CDN
Step 9: ☐ Configure Nginx for multi-domain
Step 10: ☐ Create SEO content for first country
Step 11: ☐ Launch first country domain
Step 12: ☐ Submit to Google Search Console
Step 13: ☐ Repeat for additional countries
```

### 20.4 Decision Matrix — Quick Reference


| If your priority is...                             | Choose...                             |
| -------------------------------------------------- | ------------------------------------- |
| **Best SEO + Best UX + Lowest cost**               | **Approach 3 (Recommended)**          |
| **Need WordPress CMS for blogs**                   | **Approach 3 + Approach 4 (Hybrid)**  |
| **Quick and dirty launch**                         | **Approach 2 (simpler version of 3)** |
| **Absolutely need separate WordPress per country** | **Approach 1 (NOT recommended)**      |


---

## 21. SEO Admin Panel & WordPress-Level SEO for Approach 3 (Full SEO Team Guide)

> **This section is written specifically to address the SEO team's concern:**  
> *"Will our custom Next.js site have the same SEO strength and ease-of-use as a WordPress site with Yoast/Rank Math?"*  
>
> **Short answer: YES — and in several ways it will be MORE powerful than WordPress.**  
> The following explains every feature in detail, what will be built, and how the SEO team will use it day-to-day.

---

### 21.1 The Core Concern: WordPress SEO vs Custom Site SEO

The SEO team's concern is completely valid. WordPress wins trust because of **Yoast SEO** and **Rank Math** — two plugins that give SEO professionals a simple, visual interface to manage every on-page SEO element without touching code. The fear is: if we build a custom site, we lose that experience.

Here is the full picture:

#### What Makes WordPress SEO "Easy" — and How Approach 3 Matches It


| SEO Feature                       | WordPress (Yoast/Rank Math)                       | Approach 3 (Custom Next.js + Admin Panel)                      | Winner       |
| --------------------------------- | ------------------------------------------------- | -------------------------------------------------------------- | ------------ |
| **Page title editor**             | Editable field per page with live character count | Same — per-page title field in admin panel                     | 🟰 Equal     |
| **Meta description editor**       | Editable field with character counter             | Same — editable in admin panel with counter                    | 🟰 Equal     |
| **Google Search Preview**         | Visual snippet preview                            | Same — visual preview built in admin panel                     | 🟰 Equal     |
| **Social (OG) Preview**           | Facebook + Twitter card preview                   | Same — OG image, title, desc preview                           | 🟰 Equal     |
| **Focus Keyword**                 | Highlight keyword and score content               | Same — keyword field + usage hints                             | 🟰 Equal     |
| **XML Sitemaps**                  | Auto-generated by plugin                          | **Auto-generated by Next.js per domain** — BETTER              | ✅ Approach 3 |
| **Robots.txt**                    | Managed via plugin                                | **Per-domain robots.txt from admin panel**                     | 🟰 Equal     |
| **Canonical URLs**                | Set per page                                      | **Set per page in admin panel + auto-generated**               | 🟰 Equal     |
| **hreflang tags**                 | Requires extra plugin (WPML) + $$$                | **Built-in automatically for all our country domains**         | ✅ Approach 3 |
| **Structured Data / Schema**      | Basic schema from Rank Math                       | **Full custom JSON-LD per domain + page**                      | ✅ Approach 3 |
| **Redirect Manager**              | Yoast Premium ($99/yr) or plugin                  | **Built into admin panel — free**                              | ✅ Approach 3 |
| **Breadcrumb SEO**                | Plugin schema output                              | **Component-based breadcrumbs with schema**                    | 🟰 Equal     |
| **Open Graph images**             | Upload per post                                   | **Upload per domain per page in admin**                        | 🟰 Equal     |
| **Content freshness**             | Plugin reminds to update old posts                | Can be added as admin reminder                                 | 🟰 Equal     |
| **Core Web Vitals (LCP/CLS/FID)** | Poor — WordPress is slow; plugins help partially  | **Excellent — SSR/SSG in Next.js is purpose-built for this**   | ✅ Approach 3 |
| **Page Speed**                    | 60-80 Lighthouse (with optimizations)             | **90-100 Lighthouse (Next.js optimizes automatically)**        | ✅ Approach 3 |
| **Per-Domain SEO**                | Needs multisite (complex) or separate installs    | **Native — one admin panel manages ALL country domains**       | ✅ Approach 3 |
| **Popular Route SEO pages**       | Manually created in WP                            | **Direct admin interface to manage route pages with full SEO** | ✅ Approach 3 |
| **Blog content SEO**              | WordPress editor (Gutenberg)                      | **Rich text editor in admin panel (or headless WP if needed)** | 🟰 Equal     |
| **Duplicate content**             | Yoast warns per post                              | **Automatic hreflang + canonical prevents cross-domain dups**  | ✅ Approach 3 |
| **Social media tags**             | Per post/page                                     | **Per domain + per page in admin panel**                       | 🟰 Equal     |
| **Indexing control**              | `noindex` per page                                | `**noindex` per page in admin**                                | 🟰 Equal     |
| **Keyword density check**         | Yoast content analysis                            | Can be added as a simple readability check in admin            | 🟰 Equal     |
| **Internal linking suggestions**  | Rank Math suggests links                          | Can be added as a feature in content editor                    | 🟰 Equal     |
| **Integration with GA/GSC**       | Plugin connects accounts                          | **Direct GA4/GSC integration in admin**                        | 🟰 Equal     |


**Summary:** Approach 3 can match every WordPress SEO feature AND surpass WordPress in the most technically important areas: Core Web Vitals, page speed, multi-domain hreflang, and per-domain management.

---

### 21.2 The Custom SEO Admin Panel — What It Looks Like

The admin panel (which you already have at `admin/`) will be extended with a dedicated **SEO Manager** module. Here is the exact design.

#### Admin Panel SEO Module — Pages & Features

```
admin/
├── seo.php                    ← SEO Dashboard (overview of all domains)
├── seo_pages.php              ← Per-page SEO editor (like Yoast meta box)
├── seo_routes.php             ← SEO for popular flight route pages
├── seo_redirects.php          ← 301/302 Redirect Manager
├── seo_schemas.php            ← Structured Data / Schema.org editor
├── seo_social.php             ← Open Graph & Twitter Card settings per domain
└── seo_audit.php              ← SEO health checker per domain
```

---

### 21.3 SEO Dashboard (admin/seo.php)

This is the **homepage for the SEO team** — shows a full picture of all domains at a glance.

```
┌───────────────────────────────────────────────────────────────────────────┐
│  SEO MANAGER DASHBOARD                                             [Admin] │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   SELECT DOMAIN:  [traveltourup.com ▼]  [travelup.pk ▼]  [travelup.ae ▼] │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │  DOMAIN: travelup.pk       Country: Pakistan       Status: ✅ Active │ │
│  │                                                                       │ │
│  │  SEO Health Score:  ████████░░  78/100                               │ │
│  │                                                                       │ │
│  │  ⚠  Missing meta description on 3 pages                             │ │
│  │  ⚠  2 pages have titles over 60 characters                          │ │
│  │  ✅  Sitemap submitted to Google Search Console                      │ │
│  │  ✅  hreflang tags in place on all pages                             │ │
│  │  ✅  Structured data valid on all pages                              │ │
│  │  ⚠  3 popular route pages have no unique content                    │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│  QUICK ACTIONS:                                                           │
│  [Edit Homepage SEO]  [Edit Page SEO]  [Manage Routes]  [Add Redirect]   │
│                                                                           │
│  PAGES SEO OVERVIEW:                                                      │
│  ┌──────────────────┬──────────┬──────────┬──────────┬────────────────┐  │
│  │ Page             │ Title    │ Meta Desc│ OG Image │ SEO Score      │  │
│  ├──────────────────┼──────────┼──────────┼──────────┼────────────────┤  │
│  │ Home             │ ✅ 52chr │ ✅ 148chr│ ✅ Set   │ ●●●●●  92/100 │  │
│  │ Flight Search    │ ✅ 58chr │ ✅ 155chr│ ✅ Set   │ ●●●●○  84/100 │  │
│  │ Hotel Search     │ ✅ 55chr │ ⚠ Missing│ ✅ Set   │ ●●●○○  65/100 │  │
│  │ Car Rental       │ ⚠ 68chr  │ ⚠ Missing│ ⚠ Missing│ ●●○○○  45/100 │  │
│  │ About Us         │ ✅ 48chr │ ✅ 142chr│ ⚠ Missing│ ●●●●○  80/100 │  │
│  └──────────────────┴──────────┴──────────┴──────────┴────────────────┘  │
└───────────────────────────────────────────────────────────────────────────┘
```

---

### 21.4 Per-Page SEO Editor — The Yoast-Equivalent Experience

This is the most important screen. When the SEO team edits any page's SEO, this is what they see — identical in concept to Yoast's meta box in WordPress:

```
┌───────────────────────────────────────────────────────────────────────────┐
│  EDIT PAGE SEO:  "Flight Search"         Domain: travelup.pk              │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  GOOGLE SEARCH PREVIEW                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │  travelup.pk › flights › search                                     │ │
│  │  Search Cheap Flights from Pakistan | TravelUp.pk                   │ │
│  │  Find best flight deals from Karachi, Lahore, Islamabad to Dubai,   │ │
│  │  London, Istanbul and more. Compare prices and book online.         │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│  ⚑ BASIC SEO                                                              │
│  ─────────────────────────────────────────────────────────────────────── │
│  Focus Keyword:     [cheap flights pakistan              ]               │
│                      Keyword usage: 3 times ✅                           │
│                                                                           │
│  SEO Title:         [Search Cheap Flights from Pakistan | TravelUp.pk]   │
│                      Characters: 54 / 60  ██████████████████████░░░░ ✅  │
│                                                                           │
│  Meta Description:  [Find best flight deals from Karachi, Lahore,       │
│                      Islamabad to Dubai, London, Istanbul and more.       │
│                      Compare prices and book online.                    ] │
│                      Characters: 156 / 160  ██████████████████████████░ ✅│
│                                                                           │
│  Canonical URL:     [https://travelup.pk/flights/search              ]   │
│                                                                           │
│  Robots:            [index, follow ▼]                                    │
│                                                                           │
│  ⚑ OPEN GRAPH (FACEBOOK / SOCIAL PREVIEW)                                │
│  ─────────────────────────────────────────────────────────────────────── │
│  OG Title:          [Search Flights from Pakistan - TravelUp.pk      ]   │
│  OG Description:    [Book cheap flights from Pakistan...             ]   │
│  OG Image:          [Upload Image]  [https://travelup.pk/img/og-pk.jpg]  │
│                                                                           │
│  FACEBOOK PREVIEW:                                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │  [OG Image Preview]  Search Flights from Pakistan - TravelUp.pk    │ │
│  │                      Book cheap flights from Pakistan...           │ │
│  │                      travelup.pk                                   │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│  ⚑ TWITTER CARD                                                           │
│  ─────────────────────────────────────────────────────────────────────── │
│  Twitter Card Type: [summary_large_image ▼]                              │
│  Twitter Title:     [Search Cheap Flights from Pakistan              ]   │
│  Twitter Desc:      [Best deals on flights from Pakistan...          ]   │
│  Twitter Image:     [https://travelup.pk/img/twitter-pk.jpg         ]   │
│                                                                           │
│  ⚑ ADVANCED                                                               │
│  ─────────────────────────────────────────────────────────────────────── │
│  Custom Head Tags:  [<meta name="custom" content="value" />          ]   │
│  Structured Data:   [See Structured Data Editor →]                       │
│                                                                           │
│  SEO SCORE ANALYSIS:                                                      │
│  ✅  Focus keyword in SEO title                                           │
│  ✅  Focus keyword in meta description                                    │
│  ✅  Focus keyword in URL                                                 │
│  ✅  Meta description length is good (156 chars)                          │
│  ✅  SEO title length is good (54 chars)                                  │
│  ⚠   Consider adding more internal links to this page                    │
│  ✅  OG image is set                                                      │
│                      Overall: ●●●●○  85/100                              │
│                                                                           │
│                            [💾 Save SEO Settings]                        │
└───────────────────────────────────────────────────────────────────────────┘
```

This editor covers **every single thing Yoast SEO does.** The SEO team edits these fields exactly the same way they would in WordPress.

---

### 21.5 PHP Backend: SEO Admin Panel Implementation

```php
<?php
// admin/seo_pages.php — SEO editor for any defined page

require_once '_config.php';
require_once '_core.php';

// All pages the SEO team can manage
$manageable_pages = [
    'home'            => 'Homepage',
    'flight_search'   => 'Flight Search',
    'hotel_search'    => 'Hotel Search',
    'car_rental'      => 'Car Rental',
    'about'           => 'About Us',
    'contact'         => 'Contact',
    'terms'           => 'Terms & Conditions',
    'privacy'         => 'Privacy Policy',
    'my_bookings'     => 'My Bookings',
];

// Get all active domains
$domains = $db->select('domain_settings', ['id','domain','site_name','country_code'], ['is_active' => 1]);

// Handle form submission
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['save_seo'])) {
    $domain_id    = (int) $_POST['domain_id'];
    $page_key     = $db->escape($_POST['page_key']);
    
    // Sanitize all SEO inputs
    $title           = htmlspecialchars(trim($_POST['title']), ENT_QUOTES, 'UTF-8');
    $meta_desc       = htmlspecialchars(trim($_POST['meta_description']), ENT_QUOTES, 'UTF-8');
    $og_title        = htmlspecialchars(trim($_POST['og_title']), ENT_QUOTES, 'UTF-8');
    $og_desc         = htmlspecialchars(trim($_POST['og_description']), ENT_QUOTES, 'UTF-8');
    $og_image        = filter_var(trim($_POST['og_image']), FILTER_SANITIZE_URL);
    $canonical       = filter_var(trim($_POST['canonical_url']), FILTER_SANITIZE_URL);
    $robots          = in_array($_POST['robots'], ['index, follow','noindex, follow','index, nofollow','noindex, nofollow'])
                       ? $_POST['robots'] : 'index, follow';
    $focus_keyword   = htmlspecialchars(trim($_POST['focus_keyword']), ENT_QUOTES, 'UTF-8');
    $twitter_title   = htmlspecialchars(trim($_POST['twitter_title']), ENT_QUOTES, 'UTF-8');
    $twitter_desc    = htmlspecialchars(trim($_POST['twitter_description']), ENT_QUOTES, 'UTF-8');
    $twitter_image   = filter_var(trim($_POST['twitter_image']), FILTER_SANITIZE_URL);
    $custom_head     = strip_tags(trim($_POST['custom_head_tags']),
                        '<meta><link><script>');  // Only allow safe head tags

    // Save or update
    $existing = $db->get('domain_seo', 'id', [
        'domain_id' => $domain_id,
        'page_key'  => $page_key
    ]);

    $data = [
        'title'            => $title,
        'meta_description' => $meta_desc,
        'og_title'         => $og_title,
        'og_description'   => $og_desc,
        'og_image'         => $og_image,
        'canonical_url'    => $canonical,
        'robots'           => $robots,
        'focus_keyword'    => $focus_keyword,
        'twitter_title'    => $twitter_title,
        'twitter_description' => $twitter_desc,
        'twitter_image'    => $twitter_image,
        'custom_head_tags' => $custom_head,
        'updated_at'       => date('Y-m-d H:i:s'),
    ];

    if ($existing) {
        $db->update('domain_seo', $data, ['id' => $existing]);
    } else {
        $db->insert('domain_seo', array_merge($data, [
            'domain_id' => $domain_id,
            'page_key'  => $page_key,
        ]));
    }

    // Invalidate cache for this domain
    $cache_file = __DIR__ . '/../cache/domain_config_' . md5('domain_config_' . $selected_domain) . '.cache';
    if (file_exists($cache_file)) unlink($cache_file);

    $success_message = 'SEO settings saved successfully!';
}

// Load existing SEO data for the selected domain + page
$selected_domain_id = (int) ($_GET['domain_id'] ?? $domains[0]['id']);
$selected_page      = $_GET['page_key'] ?? 'home';

$seo_data = $db->get('domain_seo', '*', [
    'domain_id' => $selected_domain_id,
    'page_key'  => $selected_page
]);

$domain_info = $db->get('domain_settings', '*', ['id' => $selected_domain_id]);
?>

<!-- Admin HTML template would follow here showing the form UI -->
```

#### Additional columns to add to `domain_seo` table for full Yoast-like features:

```sql
ALTER TABLE `domain_seo`
    ADD COLUMN `focus_keyword`        VARCHAR(255)       AFTER `meta_keywords`,
    ADD COLUMN `twitter_title`        VARCHAR(255)       AFTER `og_image`,
    ADD COLUMN `twitter_description`  TEXT               AFTER `twitter_title`,
    ADD COLUMN `twitter_image`        VARCHAR(500)       AFTER `twitter_description`,
    ADD COLUMN `twitter_card_type`    ENUM('summary','summary_large_image') DEFAULT 'summary_large_image',
    ADD COLUMN `seo_score`            TINYINT UNSIGNED   AFTER `twitter_card_type`,
    ADD COLUMN `last_audited_at`      TIMESTAMP NULL     AFTER `seo_score`;
```

---

### 21.6 Popular Route Pages — Dedicated SEO Management

This is unique to a travel site and is something WordPress does NOT handle well out of the box. In Approach 3, each popular route (e.g., "Karachi to Dubai Flights") gets its own SEO-optimized page. The SEO team can manage these from the admin panel:

```
┌───────────────────────────────────────────────────────────────────────────┐
│  POPULAR ROUTE PAGES — SEO MANAGER          Domain: travelup.pk           │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  [+ Add New Route Page]                    Search: [               🔍]   │
│                                                                           │
│  ┌──────────────────────────────────────┬──────────┬──────────┬────────┐ │
│  │ Route (URL)                          │ SEO Title│ Meta Desc│ Score  │ │
│  ├──────────────────────────────────────┼──────────┼──────────┼────────┤ │
│  │ /flights/karachi-to-dubai            │ ✅ Set   │ ✅ Set   │ 91/100│ │
│  │ /flights/lahore-to-jeddah            │ ✅ Set   │ ✅ Set   │ 87/100│ │
│  │ /flights/islamabad-to-london         │ ⚠ Missing│ ⚠ Missing│ 30/100│ │
│  │ /flights/karachi-to-riyadh           │ ✅ Set   │ ⚠ Missing│ 55/100│ │
│  └──────────────────────────────────────┴──────────┴──────────┴────────┘ │
│                                                                           │
│  EDIT ROUTE: Karachi to Dubai                                             │
│  ─────────────────────────────────────────────────────────────────────── │
│  Route:         KHI → DXB                                                │
│  URL Slug:      [karachi-to-dubai-flights                            ]   │
│  SEO Title:     [Cheap Flights from Karachi to Dubai | TravelUp.pk  ]   │
│  Meta Desc:     [Find cheapest Karachi to Dubai flights. Compare     ]   │
│                  [PIA, Emirates, flydubai. Book online. Best deals.  ]   │
│  H1 Heading:    [Cheap Flights from Karachi to Dubai                ]   │
│  Page Content:  [Rich text editor — write SEO content for this route]   │
│  Typical Price: [45,000 PKR]                                             │
│  OG Image:      [Upload image showing Karachi/Dubai]                     │
│  Schema Type:   [Flight + Offer schema — auto-generated]                 │
│                                                                           │
│                        [💾 Save Route SEO]                               │
└───────────────────────────────────────────────────────────────────────────┘
```

These route pages are **among the most powerful SEO assets** a travel site can have. They target high-intent keywords like *"cheap flights from Karachi to Dubai"* and rank directly in Google. WordPress would require manually creating and maintaining hundreds of pages. In Approach 3, they are database-driven and manageable from one screen.

---

### 21.7 Redirect Manager (admin/seo_redirects.php)

This feature costs **$99/year** with Yoast Premium. In Approach 3, it is built directly into the admin panel at no extra cost:

```
┌───────────────────────────────────────────────────────────────────────────┐
│  REDIRECT MANAGER                                  Domain: travelup.pk    │
├───────────────────────────────────────────────────────────────────────────┤
│  [+ Add New Redirect]                                                     │
│                                                                           │
│  ┌─────────────────────┬──────────────────────────┬──────────┬─────────┐ │
│  │ From (Old URL)      │ To (New URL)             │ Type     │ Actions │ │
│  ├─────────────────────┼──────────────────────────┼──────────┼─────────┤ │
│  │ /old-flights-page   │ /flights/search          │ 301      │ [Edit] │ │
│  │ /karachi-dubai      │ /flights/karachi-to-dubai│ 301      │ [Edit] │ │
│  │ /blog/old-post-slug │ /blog/new-post-slug      │ 301      │ [Edit] │ │
│  └─────────────────────┴──────────────────────────┴──────────┴─────────┘ │
│                                                                           │
│  ADD NEW REDIRECT:                                                        │
│  From URL:   [/old-page-url                    ]                         │
│  To URL:     [/new-page-url                    ]                         │
│  Type:       [301 - Permanent ▼]                                         │
│  Note:       [Reason for redirect              ]                         │
│              [+ Add Redirect]                                             │
└───────────────────────────────────────────────────────────────────────────┘
```

#### Database table for redirects:

```sql
CREATE TABLE `domain_redirects` (
    `id`          INT AUTO_INCREMENT PRIMARY KEY,
    `domain_id`   INT NOT NULL,
    `from_url`    VARCHAR(500) NOT NULL,
    `to_url`      VARCHAR(500) NOT NULL,
    `type`        SMALLINT NOT NULL DEFAULT 301,   -- 301 or 302
    `note`        VARCHAR(255),
    `hit_count`   INT DEFAULT 0,
    `is_active`   TINYINT(1) DEFAULT 1,
    `created_at`  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`domain_id`) REFERENCES `domain_settings`(`id`) ON DELETE CASCADE,
    INDEX `idx_from_url` (`domain_id`, `from_url`(191))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### Next.js middleware to serve redirects from DB (fetched via API):

```javascript
// middleware.js — execute DB-driven redirects
import { NextResponse } from 'next/server';

export async function middleware(request) {
    const host   = request.headers.get('host')?.replace(/^www\./, '') || '';
    const path   = request.nextUrl.pathname;

    // Check if current path has a redirect rule
    // (redirect rules are cached in edge / memory for performance)
    const redirectsCache = await getRedirectsForDomain(host); // Cached fetch
    const match = redirectsCache.find(r => r.from_url === path);

    if (match) {
        const redirectUrl = new URL(match.to_url, request.url);
        return NextResponse.redirect(redirectUrl, { status: match.type });
    }

    // ... rest of domain detection middleware
}
```

---

### 21.8 Structured Data / Schema Editor (admin/seo_schemas.php)

Schema.org structured data is what allows Google to show **rich results** (star ratings, prices, breadcrumbs, FAQ boxes) in search. In WordPress, Rank Math handles this — but Approach 3 manages it more powerfully because schema can be domain-specific and page-specific.

The SEO team can manage structured data types per domain from the admin:

```
┌───────────────────────────────────────────────────────────────────────────┐
│  STRUCTURED DATA MANAGER                       Domain: travelup.pk        │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ACTIVE SCHEMAS:                                                          │
│  ✅ Organization (TravelUp Pakistan)          [Edit] [Preview]            │
│  ✅ WebSite + SearchAction (sitelinks search)  [Edit] [Preview]           │
│  ✅ BreadcrumbList (auto on all pages)         [Auto-generated]           │
│  ✅ FAQPage (FAQ pages per domain)             [Edit] [Preview]           │
│  ✅ FlightReservation (booking confirmation)   [Auto-generated]           │
│  ⚠  LocalBusiness (add office address?)        [+ Add]                   │
│                                                                           │
│  EDIT: Organization Schema for travelup.pk                                │
│  ─────────────────────────────────────────────────────────────────────── │
│  @type:        TravelAgency (preset)                                      │
│  Name:         [TravelUp Pakistan                      ]                 │
│  URL:          [https://travelup.pk                    ]                 │
│  Logo:         [https://travelup.pk/assets/logo-pk.svg ]                 │
│  Description:  [Book cheap flights, hotels and cars... ]                 │
│  Country:      [PK]                                                       │
│  Phone:        [+92-XXX-XXXXXXX                        ]                 │
│  Email:        [support@travelup.pk                    ]                 │
│  Facebook:     [https://facebook.com/traveluppk        ]                 │
│  Instagram:    [https://instagram.com/traveluppk       ]                 │
│                                                                           │
│  JSON-LD PREVIEW:                                                         │
│  {                                                                        │
│    "@context": "https://schema.org",                                      │
│    "@type": "TravelAgency",                                               │
│    "name": "TravelUp Pakistan",                                           │
│    "url": "https://travelup.pk",                                          │
│    ...                                                                    │
│  }                                                                        │
│                            [💾 Save Schema]                               │
└───────────────────────────────────────────────────────────────────────────┘
```

---

### 21.9 SEO Audit Tool (admin/seo_audit.php)

Just like Yoast gives a traffic-light score per page, the SEO admin panel will include an audit tool that checks every SEO element and flags issues:

```php
<?php
// Automated SEO audit checks (run per domain)
class SEOAuditor {

    public function auditPage($domain_id, $page_key, $seo_data) {
        $issues   = [];
        $warnings = [];
        $passes   = [];
        $score    = 0;

        // 1. Title checks
        if (empty($seo_data['title'])) {
            $issues[] = 'SEO title is missing.';
        } elseif (strlen($seo_data['title']) > 60) {
            $warnings[] = 'SEO title is ' . strlen($seo_data['title']) . ' characters. Recommended: under 60.';
            $score += 5;
        } elseif (strlen($seo_data['title']) < 30) {
            $warnings[] = 'SEO title is too short (' . strlen($seo_data['title']) . ' chars). Aim for 40-60.';
            $score += 5;
        } else {
            $passes[] = 'SEO title length is good.';
            $score += 15;
        }

        // 2. Meta description checks
        if (empty($seo_data['meta_description'])) {
            $issues[] = 'Meta description is missing.';
        } elseif (strlen($seo_data['meta_description']) > 160) {
            $warnings[] = 'Meta description is too long (' . strlen($seo_data['meta_description']) . ' chars). Max: 160.';
            $score += 5;
        } else {
            $passes[] = 'Meta description length is good.';
            $score += 15;
        }

        // 3. Focus keyword in title
        if (!empty($seo_data['focus_keyword']) && !empty($seo_data['title'])) {
            if (stripos($seo_data['title'], $seo_data['focus_keyword']) !== false) {
                $passes[] = 'Focus keyword found in SEO title.';
                $score += 15;
            } else {
                $warnings[] = 'Focus keyword "' . $seo_data['focus_keyword'] . '" not found in SEO title.';
            }
        }

        // 4. Focus keyword in meta description
        if (!empty($seo_data['focus_keyword']) && !empty($seo_data['meta_description'])) {
            if (stripos($seo_data['meta_description'], $seo_data['focus_keyword']) !== false) {
                $passes[] = 'Focus keyword found in meta description.';
                $score += 10;
            } else {
                $warnings[] = 'Focus keyword not in meta description.';
            }
        }

        // 5. OG image check
        if (empty($seo_data['og_image'])) {
            $warnings[] = 'OG image not set. Social shares will have no image.';
        } else {
            $passes[] = 'OG image is set.';
            $score += 10;
        }

        // 6. Canonical URL check
        if (empty($seo_data['canonical_url'])) {
            $warnings[] = 'Canonical URL not set. Auto-canonical will be used.';
            $score += 5;
        } else {
            $passes[] = 'Canonical URL is set.';
            $score += 10;
        }

        // 7. Robots check
        if (!empty($seo_data['robots']) && $seo_data['robots'] !== 'index, follow') {
            $warnings[] = 'Page is set to "' . $seo_data['robots'] . '". Verify this is intentional.';
        } else {
            $passes[] = 'Robots setting allows indexing.';
            $score += 10;
        }

        // 8. Structured data check
        if (!empty($seo_data['structured_data'])) {
            $passes[] = 'Structured data (JSON-LD) is configured.';
            $score += 15;
        } else {
            $warnings[] = 'No page-specific structured data. Consider adding FAQ, BreadcrumbList, or offer schema.';
        }

        return [
            'score'    => min($score, 100),
            'issues'   => $issues,
            'warnings' => $warnings,
            'passes'   => $passes,
        ];
    }
}
```

---

### 21.10 Blog / Content CMS with SEO Fields

Every blog post created in the admin panel will have a built-in SEO editor — just like WordPress Gutenberg post editor with Yoast at the bottom.

```
┌───────────────────────────────────────────────────────────────────────────┐
│  BLOG EDITOR                                       Domain: travelup.pk    │
├───────────────────────────────────────────────────────────────────────────┤
│  Post Title:    [Top 10 Cheap Flights from Karachi to Dubai in 2026  ]   │
│  Slug:          [cheap-flights-karachi-dubai-2026                    ]   │
│  Language:      [Urdu ▼]  [English ▼]                                    │
│  Category:      [Flight Tips ▼]                                           │
│  Featured Image:[Upload Image]                                            │
│                                                                           │
│  CONTENT (Rich Text Editor):                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │ [B] [I] [U] [H1] [H2] [H3] [Link] [Image] [List] [Quote]          │ │
│  │                                                                     │ │
│  │ Write your blog post here...                                        │ │
│  │                                                                     │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│  ▼ SEO SETTINGS (fold/unfold — just like Yoast meta box in WP)           │
│  ─────────────────────────────────────────────────────────────────────── │
│  SEO Title:        [Top 10 Cheap Flights Karachi to Dubai 2026 |...  ]   │
│                     Characters: 58/60  ✅                                │
│  Meta Description: [Looking for cheap flights from Karachi to Dubai? ]   │
│                    [We compared all airlines for best prices in 2026. ]   │
│                     Characters: 152/160  ✅                              │
│  Focus Keyword:    [cheap flights karachi to dubai                   ]   │
│  OG Image:         [Use featured image ▼]                                │
│  Canonical URL:    [Auto  ▼]  (or set custom)                            │
│  Robots:           [index, follow ▼]                                     │
│                                                                           │
│  SEO SCORE:  ●●●●○  88/100                                               │
│  ✅ Keyword in title   ✅ Keyword in meta   ✅ OG image set              │
│  ⚠ Add more internal links (detected: 1, recommended: 3+)               │
│                                                                           │
│           [Save Draft]                [Publish]                          │
└───────────────────────────────────────────────────────────────────────────┘
```

---

### 21.11 Technical SEO Advantages of Next.js Over WordPress

This section is for the SEO team to understand why Approach 3 is **technically superior** to WordPress for SEO — beyond just the admin panel features.

#### Core Web Vitals Comparison


| Metric                             | WordPress (typical)                 | Next.js (Approach 3)              | SEO Impact              |
| ---------------------------------- | ----------------------------------- | --------------------------------- | ----------------------- |
| **LCP (Largest Contentful Paint)** | 3–7 seconds                         | **0.8–2.0 seconds** (SSR+CDN)     | Google ranking factor   |
| **FID / INP (Input Delay)**        | 100–400ms                           | **< 50ms** (minimal JS)           | Google ranking factor   |
| **CLS (Cumulative Layout Shift)**  | 0.15–0.35 (plugins shifting layout) | **< 0.05** (controlled rendering) | Google ranking factor   |
| **Lighthouse Performance Score**   | 55–75 (with caching plugins)        | **90–100**                        | Indirect ranking signal |
| **TTFB (Time to First Byte)**      | 500ms–2s                            | **50–200ms** (edge caching)       | Google ranking factor   |


Google has confirmed Core Web Vitals as a **direct ranking factor**. A faster site = better rankings. This alone is a major SEO advantage of Approach 3 over WordPress.

#### Rendering Strategy and Indexability


| Page Type                              | Rendering Method                     | SEO Benefit                                                 |
| -------------------------------------- | ------------------------------------ | ----------------------------------------------------------- |
| **Homepage**                           | SSR (Server-Side Rendering)          | Google sees full HTML on first crawl                        |
| **Flight Search**                      | SSR                                  | Search page is fully indexable with meta tags               |
| **Popular Route pages** (KHI→DXB etc.) | SSG (Static Site Generation)         | Pre-built pages = fastest possible crawl                    |
| **Blog posts**                         | SSG + ISR (auto-rebuilds on publish) | Static speed + fresh content                                |
| **Booking flow**                       | Client-side (CSR)                    | Booking pages intentionally not indexed (logged-in content) |


> **WordPress by default is SSR** (PHP rendering) — which is good for basic indexability. But it does NOT offer SSG or ISR. Every page load hits the database. Next.js intelligently pre-builds content pages, serving static HTML from CDN — **Googlebot sees the fastest possible response.**

#### Automatic SEO Features in Next.js (No Plugin Needed)


| Feature                 | How Next.js Handles It Automatically                                          |
| ----------------------- | ----------------------------------------------------------------------------- |
| **Canonical URLs**      | `alternates.canonical` in `generateMetadata()`                                |
| **Open Graph tags**     | `openGraph` object in `generateMetadata()`                                    |
| **Twitter Cards**       | `twitter` object in `generateMetadata()`                                      |
| **robots.txt**          | `app/robots.js` — per-domain, auto-served                                     |
| **XML Sitemap**         | `app/sitemap.js` — per-domain, dynamic, auto-updated                          |
| **Image optimization**  | `next/image` — WebP conversion, lazy loading, correct sizes                   |
| **Font optimization**   | `next/font` — no render-blocking, self-hosted fonts                           |
| **Script optimization** | `next/script` — controls loading strategy for third-party scripts (GTM, etc.) |
| **Meta viewport**       | Automatic for all pages                                                       |
| **JSON-LD output**      | `<script type="application/ld+json">` in layout/page                          |


---

### 21.12 SEO Workflow for the SEO Team — Day-to-Day Operations

Here is the exact workflow the SEO team will follow. It mirrors WordPress usage almost identically.

#### Daily/Weekly SEO Tasks

```
1. Login to admin panel → https://traveltourup.com/admin/

2. Navigate to: SEO Manager → Select Domain (e.g., travelup.pk)

3. Check SEO Dashboard:
   - Review page SEO scores
   - Fix any flagged issues (missing titles, meta descriptions, etc.)

4. Manage Homepage SEO:
   - SEO Manager → Pages → Home → Edit (same as editing Yoast settings in WP)

5. Add/edit blog posts:
   - Blog Manager → New Post → Write content → Fill SEO fields at bottom

6. Add popular route pages:
   - Route Pages → Add New Route → Set title/desc/content for that route

7. Monitor & update:
   - Check Google Search Console (separate property per domain)
   - Update meta descriptions for pages with low CTR
   - Add new redirects when pages are renamed

8. New domain setup:
   - Domains → Add New Domain (fill in country, currency, language)
   - SEO Manager → Select new domain → Fill in all page SEO settings
   - Submit sitemap to Google Search Console for new domain
```

#### What the SEO Team CANNOT Do (Compared to WordPress) — and Solutions


| WordPress Feature                     | Available in Approach 3?     | Solution                                                |
| ------------------------------------- | ---------------------------- | ------------------------------------------------------- |
| Gutenberg block editor                | Rich text editor (similar) ✅ | Custom admin rich text editor (e.g., TinyMCE or Quill)  |
| 60,000+ plugins                       | No plugin ecosystem          | Most WP plugins solve problems Next.js handles natively |
| Auto-save drafts                      | ✅ Build into admin           | Simple autosave with `setInterval` + AJAX               |
| Post revisions                        | ✅ Can be added               | `domain_content_revisions` table                        |
| Multi-author workflow                 | ✅ Already in admin           | Existing `users_roles.php` handles this                 |
| Media library                         | ✅ Already exists             | Existing `uploads/` system in admin                     |
| WordPress REST API for external tools | PHP API serves same purpose  | Any external SEO tool can use our `/api/`               |


---

### 21.13 Integration with Google Tools


| Tool                          | Integration Method                                            | Setup Required              |
| ----------------------------- | ------------------------------------------------------------- | --------------------------- |
| **Google Search Console**     | Add TXT verification record per domain in Cloudflare DNS      | Once per domain             |
| **Google Analytics 4**        | Single GA4 property with domain as custom dimension           | One-time setup              |
| **Google Tag Manager**        | Single GTM container — domain-aware triggers                  | One-time setup              |
| **Google PageSpeed Insights** | No integration needed — just use the tool URL periodically    | Ongoing monitoring          |
| **Google Rich Results Test**  | Test structured data at `search.google.com/test/rich-results` | Ongoing testing             |
| **Bing Webmaster Tools**      | Add XML sitemap per domain                                    | Once per domain             |
| **Ahrefs / SEMrush / Moz**    | Standard external tools — works with any site                 | Ongoing — same as WordPress |


---

### 21.14 SEO Feature Checklist: What to Present to Your SEO Team

Use this as a direct checklist when presenting to the SEO team. Every item is either **already handled automatically** or **manageable through the SEO admin panel:**

```
TECHNICAL SEO (Automatic — No Manual Action Needed):
□ XML Sitemap generated automatically per domain
□ robots.txt generated per domain
□ Canonical URLs on all pages
□ hreflang tags across all country domains (better than WordPress)
□ Open Graph tags on all pages
□ Twitter Card tags on all pages
□ Mobile-first responsive (built into Next.js)
□ HTTPS enforced via Cloudflare on all domains
□ Structured data (Organization, WebSite, BreadcrumbList) on all pages
□ Image optimization (WebP, lazy loading) via next/image
□ Font optimization (no render-blocking fonts) via next/font
□ Core Web Vitals optimized (LCP < 2.5s, CLS < 0.1)
□ Lighthouse score 90-100 on all pages
□ HTTP 301 redirects from www to non-www
□ Per-domain Google Search Console sitemap URL

ON-PAGE SEO (Managed via Admin Panel — SEO Team Controls):
□ SEO title per page per domain (with character counter + preview)
□ Meta description per page per domain (with character counter + preview)
□ Focus keyword per page per domain
□ Google Search Preview (visual snippet preview)
□ OG title + description + image per page per domain
□ Facebook preview in admin
□ Twitter Card title + description + image per page
□ Canonical URL override per page
□ Robots (noindex/nofollow) per page
□ Custom JSON-LD structured data per page
□ Custom <head> tags per page if needed
□ SEO score/audit per page (traffic-light system)

CONTENT SEO (Managed via Admin Panel):
□ Blog post editor with full SEO fields (title, meta, keyword, OG)
□ Per-domain blog content (each country has its own blog)
□ Popular route pages with SEO content per domain
□ FAQ pages per domain (structured data + content)
□ Category/tag pages for blog content

MULTI-DOMAIN SEO (Automatic — Better Than WordPress):
□ Per-domain sitemaps at /sitemap.xml
□ Per-domain robots.txt at /robots.txt
□ Per-domain meta tags (different title/desc per country)
□ Automatic hreflang linking between country domains
□ Separate Google Search Console property per domain
□ Per-domain Structured Data (country-specific Organization schema)
□ Per-domain OG images and social branding
□ Per-domain language/direction (RTL for Arabic/Urdu)
□ Geo meta tags (geo.region, geo.placename per domain)

SEO TOOLS IN ADMIN PANEL:
□ SEO health dashboard per domain
□ Redirect manager (301/302) — free (vs Yoast Premium)
□ Per-page SEO audit with issue/warning/pass breakdown
□ Sitemap viewer and manual regeneration
□ Schema editor with JSON-LD preview
□ Per-domain content manager (blog, pages, routes)
```

---

### 21.15 Summary: Why Approach 3 SEO Is Stronger Than WordPress


| Comparison Point               | WordPress + Yoast                                      | Approach 3 (Next.js + Custom Panel)                |
| ------------------------------ | ------------------------------------------------------ | -------------------------------------------------- |
| **On-page SEO editing**        | ✅ Excellent (Yoast plugin)                             | ✅ Excellent (Custom admin panel — same experience) |
| **Technical SEO**              | ✅ Good (with correct setup)                            | ✅ Excellent (Next.js handles natively)             |
| **Core Web Vitals**            | ⚠ Average–Good (requires heavy caching)                | ✅ Excellent (SSR/SSG purpose-built)                |
| **Multi-domain SEO**           | ❌ Requires multisite or separate installs              | ✅ Native — manage ALL domains from one panel       |
| **hreflang management**        | ❌ Needs expensive WPML plugin                          | ✅ Built-in, automatic for all country domains      |
| **Popular route SEO pages**    | ⚠ Manually created per page                            | ✅ Database-driven, bulk managed from admin         |
| **Per-domain sitemaps**        | ❌ Not native (requires multisite)                      | ✅ Automatic per domain                             |
| **Redirect manager**           | ❌ Yoast Free doesn't include it ($99/yr Yoast Premium) | ✅ Built-in, free                                   |
| **Structured data / Schema**   | ✅ Rank Math covers basic types                         | ✅ Full custom JSON-LD per page, auto + manual      |
| **SEO admin panel ease**       | ✅ Familiar (many SEO teams know it)                    | ✅ Same concept — custom UI with same fields        |
| **Security attack surface**    | ❌ High (WordPress targeted by hackers)                 | ✅ Low (no WordPress)                               |
| **Page speed**                 | ⚠ 60–80 Lighthouse (plugins slow it down)              | ✅ 90–100 Lighthouse                                |
| **Cost (ongoing)**             | ❌ Yoast Premium $99/yr × N domains                     | ✅ Free — all built in                              |
| **Scalability to new domains** | ❌ New install + setup per domain                       | ✅ DB row + DNS record = new domain live in hours   |


> **Final verdict for the SEO team:** Approach 3 offers every on-page SEO feature that WordPress/Yoast provides, managed from a similarly intuitive admin panel. It additionally provides technical SEO advantages (Core Web Vitals, SSR/SSG speed, automatic multi-domain hreflang, per-domain sitemaps) that WordPress cannot match — even with plugins. The SEO team will have full control over every SEO element for every domain from a single admin interface.

---

## 22. Complete SEO Panel Coding Plan — Libraries, Complexity & Full Implementation

> **Purpose:** This section is the complete developer guide for building the SEO admin panel inside your existing PHP admin panel (`admin/`). It covers what libraries exist, which ones to use, exact complexity, and every file you need to create — written to match your exact existing codebase (Medoo ORM, jQuery, Bootstrap 5, `GET()`/`INSERT()`/`UPDATE()` helpers).

---

### 22.1 Are There Ready-Made SEO Panel Libraries?

**Short answer: No dedicated SEO admin panel library exists for PHP custom apps.** Yoast SEO and Rank Math are WordPress-only plugins — they cannot be installed or used outside WordPress. Here is the full landscape:

#### What Exists (and What Is Relevant for You)


| Tool / Library        | What It Does                    | Usable in Your Stack? | Verdict                         |
| --------------------- | ------------------------------- | --------------------- | ------------------------------- |
| **Yoast SEO**         | Full WP SEO plugin              | ❌ WordPress only      | Not usable                      |
| **Rank Math**         | Full WP SEO plugin              | ❌ WordPress only      | Not usable                      |
| **Slim SEO**          | WP SEO plugin                   | ❌ WordPress only      | Not usable                      |
| **TinyMCE** (free)    | Rich text / blog editor         | ✅ Works in any PHP    | **USE THIS** for blog editor    |
| **CKEditor 5** (free) | Rich text / blog editor         | ✅ Works in any PHP    | Alternative to TinyMCE          |
| **Quill.js**          | Lightweight rich text editor    | ✅ Works in any PHP    | Lighter than TinyMCE            |
| **ACE Editor**        | Code/JSON editor for schema     | ✅ Works in any PHP    | **USE THIS** for JSON-LD editor |
| **Spectrum.js**       | Color picker (for theme colors) | ✅ Works in any PHP    | USE for theme color inputs      |
| **Sortable.js**       | Drag & drop (route ordering)    | ✅ Works in any PHP    | USE for route ordering          |
| **jQuery**            | Already in your admin           | ✅ Already loaded      | Already available               |
| **Bootstrap 5**       | Already in your admin           | ✅ Already loaded      | Already available               |


#### The SEO Preview (Google Snippet / OG Preview)

There is **no library** for the Google Search Preview appearance — it is always a **~30 lines of custom JavaScript + CSS**. All CMS tools including Yoast build this themselves. It is straightforward.

**Conclusion:** You need to build the SEO panel from scratch using your existing pattern, with 2–3 small libraries (TinyMCE, ACE Editor). This is **not complex** — it directly follows the exact same pattern as your existing `blogs.php` and `settings.php` files.

---

### 22.2 Complexity Assessment

This is the most important section before starting development. Here is the **honest complexity breakdown**:

#### Overall Complexity: LOW-MEDIUM


| Module                                       | Files to Create          | Complexity     | Hours (1 developer) | Why                                               |
| -------------------------------------------- | ------------------------ | -------------- | ------------------- | ------------------------------------------------- |
| **DB Schema (SQL)**                          | 1 SQL file               | 🟢 Low         | 1–2h                | Standard MySQL — same pattern as existing tables  |
| **seo_domains.php** — Domain list + add/edit | 1 PHP file               | 🟢 Low         | 3–4h                | Same pattern as `settings.php`                    |
| **seo_pages.php** — Per-page meta editor     | 1 PHP file               | 🟢 Low         | 4–5h                | Same pattern as `settings.php` — just more fields |
| **Google SERP preview**                      | ~30 lines JS             | 🟢 Low         | 1h                  | Pure JS character count + div update              |
| **Facebook OG preview**                      | ~20 lines JS             | 🟢 Low         | 1h                  | Same as above                                     |
| **seo_routes.php** — Route page editor       | 1 PHP file               | 🟢 Low         | 4–5h                | Same pattern as `blogs.php` (CRUD)                |
| **seo_redirects.php** — Redirect manager     | 1 PHP file               | 🟢 Low         | 3–4h                | Same pattern as any CRUD page                     |
| **seo_audit.php** — Health checker           | 1 PHP file + 1 PHP class | 🟡 Medium      | 4–6h                | Loops through SEO records, scores them            |
| **seo_schemas.php** — JSON-LD editor         | 1 PHP file               | 🟡 Medium      | 4–5h                | ACE Editor integration                            |
| **Blog editor with SEO tab**                 | Modify `blogs.php`       | 🟢 Low         | 2–3h                | Add SEO fields to existing blogs form             |
| **Navbar menu entries**                      | Modify `_header.php`     | 🟢 Low         | 0.5h                | Add SEO menu items                                |
| **Cache invalidation**                       | Small helper function    | 🟢 Low         | 0.5h                | Delete cache file on SEO save                     |
| **TOTAL**                                    | **~9 new files**         | **LOW-MEDIUM** | **~28–36h**         | **1 developer, 1 working week**                   |


#### What Makes It Easy (Given Your Existing Stack)

1. **You already have all the patterns** — `blogs.php`, `settings.php`, `cms.php` show exactly how CRUD pages work
2. **Medoo ORM is already set up** — `GET()`, `INSERT()`, `UPDATE()`, `DELETE()` functions ready to use
3. **Authentication and CSRF are already handled** — just call `auth_check()` and `CSRF()` at the top
4. **Bootstrap 5 + jQuery already loaded** — all UI components ready
5. **File upload pattern already exists** in `settings.php` — reuse for OG image uploads
6. **No new backend API needed** — all DB operations from admin PHP directly

---

### 22.3 Required Libraries and How to Load Them

Only 2 external libraries need to be added. Load them only in the SEO admin pages (not globally):

#### Library 1: TinyMCE (Rich Text Editor for Blog + Route content)

```html
<!-- Add to <head> in seo_routes.php and seo_pages.php where needed -->
<!-- FREE CDN version — no API key needed for basic use -->
<script src="https://cdn.tiny.cloud/1/no-api-key/tinymce/6/tinymce.min.js" referrerpolicy="origin"></script>
<script>
tinymce.init({
    selector: '.tinymce-editor',
    plugins: 'lists link image code wordcount',
    toolbar: 'undo redo | formatselect | bold italic underline | bullist numlist | link image | code',
    height: 350,
    menubar: false,
    // No API key needed for self-hosted or basic use
    // For no-branding get free API key at: https://www.tiny.cloud (free tier available)
});
</script>
```

> **Note:** For production, register for a free API key at tiny.cloud (free forever tier). This removes the warning notification. It takes 2 minutes.

#### Library 2: ACE Editor (JSON-LD Structured Data Code Editor)

```html
<!-- For seo_schemas.php only -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/ace/1.32.6/ace.min.js"></script>
<script>
// Initialize ACE editor on a div
var schemaEditor = ace.edit("schema-editor");
schemaEditor.setTheme("ace/theme/monokai");
schemaEditor.session.setMode("ace/mode/json");
schemaEditor.setOptions({
    fontSize: "14px",
    showPrintMargin: false,
    minLines: 15,
    maxLines: 30
});
</script>
```

#### No Other Libraries Needed

Everything else — character counters, SERP preview, OG preview, score calculation — is done with plain JavaScript. Examples are shown in the code below.

---

### 22.4 Complete Database Schema (seo_install.sql)

Create the file `admin/seo_install.sql` — run this once to set up all SEO tables:

```sql
-- ============================================================
-- SEO PANEL DATABASE SCHEMA
-- Run once: mysql -u root -p traveltour_db < seo_install.sql
-- ============================================================

-- 1. Domain Settings (core domain registry)
CREATE TABLE IF NOT EXISTS `domain_settings` (
    `id`                  INT AUTO_INCREMENT PRIMARY KEY,
    `domain`              VARCHAR(255) NOT NULL UNIQUE,
    `country_code`        CHAR(2) NOT NULL,
    `country_name`        VARCHAR(100) NOT NULL,
    `site_name`           VARCHAR(255) NOT NULL,
    `site_tagline`        VARCHAR(500),
    `default_language`    VARCHAR(5) NOT NULL DEFAULT 'en',
    `default_currency`    VARCHAR(3) NOT NULL DEFAULT 'USD',
    `supported_languages` VARCHAR(100) DEFAULT '["en"]',
    `supported_currencies`VARCHAR(100) DEFAULT '["USD"]',
    `timezone`            VARCHAR(50) DEFAULT 'UTC',
    `direction`           ENUM('ltr','rtl') DEFAULT 'ltr',
    `is_default`          TINYINT(1) DEFAULT 0,
    `is_active`           TINYINT(1) DEFAULT 1,
    `created_at`          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at`          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_domain` (`domain`),
    INDEX `idx_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Per-Domain Per-Page SEO Settings (the main SEO table)
CREATE TABLE IF NOT EXISTS `domain_seo` (
    `id`                  INT AUTO_INCREMENT PRIMARY KEY,
    `domain_id`           INT NOT NULL,
    `page_key`            VARCHAR(100) NOT NULL,
    `focus_keyword`       VARCHAR(255),
    `title`               VARCHAR(255),
    `meta_description`    TEXT,
    `meta_keywords`       TEXT,
    `og_title`            VARCHAR(255),
    `og_description`      TEXT,
    `og_image`            VARCHAR(500),
    `twitter_title`       VARCHAR(255),
    `twitter_description` TEXT,
    `twitter_image`       VARCHAR(500),
    `twitter_card_type`   ENUM('summary','summary_large_image') DEFAULT 'summary_large_image',
    `canonical_url`       VARCHAR(500),
    `robots`              VARCHAR(100) DEFAULT 'index, follow',
    `structured_data`     TEXT,
    `custom_head_tags`    TEXT,
    `seo_score`           TINYINT UNSIGNED DEFAULT 0,
    `created_at`          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at`          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`domain_id`) REFERENCES `domain_settings`(`id`) ON DELETE CASCADE,
    UNIQUE KEY `uk_domain_page` (`domain_id`, `page_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Per-Domain Design/Theme Settings
CREATE TABLE IF NOT EXISTS `domain_themes` (
    `id`               INT AUTO_INCREMENT PRIMARY KEY,
    `domain_id`        INT NOT NULL UNIQUE,
    `primary_color`    VARCHAR(7) DEFAULT '#0066FF',
    `secondary_color`  VARCHAR(7) DEFAULT '#FF6600',
    `accent_color`     VARCHAR(7) DEFAULT '#00CC66',
    `logo_url`         VARCHAR(500),
    `favicon_url`      VARCHAR(500),
    `hero_image_url`   VARCHAR(500),
    `hero_title`       VARCHAR(255),
    `hero_subtitle`    VARCHAR(500),
    `custom_css`       TEXT,
    `created_at`       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at`       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`domain_id`) REFERENCES `domain_settings`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Popular Routes Per Domain (SEO landing pages for each route)
CREATE TABLE IF NOT EXISTS `domain_popular_routes` (
    `id`               INT AUTO_INCREMENT PRIMARY KEY,
    `domain_id`        INT NOT NULL,
    `origin_code`      VARCHAR(3) NOT NULL,
    `origin_name`      VARCHAR(100) NOT NULL,
    `destination_code` VARCHAR(3) NOT NULL,
    `destination_name` VARCHAR(100) NOT NULL,
    `slug`             VARCHAR(255),
    `h1_heading`       VARCHAR(255),
    `seo_title`        VARCHAR(255),
    `seo_description`  TEXT,
    `og_image`         VARCHAR(500),
    `page_content`     LONGTEXT,
    `typical_price`    DECIMAL(10,2),
    `currency`         VARCHAR(3),
    `display_order`    INT DEFAULT 0,
    `is_active`        TINYINT(1) DEFAULT 1,
    `created_at`       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at`       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`domain_id`) REFERENCES `domain_settings`(`id`) ON DELETE CASCADE,
    UNIQUE KEY `uk_domain_slug` (`domain_id`, `slug`),
    INDEX `idx_route` (`origin_code`, `destination_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Redirect Manager
CREATE TABLE IF NOT EXISTS `domain_redirects` (
    `id`          INT AUTO_INCREMENT PRIMARY KEY,
    `domain_id`   INT NOT NULL,
    `from_url`    VARCHAR(500) NOT NULL,
    `to_url`      VARCHAR(500) NOT NULL,
    `type`        SMALLINT NOT NULL DEFAULT 301,
    `note`        VARCHAR(255),
    `hit_count`   INT DEFAULT 0,
    `is_active`   TINYINT(1) DEFAULT 1,
    `created_at`  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`domain_id`) REFERENCES `domain_settings`(`id`) ON DELETE CASCADE,
    INDEX `idx_from` (`domain_id`, `from_url`(191))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Blog/CMS content per domain (extends existing blogs table with domain awareness)
-- If you want domain-specific blog posts, add domain_id to existing blogs table:
ALTER TABLE `blogs`
    ADD COLUMN IF NOT EXISTS `domain_id`   INT NULL AFTER `id`,
    ADD COLUMN IF NOT EXISTS `seo_title`   VARCHAR(255) NULL AFTER `post_slug`,
    ADD COLUMN IF NOT EXISTS `seo_desc`    TEXT NULL AFTER `seo_title`,
    ADD COLUMN IF NOT EXISTS `focus_kw`    VARCHAR(255) NULL AFTER `seo_desc`,
    ADD COLUMN IF NOT EXISTS `og_image`    VARCHAR(500) NULL AFTER `focus_kw`,
    ADD COLUMN IF NOT EXISTS `robots`      VARCHAR(100) DEFAULT 'index, follow' AFTER `og_image`,
    ADD INDEX IF NOT EXISTS `idx_domain_id` (`domain_id`);

-- 7. Default domain row
INSERT IGNORE INTO `domain_settings`
(`domain`,`country_code`,`country_name`,`site_name`,`site_tagline`,
 `default_language`,`default_currency`,`timezone`,`direction`,`is_default`)
VALUES
('traveltourup.com','US','United States','TravelTourUp',
 'Book Flights, Hotels & Cars Worldwide','en','USD','America/New_York','ltr',1);
```

---

### 22.5 File Structure — All Files to Create

```
admin/
├── seo.php                  ← NEW: SEO Dashboard (index for SEO module)
├── seo_domains.php          ← NEW: Manage all domains (add/edit/delete)
├── seo_pages.php            ← NEW: Per-page SEO editor (Yoast meta box equivalent)
├── seo_routes.php           ← NEW: Popular route pages SEO manager
├── seo_redirects.php        ← NEW: 301/302 Redirect manager
├── seo_audit.php            ← NEW: SEO health audit per domain
├── seo_schemas.php          ← NEW: Structured data / JSON-LD editor
└── lib/
    └── SeoAuditor.php       ← NEW: SEO audit scoring class
```

Modifications to existing files:

```
admin/_header.php            ← ADD: SEO menu section in sidebar
admin/blogs.php              ← ADD: SEO tab (focus kw, seo title, meta desc) to blog editor
```

---

### 22.6 File 1: seo_domains.php — Domain Manager

This is the first file to create — manages the `domain_settings` table. Pattern: identical to `settings.php`.

```php
<?php
// admin/seo_domains.php
// Manage domains: add, edit, delete, activate/deactivate

require_once '_config.php';
auth_check();
CSRF();

// ── HANDLE POST ────────────────────────────────────────────────────────────

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    // ADD NEW DOMAIN
    if (isset($_POST['add_domain'])) {
        $params = [
            'domain'               => strtolower(trim(htmlspecialchars($_POST['domain'], ENT_QUOTES, 'UTF-8'))),
            'country_code'         => strtoupper(substr(preg_replace('/[^A-Za-z]/','',$_POST['country_code']),0,2)),
            'country_name'         => htmlspecialchars($_POST['country_name'], ENT_QUOTES, 'UTF-8'),
            'site_name'            => htmlspecialchars($_POST['site_name'], ENT_QUOTES, 'UTF-8'),
            'site_tagline'         => htmlspecialchars($_POST['site_tagline'], ENT_QUOTES, 'UTF-8'),
            'default_language'     => htmlspecialchars($_POST['default_language'], ENT_QUOTES, 'UTF-8'),
            'default_currency'     => strtoupper(substr(preg_replace('/[^A-Za-z]/','',$_POST['default_currency']),0,3)),
            'timezone'             => htmlspecialchars($_POST['timezone'], ENT_QUOTES, 'UTF-8'),
            'direction'            => in_array($_POST['direction'],['ltr','rtl']) ? $_POST['direction'] : 'ltr',
            'is_active'            => 1,
        ];
        INSERT('domain_settings', $params);
        ALERT_MSG('Domain added successfully');
        REDIRECT('seo_domains.php');
    }

    // UPDATE DOMAIN
    if (isset($_POST['update_domain'])) {
        $id = (int)$_POST['domain_id'];
        $params = [
            'country_code'     => strtoupper(substr(preg_replace('/[^A-Za-z]/','',$_POST['country_code']),0,2)),
            'country_name'     => htmlspecialchars($_POST['country_name'], ENT_QUOTES, 'UTF-8'),
            'site_name'        => htmlspecialchars($_POST['site_name'], ENT_QUOTES, 'UTF-8'),
            'site_tagline'     => htmlspecialchars($_POST['site_tagline'], ENT_QUOTES, 'UTF-8'),
            'default_language' => htmlspecialchars($_POST['default_language'], ENT_QUOTES, 'UTF-8'),
            'default_currency' => strtoupper(substr(preg_replace('/[^A-Za-z]/','',$_POST['default_currency']),0,3)),
            'timezone'         => htmlspecialchars($_POST['timezone'], ENT_QUOTES, 'UTF-8'),
            'direction'        => in_array($_POST['direction'],['ltr','rtl']) ? $_POST['direction'] : 'ltr',
            'is_active'        => isset($_POST['is_active']) ? 1 : 0,
        ];
        UPDATE('domain_settings', $params, $id);
        ALERT_MSG('Domain updated');
        REDIRECT('seo_domains.php');
    }

    // DELETE DOMAIN
    if (isset($_POST['delete_domain'])) {
        $id = (int)$_POST['domain_id'];
        // Never delete the default domain
        $dom = GET('domain_settings', ['id' => $id]);
        if (!empty($dom) && $dom[0]->is_default != 1) {
            DELETE('domain_settings', ['id' => $id]);
            ALERT_MSG('Domain deleted');
        } else {
            ALERT_MSG('Cannot delete the default domain');
        }
        REDIRECT('seo_domains.php');
    }
}

// ── LOAD DATA ──────────────────────────────────────────────────────────────

$domains = GET('domain_settings', []);
$edit_domain = null;
if (!empty($_GET['edit'])) {
    $edit_domain = GET('domain_settings', ['id' => (int)$_GET['edit']]);
    $edit_domain = !empty($edit_domain) ? $edit_domain[0] : null;
}

$title = 'SEO — Domains';
include '_header.php';
?>

<div class="page_head">
    <div class="page_head_title"><h3>SEO Domains</h3></div>
    <div class="page_head_actions">
        <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#addDomainModal">
            + Add New Domain
        </button>
    </div>
</div>

<div class="page_card">
    <div class="card">
        <div class="card-body">
            <table class="table table-hover align-middle">
                <thead>
                    <tr>
                        <th>Domain</th>
                        <th>Country</th>
                        <th>Language</th>
                        <th>Currency</th>
                        <th>Direction</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($domains as $d): ?>
                    <tr>
                        <td>
                            <strong><?= htmlspecialchars($d->domain) ?></strong>
                            <?php if ($d->is_default): ?><span class="badge bg-primary ms-1">Default</span><?php endif; ?>
                        </td>
                        <td><?= htmlspecialchars($d->country_name) ?> (<?= htmlspecialchars($d->country_code) ?>)</td>
                        <td><?= htmlspecialchars($d->default_language) ?></td>
                        <td><?= htmlspecialchars($d->default_currency) ?></td>
                        <td><span class="badge <?= $d->direction=='rtl'?'bg-warning text-dark':'bg-secondary' ?>"><?= strtoupper($d->direction) ?></span></td>
                        <td>
                            <?php if ($d->is_active): ?>
                                <span class="badge bg-success">Active</span>
                            <?php else: ?>
                                <span class="badge bg-danger">Inactive</span>
                            <?php endif; ?>
                        </td>
                        <td>
                            <a href="seo_pages.php?domain_id=<?= $d->id ?>" class="btn btn-sm btn-outline-info">SEO Pages</a>
                            <a href="seo_domains.php?edit=<?= $d->id ?>" class="btn btn-sm btn-outline-warning">Edit</a>
                            <?php if (!$d->is_default): ?>
                            <form method="POST" class="d-inline" onsubmit="return confirm('Delete this domain and all its SEO data?')">
                                <input type="hidden" name="form_token" value="<?= $_SESSION['form_token'] ?>">
                                <input type="hidden" name="domain_id" value="<?= $d->id ?>">
                                <button name="delete_domain" class="btn btn-sm btn-outline-danger">Delete</button>
                            </form>
                            <?php endif; ?>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>

<!-- Add Domain Modal -->
<div class="modal fade" id="addDomainModal" tabindex="-1">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <form method="POST">
                <input type="hidden" name="form_token" value="<?= $_SESSION['form_token'] ?>">
                <div class="modal-header">
                    <h5 class="modal-title">Add New Domain</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div class="row g-3">
                        <div class="col-md-6">
                            <label class="form-label">Domain <span class="text-danger">*</span></label>
                            <input type="text" name="domain" class="form-control" placeholder="travelup.pk" required>
                        </div>
                        <div class="col-md-3">
                            <label class="form-label">Country Code <span class="text-danger">*</span></label>
                            <input type="text" name="country_code" class="form-control" placeholder="PK" maxlength="2" required>
                        </div>
                        <div class="col-md-3">
                            <label class="form-label">Country Name <span class="text-danger">*</span></label>
                            <input type="text" name="country_name" class="form-control" placeholder="Pakistan" required>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Site Name <span class="text-danger">*</span></label>
                            <input type="text" name="site_name" class="form-control" placeholder="TravelUp Pakistan" required>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Site Tagline</label>
                            <input type="text" name="site_tagline" class="form-control" placeholder="Book Cheap Flights from Pakistan">
                        </div>
                        <div class="col-md-3">
                            <label class="form-label">Language</label>
                            <select name="default_language" class="form-select">
                                <option value="en">English</option>
                                <option value="ur">Urdu</option>
                                <option value="ar">Arabic</option>
                                <option value="de">German</option>
                                <option value="fr">French</option>
                            </select>
                        </div>
                        <div class="col-md-3">
                            <label class="form-label">Currency</label>
                            <input type="text" name="default_currency" class="form-control" placeholder="PKR" maxlength="3">
                        </div>
                        <div class="col-md-3">
                            <label class="form-label">Timezone</label>
                            <input type="text" name="timezone" class="form-control" placeholder="Asia/Karachi">
                        </div>
                        <div class="col-md-3">
                            <label class="form-label">Text Direction</label>
                            <select name="direction" class="form-select">
                                <option value="ltr">LTR (Left to Right)</option>
                                <option value="rtl">RTL (Right to Left)</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="submit" name="add_domain" class="btn btn-primary">Add Domain</button>
                </div>
            </form>
        </div>
    </div>
</div>

<?php include '_footer.php'; ?>
```

---

### 22.7 File 2: seo_pages.php — The Core SEO Editor (Yoast Equivalent)

This is the most important file. The SEO team will use this daily. It handles reading/writing `domain_seo` table rows and renders the Yoast-like editor with live preview.

```php
<?php
// admin/seo_pages.php
// Per-page SEO editor: title, meta, OG, Twitter, canonical, robots, structured data

require_once '_config.php';
auth_check();
CSRF();

// All pages SEO team can manage
$ALL_PAGES = [
    'home'          => 'Homepage',
    'flight_search' => 'Flight Search',
    'hotel_search'  => 'Hotel Search',
    'car_rental'    => 'Car Rental',
    'about'         => 'About Us',
    'contact'       => 'Contact',
    'terms'         => 'Terms & Conditions',
    'privacy'       => 'Privacy Policy',
    'my_bookings'   => 'My Bookings',
    'blog_list'     => 'Blog Listing',
];

// ── HANDLE POST ────────────────────────────────────────────────────────────

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['save_seo'])) {

    $domain_id  = (int) $_POST['domain_id'];
    $page_key   = htmlspecialchars($_POST['page_key'], ENT_QUOTES, 'UTF-8');

    // Validate page_key is allowed
    if (!array_key_exists($page_key, $ALL_PAGES)) {
        ALERT_MSG('Invalid page key');
        REDIRECT('seo_pages.php?domain_id=' . $domain_id);
    }

    // Handle OG image upload
    $og_image = htmlspecialchars($_POST['og_image_current'] ?? '', ENT_QUOTES, 'UTF-8');
    if (!empty($_FILES['og_image']['name'])) {
        $ext = strtolower(pathinfo($_FILES['og_image']['name'], PATHINFO_EXTENSION));
        if (!in_array($ext, ['jpg','jpeg','png','webp'])) {
            ALERT_MSG('OG image must be jpg/jpeg/png/webp');
            REDIRECT('seo_pages.php?domain_id=' . $domain_id . '&page=' . $page_key);
        }
        $fname = 'og_' . $domain_id . '_' . $page_key . '_' . time() . '.' . $ext;
        if (move_uploaded_file($_FILES['og_image']['tmp_name'], '../uploads/seo/' . $fname)) {
            $og_image = $fname;
        }
    }

    // Sanitize all inputs
    $data = [
        'focus_keyword'       => htmlspecialchars(trim($_POST['focus_keyword'] ?? ''), ENT_QUOTES, 'UTF-8'),
        'title'               => htmlspecialchars(trim($_POST['seo_title'] ?? ''), ENT_QUOTES, 'UTF-8'),
        'meta_description'    => htmlspecialchars(trim($_POST['meta_description'] ?? ''), ENT_QUOTES, 'UTF-8'),
        'og_title'            => htmlspecialchars(trim($_POST['og_title'] ?? ''), ENT_QUOTES, 'UTF-8'),
        'og_description'      => htmlspecialchars(trim($_POST['og_description'] ?? ''), ENT_QUOTES, 'UTF-8'),
        'og_image'            => $og_image,
        'twitter_title'       => htmlspecialchars(trim($_POST['twitter_title'] ?? ''), ENT_QUOTES, 'UTF-8'),
        'twitter_description' => htmlspecialchars(trim($_POST['twitter_desc'] ?? ''), ENT_QUOTES, 'UTF-8'),
        'twitter_image'       => htmlspecialchars(trim($_POST['twitter_image'] ?? ''), ENT_QUOTES, 'UTF-8'),
        'twitter_card_type'   => in_array($_POST['twitter_card_type'] ?? '', ['summary','summary_large_image'])
                                   ? $_POST['twitter_card_type'] : 'summary_large_image',
        'canonical_url'       => filter_var(trim($_POST['canonical_url'] ?? ''), FILTER_SANITIZE_URL),
        'robots'              => in_array($_POST['robots'] ?? '', [
                                    'index, follow','noindex, follow',
                                    'index, nofollow','noindex, nofollow'
                                 ]) ? $_POST['robots'] : 'index, follow',
        'custom_head_tags'    => strip_tags(trim($_POST['custom_head_tags'] ?? ''), '<meta><link>'),
        'updated_at'          => date('Y-m-d H:i:s'),
    ];

    // Calculate SEO score
    $score = 0;
    if (!empty($data['title'])) {
        $tlen = strlen($data['title']);
        $score += ($tlen >= 30 && $tlen <= 60) ? 15 : 5;
    }
    if (!empty($data['meta_description'])) {
        $dlen = strlen($data['meta_description']);
        $score += ($dlen >= 100 && $dlen <= 160) ? 15 : 5;
    }
    if (!empty($data['focus_keyword'])) {
        if (!empty($data['title']) && stripos($data['title'], $data['focus_keyword']) !== false) $score += 15;
        if (!empty($data['meta_description']) && stripos($data['meta_description'], $data['focus_keyword']) !== false) $score += 10;
    }
    if (!empty($data['og_image'])) $score += 10;
    if (!empty($data['canonical_url'])) $score += 10;
    if (!empty($data['og_title'])) $score += 10;
    if (!empty($data['twitter_title'])) $score += 10;
    $data['seo_score'] = min($score, 100);

    // Upsert (insert or update)
    $existing = GET('domain_seo', ['domain_id' => $domain_id, 'page_key' => $page_key]);
    if (!empty($existing)) {
        UPDATE('domain_seo', $data, $existing[0]->id);
    } else {
        INSERT('domain_seo', array_merge($data, ['domain_id' => $domain_id, 'page_key' => $page_key]));
    }

    // Clear domain config cache
    $cache_pattern = __DIR__ . '/../cache/domain_config_*.cache';
    foreach (glob($cache_pattern) as $f) unlink($f);

    ALERT_MSG('SEO settings saved!');
    REDIRECT('seo_pages.php?domain_id=' . $domain_id . '&page=' . $page_key);
}

// ── LOAD DATA ──────────────────────────────────────────────────────────────

$domain_id   = (int) ($_GET['domain_id'] ?? 0);
$page_key    = htmlspecialchars($_GET['page'] ?? 'home', ENT_QUOTES, 'UTF-8');
if (!array_key_exists($page_key, $ALL_PAGES)) $page_key = 'home';

$domains     = GET('domain_settings', ['is_active' => 1]);
if (empty($domain_id) && !empty($domains)) $domain_id = $domains[0]->id;

$domain_row  = GET('domain_settings', ['id' => $domain_id]);
$domain_row  = !empty($domain_row) ? $domain_row[0] : null;

$seo         = GET('domain_seo', ['domain_id' => $domain_id, 'page_key' => $page_key]);
$seo         = !empty($seo) ? $seo[0] : null;

$title = 'SEO Pages — ' . ($domain_row->domain ?? '');
include '_header.php';

// Ensure SEO upload directory exists
if (!is_dir('../uploads/seo')) mkdir('../uploads/seo', 0755, true);
?>

<!-- SEO Page Editor Styles -->
<style>
.serp-preview { background:#fff; border:1px solid #ddd; border-radius:8px; padding:16px; font-family:Arial,sans-serif; }
.serp-url { color:#006621; font-size:13px; }
.serp-title { color:#1a0dab; font-size:18px; font-weight:400; cursor:pointer; text-decoration:none; display:block; }
.serp-title:hover { text-decoration:underline; }
.serp-desc { color:#545454; font-size:13px; line-height:1.5; }
.og-preview { background:#fff; border:1px solid #ddd; border-radius:4px; overflow:hidden; max-width:500px; }
.og-preview-img { width:100%; height:180px; background:#f0f0f0; object-fit:cover; display:flex; align-items:center; justify-content:center; color:#999; }
.og-preview-body { padding:12px 16px; border-top:4px solid #3b5998; }
.og-preview-url { font-size:11px; color:#90949c; text-transform:uppercase; }
.og-preview-title { font-size:16px; font-weight:600; color:#1c1e21; margin:4px 0; }
.og-preview-desc { font-size:13px; color:#606770; }
.seo-score-bar { height:8px; border-radius:4px; background:#e9ecef; }
.seo-score-fill { height:8px; border-radius:4px; transition:width 0.4s; }
.char-counter { font-size:11px; font-weight:500; }
.char-ok { color:#28a745; }
.char-warn { color:#ffc107; }
.char-over { color:#dc3545; }
</style>

<div class="page_head">
    <div class="page_head_title"><h3>SEO Page Editor</h3></div>
</div>

<!-- Domain + Page Selector -->
<div class="page_card mb-3">
    <div class="card">
        <div class="card-body">
            <div class="row align-items-center g-2">
                <div class="col-md-3">
                    <label class="form-label fw-bold">Domain</label>
                    <select class="form-select" id="domainSelector" onchange="window.location='seo_pages.php?domain_id='+this.value+'&page=<?= $page_key ?>'">
                        <?php foreach ($domains as $d): ?>
                        <option value="<?= $d->id ?>" <?= $d->id==$domain_id?'selected':'' ?>>
                            <?= htmlspecialchars($d->domain) ?> (<?= $d->country_code ?>)
                        </option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="col-md-3">
                    <label class="form-label fw-bold">Page</label>
                    <select class="form-select" id="pageSelector" onchange="window.location='seo_pages.php?domain_id=<?= $domain_id ?>&page='+this.value">
                        <?php foreach ($ALL_PAGES as $key => $label): ?>
                        <option value="<?= $key ?>" <?= $key==$page_key?'selected':'' ?>><?= $label ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="col-md-6 d-flex align-items-end">
                    <div class="text-muted small">
                        Editing: <strong><?= htmlspecialchars($domain_row->domain ?? '') ?></strong>
                        › <?= htmlspecialchars($ALL_PAGES[$page_key]) ?>
                         |  SEO Score:
                        <strong class="<?= ($seo->seo_score??0)>=70?'text-success':(($seo->seo_score??0)>=40?'text-warning':'text-danger') ?>">
                            <?= $seo->seo_score ?? 0 ?>/100
                        </strong>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Main SEO Form -->
<form method="POST" enctype="multipart/form-data" id="seoForm">
    <input type="hidden" name="form_token" value="<?= $_SESSION['form_token'] ?>">
    <input type="hidden" name="domain_id" value="<?= $domain_id ?>">
    <input type="hidden" name="page_key" value="<?= $page_key ?>">
    <input type="hidden" name="og_image_current" value="<?= htmlspecialchars($seo->og_image??'') ?>">

    <div class="row g-3">
        <!-- LEFT COL: Editor -->
        <div class="col-lg-7">

            <!-- BASIC SEO -->
            <div class="card mb-3">
                <div class="card-header fw-bold">Basic SEO</div>
                <div class="card-body">

                    <div class="mb-3">
                        <label class="form-label">Focus Keyword</label>
                        <input type="text" name="focus_keyword" id="focusKw" class="form-control"
                               value="<?= htmlspecialchars($seo->focus_keyword??'') ?>"
                               placeholder="e.g. cheap flights pakistan">
                        <div class="form-text" id="kwUsage"></div>
                    </div>

                    <div class="mb-3">
                        <label class="form-label">SEO Title <span class="text-danger">*</span> <span class="char-counter" id="titleCounter">0/60</span></label>
                        <input type="text" name="seo_title" id="seoTitle" class="form-control"
                               value="<?= htmlspecialchars($seo->title??'') ?>"
                               placeholder="Page Title — Site Name" maxlength="80">
                        <div class="progress seo-score-bar mt-1">
                            <div class="progress-bar seo-score-fill" id="titleBar" style="width:0%"></div>
                        </div>
                    </div>

                    <div class="mb-3">
                        <label class="form-label">Meta Description <span class="char-counter" id="descCounter">0/160</span></label>
                        <textarea name="meta_description" id="metaDesc" class="form-control" rows="3"
                               placeholder="Describe this page for search engines..."><?= htmlspecialchars($seo->meta_description??'') ?></textarea>
                        <div class="progress seo-score-bar mt-1">
                            <div class="progress-bar seo-score-fill" id="descBar" style="width:0%"></div>
                        </div>
                    </div>

                    <div class="row g-2">
                        <div class="col-md-6">
                            <label class="form-label">Canonical URL</label>
                            <input type="url" name="canonical_url" class="form-control"
                                   value="<?= htmlspecialchars($seo->canonical_url??'') ?>"
                                   placeholder="https://<?= $domain_row->domain ?? 'yourdomain.com' ?>/page">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Robots</label>
                            <select name="robots" class="form-select">
                                <?php foreach (['index, follow','noindex, follow','index, nofollow','noindex, nofollow'] as $r): ?>
                                <option value="<?= $r ?>" <?= ($seo->robots??'index, follow')===$r?'selected':'' ?>><?= $r ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                    </div>

                </div>
            </div>

            <!-- OPEN GRAPH -->
            <div class="card mb-3">
                <div class="card-header fw-bold">Open Graph (Facebook / Social)</div>
                <div class="card-body">
                    <div class="mb-3">
                        <label class="form-label">OG Title <span class="char-counter" id="ogTitleCounter">0/60</span></label>
                        <input type="text" name="og_title" id="ogTitle" class="form-control"
                               value="<?= htmlspecialchars($seo->og_title??'') ?>" maxlength="80">
                    </div>
                    <div class="mb-3">
                        <label class="form-label">OG Description <span class="char-counter" id="ogDescCounter">0/200</span></label>
                        <textarea name="og_description" id="ogDesc" class="form-control" rows="2"><?= htmlspecialchars($seo->og_description??'') ?></textarea>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">OG Image (1200×630px recommended)</label>
                        <?php if (!empty($seo->og_image)): ?>
                        <div class="mb-1"><img src="../uploads/seo/<?= htmlspecialchars($seo->og_image) ?>" style="height:60px;border-radius:4px;"></div>
                        <?php endif; ?>
                        <input type="file" name="og_image" id="ogImageUpload" class="form-control" accept="image/jpg,image/jpeg,image/png,image/webp">
                    </div>
                </div>
            </div>

            <!-- TWITTER CARD -->
            <div class="card mb-3">
                <div class="card-header fw-bold">Twitter Card</div>
                <div class="card-body">
                    <div class="row g-2">
                        <div class="col-md-4">
                            <label class="form-label">Card Type</label>
                            <select name="twitter_card_type" class="form-select">
                                <option value="summary_large_image" <?= ($seo->twitter_card_type??'')=='summary_large_image'?'selected':'' ?>>Large Image</option>
                                <option value="summary" <?= ($seo->twitter_card_type??'')=='summary'?'selected':'' ?>>Summary</option>
                            </select>
                        </div>
                        <div class="col-md-8">
                            <label class="form-label">Twitter Title</label>
                            <input type="text" name="twitter_title" class="form-control"
                                   value="<?= htmlspecialchars($seo->twitter_title??'') ?>">
                        </div>
                        <div class="col-12">
                            <label class="form-label">Twitter Description</label>
                            <textarea name="twitter_desc" class="form-control" rows="2"><?= htmlspecialchars($seo->twitter_description??'') ?></textarea>
                        </div>
                        <div class="col-12">
                            <label class="form-label">Twitter Image URL (or leave blank to use OG image)</label>
                            <input type="text" name="twitter_image" class="form-control"
                                   value="<?= htmlspecialchars($seo->twitter_image??'') ?>"
                                   placeholder="https://...">
                        </div>
                    </div>
                </div>
            </div>

            <!-- ADVANCED -->
            <div class="card mb-3">
                <div class="card-header fw-bold">Advanced</div>
                <div class="card-body">
                    <label class="form-label">Custom <head> Tags (only <meta> and <link> allowed)</label>
                    <textarea name="custom_head_tags" class="form-control" rows="3"
                              placeholder='<meta name="custom" content="value" />'><?= htmlspecialchars($seo->custom_head_tags??'') ?></textarea>
                </div>
            </div>

        </div><!-- /LEFT -->

        <!-- RIGHT COL: Previews + Score -->
        <div class="col-lg-5">

            <!-- GOOGLE SERP PREVIEW -->
            <div class="card mb-3">
                <div class="card-header fw-bold">Google Search Preview</div>
                <div class="card-body">
                    <div class="serp-preview">
                        <div class="serp-url" id="serpUrl"><?= htmlspecialchars($domain_row->domain??'yourdomain.com') ?></div>
                        <a class="serp-title" id="serpTitle"><?= htmlspecialchars($seo->title ?? 'SEO Title will appear here') ?></a>
                        <div class="serp-desc" id="serpDesc"><?= htmlspecialchars($seo->meta_description ?? 'Meta description will appear here...') ?></div>
                    </div>
                </div>
            </div>

            <!-- FACEBOOK OG PREVIEW -->
            <div class="card mb-3">
                <div class="card-header fw-bold">Facebook Preview</div>
                <div class="card-body p-0">
                    <div class="og-preview">
                        <div class="og-preview-img" id="ogPreviewImgWrap">
                            <?php if (!empty($seo->og_image)): ?>
                            <img src="../uploads/seo/<?= htmlspecialchars($seo->og_image) ?>" style="width:100%;height:180px;object-fit:cover;">
                            <?php else: ?>
                            <span>OG image preview</span>
                            <?php endif; ?>
                        </div>
                        <div class="og-preview-body">
                            <div class="og-preview-url"><?= strtoupper(htmlspecialchars($domain_row->domain??'')) ?></div>
                            <div class="og-preview-title" id="ogPreviewTitle"><?= htmlspecialchars($seo->og_title??'OG Title') ?></div>
                            <div class="og-preview-desc" id="ogPreviewDesc"><?= htmlspecialchars($seo->og_description??'OG description...') ?></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- SEO SCORE -->
            <div class="card mb-3">
                <div class="card-header fw-bold">SEO Score Analysis</div>
                <div class="card-body">
                    <div class="d-flex align-items-center mb-3">
                        <div style="font-size:2rem;font-weight:700;" id="scoreDisplay"><?= $seo->seo_score ?? 0 ?></div>
                        <div class="ms-2 text-muted">/100</div>
                        <div class="ms-auto">
                            <div class="progress" style="width:120px;height:12px;border-radius:6px;">
                                <div class="progress-bar" id="scoreBar"
                                     style="width:<?= $seo->seo_score??0 ?>%;
                                            background:<?= ($seo->seo_score??0)>=70?'#28a745':(($seo->seo_score??0)>=40?'#ffc107':'#dc3545') ?>;">
                                </div>
                            </div>
                        </div>
                    </div>
                    <ul class="list-unstyled mb-0 small" id="scoreChecks">
                        <!-- Populated by JS -->
                    </ul>
                </div>
            </div>

            <!-- SAVE BUTTON -->
            <div class="d-grid">
                <button type="submit" name="save_seo" class="btn btn-primary btn-lg">
                    💾 Save SEO Settings
                </button>
            </div>

        </div><!-- /RIGHT -->
    </div><!-- /row -->
</form>

<!-- JavaScript: Live Preview + Score -->
<script>
(function () {
    // Elements
    const titleInput  = document.getElementById('seoTitle');
    const descInput   = document.getElementById('metaDesc');
    const kwInput     = document.getElementById('focusKw');
    const ogTitleInput= document.getElementById('ogTitle');
    const ogDescInput = document.getElementById('ogDesc');
    const ogImgUpload = document.getElementById('ogImageUpload');

    const serpTitle   = document.getElementById('serpTitle');
    const serpDesc    = document.getElementById('serpDesc');
    const ogPrevTitle = document.getElementById('ogPreviewTitle');
    const ogPrevDesc  = document.getElementById('ogPreviewDesc');
    const ogPrevImg   = document.getElementById('ogPreviewImgWrap');

    const titleCounter= document.getElementById('titleCounter');
    const descCounter = document.getElementById('descCounter');
    const ogTitleCtr  = document.getElementById('ogTitleCounter');
    const ogDescCtr   = document.getElementById('ogDescCounter');
    const titleBar    = document.getElementById('titleBar');
    const descBar     = document.getElementById('descBar');
    const scoreDisp   = document.getElementById('scoreDisplay');
    const scoreBarEl  = document.getElementById('scoreBar');
    const scoreChecks = document.getElementById('scoreChecks');
    const kwUsage     = document.getElementById('kwUsage');

    function charColor(val, min, max) {
        if (val === 0) return 'char-warn';
        if (val < min) return 'char-warn';
        if (val > max) return 'char-over';
        return 'char-ok';
    }

    function updateCounter(input, el, bar, min, max) {
        const len = input.value.length;
        el.textContent = len + '/' + max;
        el.className = 'char-counter ' + charColor(len, min, max);
        if (bar) {
            bar.style.width = Math.min(100, (len/max)*100) + '%';
            bar.style.background = len<=max?'#28a745':'#dc3545';
        }
    }

    function updateSERPPreview() {
        serpTitle.textContent = titleInput.value || 'SEO Title will appear here';
        serpDesc.textContent  = descInput.value  || 'Meta description will appear here...';
    }

    function updateOGPreview() {
        ogPrevTitle.textContent = ogTitleInput.value || 'OG Title';
        ogPrevDesc.textContent  = ogDescInput.value  || 'OG description...';
    }

    function calculateScore() {
        const title = titleInput.value;
        const desc  = descInput.value;
        const kw    = kwInput.value.toLowerCase();
        const og    = ogTitleInput.value;
        const checks = [];
        let score = 0;

        // Title checks
        if (!title) {
            checks.push({status:'❌', msg:'SEO title is missing'});
        } else {
            const tl = title.length;
            if (tl >= 30 && tl <= 60) { score += 15; checks.push({status:'✅', msg:'SEO title length is good (' + tl + ' chars)'}); }
            else if (tl > 60)         { score += 5;  checks.push({status:'⚠️', msg:'SEO title is too long (' + tl + '/60 chars)'}); }
            else                      { score += 5;  checks.push({status:'⚠️', msg:'SEO title is short (' + tl + ' chars, aim 40-60)'}); }
        }

        // Meta desc checks
        if (!desc) {
            checks.push({status:'❌', msg:'Meta description is missing'});
        } else {
            const dl = desc.length;
            if (dl >= 100 && dl <= 160) { score += 15; checks.push({status:'✅', msg:'Meta description length good (' + dl + ' chars)'}); }
            else if (dl > 160)          { score += 5;  checks.push({status:'⚠️', msg:'Meta description too long (' + dl + '/160)'}); }
            else                        { score += 5;  checks.push({status:'⚠️', msg:'Meta description too short (' + dl + ' chars)'}); }
        }

        // Focus keyword
        if (kw) {
            if (title && title.toLowerCase().includes(kw)) {
                score += 15; checks.push({status:'✅', msg:'Focus keyword in SEO title'});
            } else {
                checks.push({status:'⚠️', msg:'Focus keyword "' + kwInput.value + '" not in SEO title'});
            }
            if (desc && desc.toLowerCase().includes(kw)) {
                score += 10; checks.push({status:'✅', msg:'Focus keyword in meta description'});
            } else {
                checks.push({status:'⚠️', msg:'Focus keyword not in meta description'});
            }
            // Count occurrences in combined text
            const combined = (title + ' ' + desc).toLowerCase();
            const matches  = (combined.match(new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g'))||[]).length;
            kwUsage.textContent = 'Keyword "' + kwInput.value + '" found ' + matches + ' time(s) in title+description.';
            kwUsage.className   = 'form-text ' + (matches>=2?'text-success':(matches==1?'text-warning':'text-danger'));
        }

        // OG image
        const hasOgImg = document.querySelector('input[name="og_image_current"]').value || ogImgUpload.value;
        if (hasOgImg) { score += 10; checks.push({status:'✅', msg:'OG image is set'}); }
        else          { checks.push({status:'⚠️', msg:'OG image not set (affects social shares)'}); }

        // OG title
        if (og) { score += 10; checks.push({status:'✅', msg:'OG title is set'}); }
        else    { checks.push({status:'⚠️', msg:'OG title not set'}); }

        score = Math.min(score, 100);
        scoreDisp.textContent = score;
        scoreBarEl.style.width = score + '%';
        scoreBarEl.style.background = score>=70?'#28a745':(score>=40?'#ffc107':'#dc3545');

        scoreChecks.innerHTML = checks.map(c =>
            '<li class="mb-1">' + c.status + ' ' + c.msg + '</li>'
        ).join('');
    }

    // OG image preview when selecting a file
    ogImgUpload.addEventListener('change', function() {
        if (this.files[0]) {
            const reader = new FileReader();
            reader.onload = e => {
                ogPrevImg.innerHTML = '<img src="' + e.target.result + '" style="width:100%;height:180px;object-fit:cover;">';
            };
            reader.readAsDataURL(this.files[0]);
        }
    });

    // Wire up all live events
    titleInput.addEventListener('input', () => {
        updateCounter(titleInput, titleCounter, titleBar, 30, 60);
        updateSERPPreview();
        calculateScore();
    });
    descInput.addEventListener('input', () => {
        updateCounter(descInput, descCounter, descBar, 100, 160);
        updateSERPPreview();
        calculateScore();
    });
    kwInput.addEventListener('input', calculateScore);
    ogTitleInput.addEventListener('input', () => {
        updateCounter(ogTitleInput, ogTitleCtr, null, 30, 60);
        updateOGPreview();
        calculateScore();
    });
    ogDescInput.addEventListener('input', () => {
        updateCounter(ogDescInput, ogDescCtr, null, 100, 200);
        updateOGPreview();
    });

    // Initialize on load
    updateCounter(titleInput, titleCounter, titleBar, 30, 60);
    updateCounter(descInput, descCounter, descBar, 100, 160);
    updateSERPPreview();
    updateOGPreview();
    calculateScore();
})();
</script>

<?php include '_footer.php'; ?>
```

---

### 22.8 File 3: seo_routes.php — Popular Route Pages Manager

This manages the `domain_popular_routes` table. Follows the exact same pattern as `blogs.php`.

```php
<?php
// admin/seo_routes.php
// Manage popular route SEO pages per domain

require_once '_config.php';
auth_check();
CSRF();

// ── HANDLE POST ────────────────────────────────────────────────────────────

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    $domain_id = (int)($_POST['domain_id'] ?? 0);

    // Handle OG image upload for routes
    $og_image = htmlspecialchars($_POST['og_image_current'] ?? '', ENT_QUOTES, 'UTF-8');
    if (!empty($_FILES['og_image']['name'])) {
        $ext = strtolower(pathinfo($_FILES['og_image']['name'], PATHINFO_EXTENSION));
        if (in_array($ext, ['jpg','jpeg','png','webp'])) {
            $fname = 'route_' . time() . '_' . rand(100,999) . '.' . $ext;
            if (move_uploaded_file($_FILES['og_image']['tmp_name'], '../uploads/seo/' . $fname)) {
                $og_image = $fname;
            }
        }
    }

    $params = [
        'domain_id'        => $domain_id,
        'origin_code'      => strtoupper(substr(preg_replace('/[^A-Za-z]/','',$_POST['origin_code']),0,3)),
        'origin_name'      => htmlspecialchars($_POST['origin_name'], ENT_QUOTES, 'UTF-8'),
        'destination_code' => strtoupper(substr(preg_replace('/[^A-Za-z]/','',$_POST['destination_code']),0,3)),
        'destination_name' => htmlspecialchars($_POST['destination_name'], ENT_QUOTES, 'UTF-8'),
        'slug'             => preg_replace('/[^a-z0-9\-]/', '', strtolower(str_replace(' ','-',$_POST['slug']))),
        'h1_heading'       => htmlspecialchars($_POST['h1_heading'] ?? '', ENT_QUOTES, 'UTF-8'),
        'seo_title'        => htmlspecialchars($_POST['seo_title'], ENT_QUOTES, 'UTF-8'),
        'seo_description'  => htmlspecialchars($_POST['seo_description'], ENT_QUOTES, 'UTF-8'),
        'og_image'         => $og_image,
        'page_content'     => $_POST['page_content'] ?? '', // TinyMCE HTML — sanitize server-side
        'typical_price'    => (float)str_replace(',','',$_POST['typical_price'] ?? 0),
        'currency'         => strtoupper(substr(preg_replace('/[^A-Za-z]/','',$_POST['currency']),0,3)),
        'display_order'    => (int)($_POST['display_order'] ?? 0),
        'is_active'        => isset($_POST['is_active']) ? 1 : 0,
    ];

    // Sanitize TinyMCE HTML output
    $params['page_content'] = strip_tags($params['page_content'],
        '<p><br><strong><em><u><ul><ol><li><h2><h3><a><img><blockquote><table><tr><td><th>');

    if (isset($_POST['add_route'])) {
        INSERT('domain_popular_routes', $params);
        ALERT_MSG('Route page added');
    } elseif (isset($_POST['update_route'])) {
        $route_id = (int)$_POST['route_id'];
        unset($params['domain_id']);
        UPDATE('domain_popular_routes', $params, $route_id);
        ALERT_MSG('Route page updated');
    } elseif (isset($_POST['delete_route'])) {
        DELETE('domain_popular_routes', ['id' => (int)$_POST['route_id']]);
        ALERT_MSG('Route deleted');
    }

    // Clear cache
    foreach (glob(__DIR__ . '/../cache/domain_config_*.cache') as $f) unlink($f);
    REDIRECT('seo_routes.php?domain_id=' . $domain_id);
}

// ── LOAD DATA ──────────────────────────────────────────────────────────────

$domain_id  = (int)($_GET['domain_id'] ?? 0);
$domains    = GET('domain_settings', ['is_active' => 1]);
if (empty($domain_id) && !empty($domains)) $domain_id = $domains[0]->id;

$routes     = GET('domain_popular_routes', ['domain_id' => $domain_id]);
$edit_route = null;
if (!empty($_GET['edit'])) {
    $er = GET('domain_popular_routes', ['id' => (int)$_GET['edit']]);
    $edit_route = !empty($er) ? $er[0] : null;
}

$title = 'SEO — Popular Routes';
include '_header.php';

// Ensure upload dir
if (!is_dir('../uploads/seo')) mkdir('../uploads/seo', 0755, true);
?>

<!-- TinyMCE for Page Content -->
<script src="https://cdn.tiny.cloud/1/no-api-key/tinymce/6/tinymce.min.js" referrerpolicy="origin"></script>
<script>
tinymce.init({
    selector: '#pageContent',
    plugins: 'lists link image code wordcount',
    toolbar: 'bold italic underline | h2 h3 | bullist numlist | link | wordcount',
    height: 300, menubar: false
});
</script>

<div class="page_head">
    <div class="page_head_title"><h3>Popular Route SEO Pages</h3></div>
    <div class="page_head_actions">
        <select class="form-select form-select-sm me-2" style="width:auto;display:inline-block;"
                onchange="window.location='seo_routes.php?domain_id='+this.value">
            <?php foreach ($domains as $d): ?>
            <option value="<?= $d->id ?>" <?= $d->id==$domain_id?'selected':'' ?>><?= htmlspecialchars($d->domain) ?></option>
            <?php endforeach; ?>
        </select>
        <a href="seo_routes.php?domain_id=<?= $domain_id ?>&add=1" class="btn btn-primary btn-sm">+ Add Route</a>
    </div>
</div>

<?php if (!empty($_GET['add']) || $edit_route): ?>
<!-- ADD / EDIT FORM -->
<div class="card mb-3">
    <div class="card-header fw-bold"><?= $edit_route ? 'Edit Route' : 'Add New Route Page' ?></div>
    <div class="card-body">
        <form method="POST" enctype="multipart/form-data">
            <input type="hidden" name="form_token" value="<?= $_SESSION['form_token'] ?>">
            <input type="hidden" name="domain_id" value="<?= $domain_id ?>">
            <input type="hidden" name="route_id" value="<?= $edit_route->id ?? '' ?>">
            <input type="hidden" name="og_image_current" value="<?= htmlspecialchars($edit_route->og_image ?? '') ?>">
            <div class="row g-3">
                <div class="col-md-2"><label class="form-label">Origin Code</label>
                    <input type="text" name="origin_code" class="form-control"
                           value="<?= htmlspecialchars($edit_route->origin_code??'') ?>" placeholder="KHI" maxlength="3" required></div>
                <div class="col-md-4"><label class="form-label">Origin City</label>
                    <input type="text" name="origin_name" class="form-control"
                           value="<?= htmlspecialchars($edit_route->origin_name??'') ?>" placeholder="Karachi" required></div>
                <div class="col-md-2"><label class="form-label">Dest Code</label>
                    <input type="text" name="destination_code" class="form-control"
                           value="<?= htmlspecialchars($edit_route->destination_code??'') ?>" placeholder="DXB" maxlength="3" required></div>
                <div class="col-md-4"><label class="form-label">Dest City</label>
                    <input type="text" name="destination_name" class="form-control"
                           value="<?= htmlspecialchars($edit_route->destination_name??'') ?>" placeholder="Dubai" required></div>

                <div class="col-md-6"><label class="form-label">URL Slug</label>
                    <input type="text" name="slug" class="form-control"
                           value="<?= htmlspecialchars($edit_route->slug??'') ?>" placeholder="karachi-to-dubai-flights" required></div>
                <div class="col-md-6"><label class="form-label">H1 Heading</label>
                    <input type="text" name="h1_heading" class="form-control"
                           value="<?= htmlspecialchars($edit_route->h1_heading??'') ?>" placeholder="Cheap Flights from Karachi to Dubai"></div>

                <div class="col-12"><label class="form-label">SEO Title</label>
                    <input type="text" name="seo_title" class="form-control"
                           value="<?= htmlspecialchars($edit_route->seo_title??'') ?>" placeholder="Cheap Flights Karachi to Dubai | TravelUp.pk"></div>
                <div class="col-12"><label class="form-label">SEO Meta Description</label>
                    <textarea name="seo_description" class="form-control" rows="2"
                              placeholder="Find cheapest flights from Karachi to Dubai..."><?= htmlspecialchars($edit_route->seo_description??'') ?></textarea></div>

                <div class="col-md-4"><label class="form-label">OG Image (1200×630)</label>
                    <?php if (!empty($edit_route->og_image)): ?>
                    <img src="../uploads/seo/<?= htmlspecialchars($edit_route->og_image) ?>" style="height:50px;margin-bottom:4px;display:block;border-radius:4px;">
                    <?php endif; ?>
                    <input type="file" name="og_image" class="form-control" accept="image/*"></div>
                <div class="col-md-2"><label class="form-label">Typical Price</label>
                    <input type="number" name="typical_price" class="form-control"
                           value="<?= $edit_route->typical_price??'' ?>" placeholder="45000"></div>
                <div class="col-md-2"><label class="form-label">Currency</label>
                    <input type="text" name="currency" class="form-control"
                           value="<?= htmlspecialchars($edit_route->currency??'PKR') ?>" maxlength="3"></div>
                <div class="col-md-2"><label class="form-label">Display Order</label>
                    <input type="number" name="display_order" class="form-control"
                           value="<?= $edit_route->display_order??0 ?>"></div>
                <div class="col-md-2 d-flex align-items-end">
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" name="is_active" id="isActive"
                               <?= ($edit_route->is_active??1)?'checked':'' ?>>
                        <label class="form-check-label" for="isActive">Active</label>
                    </div>
                </div>

                <div class="col-12">
                    <label class="form-label">Page Content (SEO Rich Content for this route)</label>
                    <textarea id="pageContent" name="page_content"><?= $edit_route->page_content ?? '' ?></textarea>
                </div>

                <div class="col-12">
                    <?php if ($edit_route): ?>
                    <button type="submit" name="update_route" class="btn btn-warning">Update Route</button>
                    <?php else: ?>
                    <button type="submit" name="add_route" class="btn btn-primary">Add Route</button>
                    <?php endif; ?>
                    <a href="seo_routes.php?domain_id=<?= $domain_id ?>" class="btn btn-secondary ms-2">Cancel</a>
                </div>
            </div>
        </form>
    </div>
</div>
<?php endif; ?>

<!-- ROUTES TABLE -->
<div class="card">
    <div class="card-body">
        <table class="table table-hover align-middle">
            <thead>
                <tr><th>Route</th><th>Slug</th><th>SEO Title</th><th>Meta Desc</th><th>Order</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
                <?php if (empty($routes)): ?>
                <tr><td colspan="7" class="text-center text-muted">No routes yet. Add your first popular route!</td></tr>
                <?php else: ?>
                <?php foreach ($routes as $r): ?>
                <tr>
                    <td><strong><?= htmlspecialchars($r->origin_code) ?> → <?= htmlspecialchars($r->destination_code) ?></strong><br>
                        <small class="text-muted"><?= htmlspecialchars($r->origin_name) ?> to <?= htmlspecialchars($r->destination_name) ?></small></td>
                    <td><small>/flights/<?= htmlspecialchars($r->slug) ?></small></td>
                    <td><?= !empty($r->seo_title) ? '<span class="badge bg-success">✅</span>' : '<span class="badge bg-danger">Missing</span>' ?></td>
                    <td><?= !empty($r->seo_description) ? '<span class="badge bg-success">✅</span>' : '<span class="badge bg-warning text-dark">Missing</span>' ?></td>
                    <td><?= $r->display_order ?></td>
                    <td><?= $r->is_active ? '<span class="badge bg-success">Active</span>' : '<span class="badge bg-secondary">Inactive</span>' ?></td>
                    <td>
                        <a href="seo_routes.php?domain_id=<?= $domain_id ?>&edit=<?= $r->id ?>" class="btn btn-sm btn-outline-warning">Edit</a>
                        <form method="POST" class="d-inline" onsubmit="return confirm('Delete this route page?')">
                            <input type="hidden" name="form_token" value="<?= $_SESSION['form_token'] ?>">
                            <input type="hidden" name="domain_id" value="<?= $domain_id ?>">
                            <input type="hidden" name="route_id" value="<?= $r->id ?>">
                            <button name="delete_route" class="btn btn-sm btn-outline-danger">Delete</button>
                        </form>
                    </td>
                </tr>
                <?php endforeach; ?>
                <?php endif; ?>
            </tbody>
        </table>
    </div>
</div>

<?php include '_footer.php'; ?>
```

---

### 22.9 File 4: seo_redirects.php — Redirect Manager

```php
<?php
// admin/seo_redirects.php
// Manage 301/302 redirects per domain

require_once '_config.php';
auth_check();
CSRF();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    $domain_id = (int)($_POST['domain_id'] ?? 0);

    if (isset($_POST['add_redirect'])) {
        $from = '/' . ltrim(trim($_POST['from_url']), '/');
        $to   = trim($_POST['to_url']);
        $type = in_array((int)$_POST['type'], [301, 302]) ? (int)$_POST['type'] : 301;

        // Validate: from cannot equal to
        if ($from !== $to && !empty($from) && !empty($to)) {
            INSERT('domain_redirects', [
                'domain_id' => $domain_id,
                'from_url'  => htmlspecialchars($from, ENT_QUOTES, 'UTF-8'),
                'to_url'    => htmlspecialchars($to, ENT_QUOTES, 'UTF-8'),
                'type'      => $type,
                'note'      => htmlspecialchars($_POST['note'] ?? '', ENT_QUOTES, 'UTF-8'),
                'is_active' => 1,
            ]);
            ALERT_MSG('Redirect added');
        } else {
            ALERT_MSG('Invalid redirect: from and to cannot be the same or empty');
        }
    }

    if (isset($_POST['delete_redirect'])) {
        DELETE('domain_redirects', ['id' => (int)$_POST['redirect_id'], 'domain_id' => $domain_id]);
        ALERT_MSG('Redirect deleted');
    }

    if (isset($_POST['toggle_redirect'])) {
        $redir = GET('domain_redirects', ['id' => (int)$_POST['redirect_id']]);
        if (!empty($redir)) {
            UPDATE('domain_redirects', ['is_active' => $redir[0]->is_active ? 0 : 1], $redir[0]->id);
            ALERT_MSG('Redirect toggled');
        }
    }

    REDIRECT('seo_redirects.php?domain_id=' . $domain_id);
}

$domain_id  = (int)($_GET['domain_id'] ?? 0);
$domains    = GET('domain_settings', ['is_active' => 1]);
if (empty($domain_id) && !empty($domains)) $domain_id = $domains[0]->id;
$redirects  = GET('domain_redirects', ['domain_id' => $domain_id]);

$title = 'SEO — Redirects';
include '_header.php';
?>

<div class="page_head">
    <div class="page_head_title"><h3>Redirect Manager</h3></div>
    <div class="page_head_actions">
        <select class="form-select form-select-sm" style="width:auto;display:inline-block;"
                onchange="window.location='seo_redirects.php?domain_id='+this.value">
            <?php foreach ($domains as $d): ?>
            <option value="<?= $d->id ?>" <?= $d->id==$domain_id?'selected':'' ?>><?= $d->domain ?></option>
            <?php endforeach; ?>
        </select>
    </div>
</div>

<!-- Add Redirect Form -->
<div class="card mb-3">
    <div class="card-header fw-bold">Add New Redirect</div>
    <div class="card-body">
        <form method="POST" class="row g-2 align-items-end">
            <input type="hidden" name="form_token" value="<?= $_SESSION['form_token'] ?>">
            <input type="hidden" name="domain_id" value="<?= $domain_id ?>">
            <div class="col-md-4">
                <label class="form-label">From (Old URL path)</label>
                <input type="text" name="from_url" class="form-control" placeholder="/old-page-url" required>
            </div>
            <div class="col-md-4">
                <label class="form-label">To (New URL)</label>
                <input type="text" name="to_url" class="form-control" placeholder="/new-page-url or https://..." required>
            </div>
            <div class="col-md-1">
                <label class="form-label">Type</label>
                <select name="type" class="form-select">
                    <option value="301">301</option>
                    <option value="302">302</option>
                </select>
            </div>
            <div class="col-md-2">
                <label class="form-label">Note (optional)</label>
                <input type="text" name="note" class="form-control" placeholder="Reason...">
            </div>
            <div class="col-md-1">
                <button type="submit" name="add_redirect" class="btn btn-primary w-100">Add</button>
            </div>
        </form>
    </div>
</div>

<!-- Redirects List -->
<div class="card">
    <div class="card-body">
        <table class="table table-hover align-middle">
            <thead>
                <tr><th>From URL</th><th>→</th><th>To URL</th><th>Type</th><th>Hits</th><th>Status</th><th>Note</th><th>Actions</th></tr>
            </thead>
            <tbody>
            <?php if (empty($redirects)): ?>
                <tr><td colspan="8" class="text-center text-muted">No redirects yet.</td></tr>
            <?php else: ?>
            <?php foreach ($redirects as $r): ?>
                <tr class="<?= $r->is_active ? '' : 'table-secondary text-muted' ?>">
                    <td><code><?= htmlspecialchars($r->from_url) ?></code></td>
                    <td>→</td>
                    <td><code><?= htmlspecialchars($r->to_url) ?></code></td>
                    <td><span class="badge <?= $r->type==301?'bg-primary':'bg-info text-dark' ?>"><?= $r->type ?></span></td>
                    <td><?= $r->hit_count ?></td>
                    <td>
                        <form method="POST" class="d-inline">
                            <input type="hidden" name="form_token" value="<?= $_SESSION['form_token'] ?>">
                            <input type="hidden" name="domain_id" value="<?= $domain_id ?>">
                            <input type="hidden" name="redirect_id" value="<?= $r->id ?>">
                            <button name="toggle_redirect" class="btn btn-xs <?= $r->is_active?'btn-success':'btn-secondary' ?>" style="font-size:11px;padding:2px 8px;">
                                <?= $r->is_active?'Active':'Inactive' ?>
                            </button>
                        </form>
                    </td>
                    <td><small><?= htmlspecialchars($r->note ?? '') ?></small></td>
                    <td>
                        <form method="POST" class="d-inline" onsubmit="return confirm('Delete this redirect?')">
                            <input type="hidden" name="form_token" value="<?= $_SESSION['form_token'] ?>">
                            <input type="hidden" name="domain_id" value="<?= $domain_id ?>">
                            <input type="hidden" name="redirect_id" value="<?= $r->id ?>">
                            <button name="delete_redirect" class="btn btn-sm btn-outline-danger">Delete</button>
                        </form>
                    </td>
                </tr>
            <?php endforeach; ?>
            <?php endif; ?>
            </tbody>
        </table>
    </div>
</div>

<?php include '_footer.php'; ?>
```

---

### 22.10 File 5: lib/SeoAuditor.php — Audit Scoring Class

```php
<?php
// admin/lib/SeoAuditor.php
// Scores SEO completeness per domain — used by seo_audit.php

class SeoAuditor {

    /** Score a single page's SEO data. Returns ['score', 'issues', 'warnings', 'passes'] */
    public function scorePage($seo) {
        $score    = 0;
        $issues   = [];
        $warnings = [];
        $passes   = [];

        if (empty($seo)) {
            return ['score' => 0, 'issues' => ['No SEO data configured for this page.'], 'warnings' => [], 'passes' => []];
        }

        // Title
        $tlen = strlen($seo->title ?? '');
        if ($tlen === 0)          { $issues[]   = 'SEO title is missing.'; }
        elseif ($tlen > 60)       { $score += 5;  $warnings[] = "Title too long ({$tlen}/60 chars)."; }
        elseif ($tlen < 30)       { $score += 5;  $warnings[] = "Title too short ({$tlen} chars, aim 40-60)."; }
        else                      { $score += 15; $passes[]   = "SEO title length is good ({$tlen} chars)."; }

        // Meta description
        $dlen = strlen($seo->meta_description ?? '');
        if ($dlen === 0)          { $issues[]   = 'Meta description is missing.'; }
        elseif ($dlen > 160)      { $score += 5;  $warnings[] = "Meta description too long ({$dlen}/160 chars)."; }
        elseif ($dlen < 100)      { $score += 5;  $warnings[] = "Meta description too short ({$dlen} chars)."; }
        else                      { $score += 15; $passes[]   = "Meta description length is good ({$dlen} chars)."; }

        // Focus keyword
        $kw = strtolower($seo->focus_keyword ?? '');
        if (!empty($kw)) {
            if (stripos($seo->title ?? '', $kw) !== false)            { $score += 15; $passes[]   = 'Focus keyword in title.'; }
            else                                                       {               $warnings[] = "Focus keyword \"{$seo->focus_keyword}\" not in title."; }
            if (stripos($seo->meta_description ?? '', $kw) !== false) { $score += 10; $passes[]   = 'Focus keyword in meta description.'; }
            else                                                       {               $warnings[] = 'Focus keyword not in meta description.'; }
        } else {
            $warnings[] = 'Focus keyword not set.';
        }

        // OG image
        if (!empty($seo->og_image))     { $score += 10; $passes[]   = 'OG image is set.'; }
        else                            {               $warnings[] = 'OG image not set — social shares will have no image.'; }

        // Canonical
        if (!empty($seo->canonical_url)){ $score += 10; $passes[]   = 'Canonical URL is set.'; }
        else                            { $score += 5;  $warnings[] = 'Canonical URL not set (auto-canonical will be used).'; }

        // OG title
        if (!empty($seo->og_title))     { $score += 10; $passes[]   = 'OG title is set.'; }
        else                            {               $warnings[] = 'OG title not set.'; }

        // Twitter card
        if (!empty($seo->twitter_title)){ $score += 10; $passes[]   = 'Twitter card title is set.'; }
        else                            {               $warnings[] = 'Twitter card title not set.'; }

        // noindex warning
        if (!empty($seo->robots) && str_contains($seo->robots, 'noindex')) {
            $warnings[] = "⚠ Page is set to noindex (\"{$seo->robots}\") — verify this is intentional.";
        } else {
            $passes[] = 'Page is set to be indexed by search engines.';
        }

        return [
            'score'    => min($score, 100),
            'issues'   => $issues,
            'warnings' => $warnings,
            'passes'   => $passes,
        ];
    }

    /** Get total domain health score averaged across all pages */
    public function domainScore(array $seo_rows) {
        if (empty($seo_rows)) return 0;
        $total = array_sum(array_column(
            array_map(fn($r) => $this->scorePage($r), $seo_rows),
            'score'
        ));
        return (int)round($total / count($seo_rows));
    }
}
```

---

### 22.11 File 6: seo_audit.php — Domain Health Dashboard

```php
<?php
// admin/seo_audit.php
// SEO health audit: checks all pages per domain and scores them

require_once '_config.php';
require_once 'lib/SeoAuditor.php';
auth_check();

$ALL_PAGES = [
    'home'=>'Home','flight_search'=>'Flights','hotel_search'=>'Hotels',
    'car_rental'=>'Cars','about'=>'About','contact'=>'Contact',
    'terms'=>'Terms','privacy'=>'Privacy','my_bookings'=>'My Bookings',
];

$domain_id = (int)($_GET['domain_id'] ?? 0);
$domains   = GET('domain_settings', ['is_active' => 1]);
if (empty($domain_id) && !empty($domains)) $domain_id = $domains[0]->id;
$domain    = !empty($domain_id) ? (GET('domain_settings', ['id' => $domain_id])[0] ?? null) : null;

// Load all SEO rows for this domain
$seo_rows  = GET('domain_seo', ['domain_id' => $domain_id]);
$seo_map   = [];
foreach ($seo_rows as $s) $seo_map[$s->page_key] = $s;

// Route SEO completeness
$routes    = GET('domain_popular_routes', ['domain_id' => $domain_id]);
$routes_ok = array_filter($routes, fn($r) => !empty($r->seo_title) && !empty($r->seo_description));

$auditor   = new SeoAuditor();
$overall   = $auditor->domainScore($seo_rows);

$title     = 'SEO Audit';
include '_header.php';
?>

<div class="page_head">
    <div class="page_head_title"><h3>SEO Health Audit</h3></div>
    <div class="page_head_actions">
        <select class="form-select form-select-sm" style="width:auto;display:inline-block;"
                onchange="window.location='seo_audit.php?domain_id='+this.value">
            <?php foreach ($domains as $d): ?>
            <option value="<?= $d->id ?>" <?= $d->id==$domain_id?'selected':'' ?>><?= $d->domain ?></option>
            <?php endforeach; ?>
        </select>
    </div>
</div>

<!-- Overall Score Card -->
<div class="row g-3 mb-3">
    <div class="col-md-3">
        <div class="card text-center">
            <div class="card-body">
                <div style="font-size:3rem;font-weight:800;color:<?= $overall>=70?'#28a745':($overall>=40?'#ffc107':'#dc3545') ?>">
                    <?= $overall ?></div>
                <div class="text-muted">Overall SEO Score</div>
                <small><?= htmlspecialchars($domain->domain ?? '') ?></small>
            </div>
        </div>
    </div>
    <div class="col-md-3">
        <div class="card text-center">
            <div class="card-body">
                <div style="font-size:3rem;font-weight:800"><?= count($seo_rows) ?>/<?= count($ALL_PAGES) ?></div>
                <div class="text-muted">Pages have SEO data</div>
            </div>
        </div>
    </div>
    <div class="col-md-3">
        <div class="card text-center">
            <div class="card-body">
                <div style="font-size:3rem;font-weight:800"><?= count($routes_ok) ?>/<?= count($routes) ?></div>
                <div class="text-muted">Route pages with full SEO</div>
            </div>
        </div>
    </div>
    <div class="col-md-3">
        <div class="card text-center">
            <div class="card-body">
                <div style="font-size:3rem;font-weight:800"><?= count($routes) ?></div>
                <div class="text-muted">Total route pages</div>
            </div>
        </div>
    </div>
</div>

<!-- Per-Page Audit -->
<div class="card">
    <div class="card-header fw-bold">Per-Page SEO Analysis</div>
    <div class="card-body p-0">
        <table class="table table-hover mb-0 align-middle">
            <thead>
                <tr><th>Page</th><th>Score</th><th>Title</th><th>Meta Desc</th><th>OG Image</th><th>Issues</th><th>Action</th></tr>
            </thead>
            <tbody>
            <?php foreach ($ALL_PAGES as $key => $label):
                $seo    = $seo_map[$key] ?? null;
                $result = $auditor->scorePage($seo);
                $score  = $result['score'];
                $color  = $score>=70?'success':($score>=40?'warning':'danger');
            ?>
            <tr>
                <td><strong><?= $label ?></strong></td>
                <td>
                    <span class="badge bg-<?= $color ?>"><?= $score ?>/100</span>
                </td>
                <td><?= !empty($seo->title)?'<span class="text-success">✅ ' . strlen($seo->title) . ' chr</span>':'<span class="text-danger">❌ Missing</span>' ?></td>
                <td><?= !empty($seo->meta_description)?'<span class="text-success">✅ ' . strlen($seo->meta_description) . ' chr</span>':'<span class="text-danger">❌ Missing</span>' ?></td>
                <td><?= !empty($seo->og_image)?'<span class="text-success">✅</span>':'<span class="text-warning">⚠️</span>' ?></td>
                <td>
                    <?php if (!empty($result['issues'])): ?>
                    <span class="text-danger small"><?= implode(', ', array_map('htmlspecialchars', array_slice($result['issues'],0,1))) ?></span>
                    <?php elseif (!empty($result['warnings'])): ?>
                    <span class="text-warning small"><?= count($result['warnings']) ?> warning(s)</span>
                    <?php else: ?>
                    <span class="text-success small">All good!</span>
                    <?php endif; ?>
                </td>
                <td>
                    <a href="seo_pages.php?domain_id=<?= $domain_id ?>&page=<?= $key ?>" class="btn btn-sm btn-outline-primary">Edit SEO</a>
                </td>
            </tr>
            <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>

<?php include '_footer.php'; ?>
```

---

### 22.12 Sidebar Menu: Add SEO Module Links to _header.php

Add this block inside the sidebar nav in `_header.php` where other menu modules are listed:

```php
<!-- In admin/_header.php, inside the sidebar navigation, add: -->
<?php if (/* check permission or just leave open for now */true): ?>
<li class="nav-item <?= (str_starts_with($url_name,'seo'))?'active':'' ?>">
    <a href="#seoSubmenu" data-bs-toggle="collapse" class="nav-link <?= (str_starts_with($url_name,'seo'))?'':'collapsed' ?>">
        <i class="nav-icon">🔍</i> SEO Manager
        <span class="nav-arrow">▾</span>
    </a>
    <ul class="collapse nav-submenu <?= (str_starts_with($url_name,'seo'))?'show':'' ?>" id="seoSubmenu">
        <li><a href="seo.php" class="nav-link <?= $url_name=='seo'?'active':'' ?>">Dashboard</a></li>
        <li><a href="seo_domains.php" class="nav-link <?= $url_name=='seo_domains'?'active':'' ?>">Domains</a></li>
        <li><a href="seo_pages.php" class="nav-link <?= $url_name=='seo_pages'?'active':'' ?>">Page SEO</a></li>
        <li><a href="seo_routes.php" class="nav-link <?= $url_name=='seo_routes'?'active':'' ?>">Route Pages</a></li>
        <li><a href="seo_redirects.php" class="nav-link <?= $url_name=='seo_redirects'?'active':'' ?>">Redirects</a></li>
        <li><a href="seo_audit.php" class="nav-link <?= $url_name=='seo_audit'?'active':'' ?>">SEO Audit</a></li>
    </ul>
</li>
<?php endif; ?>
```

---

### 22.13 Modify blogs.php — Add SEO Fields to Blog Editor

Add a SEO tab to the existing blog post create/edit form. Add these fields to the `$params` array in `blogs.php`:

```php
// In blogs.php — ADD to the $params arrays for add_new and update:
'seo_title'  => htmlspecialchars($_POST['seo_title'] ?? '', ENT_QUOTES, 'UTF-8'),
'seo_desc'   => htmlspecialchars($_POST['seo_desc'] ?? '', ENT_QUOTES, 'UTF-8'),
'focus_kw'   => htmlspecialchars($_POST['focus_kw'] ?? '', ENT_QUOTES, 'UTF-8'),
'og_image'   => htmlspecialchars($_POST['og_image_url'] ?? '', ENT_QUOTES, 'UTF-8'),
'robots'     => in_array($_POST['robots']??'',['index, follow','noindex, follow','index, nofollow','noindex, nofollow'])
                ? $_POST['robots'] : 'index, follow',
```

And add this tabbed section to the blog form HTML (after the main content field):

```html
<!-- Add to blog add/edit form in blogs.php — SEO Tab Section -->
<div class="card mt-3">
    <div class="card-header">
        <ul class="nav nav-tabs card-header-tabs" role="tablist">
            <li class="nav-item"><a class="nav-link active" data-bs-toggle="tab" href="#blogSeoTab">🔍 SEO Settings</a></li>
        </ul>
    </div>
    <div class="card-body tab-content">
        <div class="tab-pane fade show active" id="blogSeoTab">
            <div class="row g-3">
                <div class="col-12">
                    <label class="form-label">Focus Keyword</label>
                    <input type="text" name="focus_kw" class="form-control"
                           value="<?= htmlspecialchars($blog->focus_kw??'') ?>"
                           placeholder="Main keyword for this blog post">
                </div>
                <div class="col-12">
                    <label class="form-label">SEO Title <small class="text-muted" id="blogTitleCount">0/60</small></label>
                    <input type="text" name="seo_title" id="blogSeoTitle" class="form-control" maxlength="80"
                           value="<?= htmlspecialchars($blog->seo_title??'') ?>"
                           placeholder="SEO-optimized title (leave blank to use post title)">
                </div>
                <div class="col-12">
                    <label class="form-label">Meta Description <small class="text-muted" id="blogDescCount">0/160</small></label>
                    <textarea name="seo_desc" id="blogSeoDesc" class="form-control" rows="2"
                              placeholder="SEO meta description (leave blank to use post excerpt)"><?= htmlspecialchars($blog->seo_desc??'') ?></textarea>
                </div>
                <div class="col-md-8">
                    <label class="form-label">OG Image URL (or leave blank to use featured image)</label>
                    <input type="text" name="og_image_url" class="form-control"
                           value="<?= htmlspecialchars($blog->og_image??'') ?>">
                </div>
                <div class="col-md-4">
                    <label class="form-label">Robots</label>
                    <select name="robots" class="form-select">
                        <option value="index, follow" <?= ($blog->robots??'')==='index, follow'?'selected':'' ?>>index, follow</option>
                        <option value="noindex, follow" <?= ($blog->robots??'')==='noindex, follow'?'selected':'' ?>>noindex, follow</option>
                    </select>
                </div>
            </div>
        </div>
    </div>
</div>
<script>
document.getElementById('blogSeoTitle').addEventListener('input', function(){
    const c = document.getElementById('blogTitleCount');
    const l = this.value.length;
    c.textContent = l + '/60';
    c.style.color = l<=60?'#28a745':'#dc3545';
});
document.getElementById('blogSeoDesc').addEventListener('input', function(){
    const c = document.getElementById('blogDescCount');
    const l = this.value.length;
    c.textContent = l + '/160';
    c.style.color = l<=160?'#28a745':'#dc3545';
});
</script>
```

---

### 22.14 Where to Serve Redirects from DB (Next.js)

The `domain_redirects` table feeds into Next.js middleware. The API endpoint for it:

```php
// api/routes/Domain.php — add this endpoint
$app->get('/redirects', function() use ($db) {
    $host = $_SERVER['HTTP_HOST'] ?? '';
    $host = preg_replace('/^www\./', '', strtolower($host));

    $domain = $db->get('domain_settings', ['id'], ['domain' => $host, 'is_active' => 1]);
    if (!$domain) { echo json_encode(['data' => []]); return; }

    $redirects = $db->select('domain_redirects', ['from_url','to_url','type'], [
        'domain_id' => $domain['id'],
        'is_active'  => 1,
    ]);

    echo json_encode(['success' => true, 'data' => $redirects]);
});
```

And in Next.js middleware, redirects are fetched once and cached at the edge:

```javascript
// middleware.js — redirect logic
const redirectsCache = {};

async function getRedirects(host) {
    if (redirectsCache[host] && Date.now() - redirectsCache[host].ts < 300000) {
        return redirectsCache[host].data; // Cache for 5 minutes
    }
    try {
        const res = await fetch(`${process.env.API_INTERNAL_URL}/api/domain/redirects`,
            { headers: { 'Host': host } });
        const json = await res.json();
        redirectsCache[host] = { data: json.data, ts: Date.now() };
        return json.data;
    } catch { return []; }
}
```

---

### 22.15 Implementation Order (Step-by-Step)

Follow this order — each step builds on the previous:

```
STEP 1:  Run seo_install.sql  (creates all tables)          ← 30 minutes
         mysql -u root -p traveltour_db < admin/seo_install.sql

STEP 2:  Create uploads/seo/ directory                       ← 5 minutes
         mkdir -p uploads/seo
         chmod 755 uploads/seo

STEP 3:  Create admin/lib/ directory + SeoAuditor.php        ← 30 minutes

STEP 4:  Create admin/seo_domains.php                        ← 3-4 hours
         Add default domain row, test add/edit/delete

STEP 5:  Create admin/seo_pages.php                          ← 4-5 hours
         Most important file — test SERP preview + scoring

STEP 6:  Create admin/seo_routes.php                         ← 3-4 hours
         Test TinyMCE integration

STEP 7:  Create admin/seo_redirects.php                      ← 2-3 hours

STEP 8:  Create admin/seo_audit.php                          ← 2-3 hours

STEP 9:  Create admin/seo.php (dashboard overview)           ← 1-2 hours

STEP 10: Modify admin/_header.php (add sidebar menu)         ← 30 minutes

STEP 11: Modify admin/blogs.php (add SEO tab)                ← 1-2 hours

STEP 12: Add API endpoints to api/routes/Domain.php          ← 1-2 hours

STEP 13: Integrate with Next.js middleware (redirects)       ← 1-2 hours

STEP 14: Test everything per domain                          ← 2-3 hours

TOTAL:   ~28-36 hours  (1 developer, 1 working week)
```

---

### 22.16 Summary — The Complete Answer


| Question                                      | Answer                                                                                                                                                |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Are there ready-made SEO panel libraries?** | No — Yoast/Rank Math are WordPress-only. For PHP apps, this is always built custom. **This is true for every custom CMS in the industry.**            |
| **Which libraries should we use?**            | 1. **TinyMCE** (free CDN) for rich text. 2. **ACE Editor** (free CDN) for JSON-LD. Everything else uses jQuery + Bootstrap 5 (already in your admin). |
| **Is it complex?**                            | **Low-Medium.** It follows the exact same pattern as your existing `blogs.php` and `settings.php`. No new architecture needed.                        |
| **How many files?**                           | **~9 new PHP files** + 2 modifications to existing files.                                                                                             |
| **How long will it take?**                    | **~28–36 hours** for 1 developer (1 working week).                                                                                                    |
| **Will SEO team find it easy?**               | Yes — `seo_pages.php` has a Google SERP preview, character counters, OG preview, and SEO score, identical in experience to using Yoast in WordPress.  |
| **Does it match Yoast feature-by-feature?**   | Yes — all on-page SEO features of Yoast + extras: multi-domain management, route pages, redirect manager (free), structured data editor.              |


---

## Appendix A: Technology Reference


| Technology   | Version          | Purpose                             |
| ------------ | ---------------- | ----------------------------------- |
| Next.js      | 14+ (App Router) | Frontend framework with SSR/SSG     |
| PHP          | 8.2+             | Backend API                         |
| MySQL        | 8.0+             | Database                            |
| Nginx        | Latest           | Reverse proxy                       |
| Cloudflare   | N/A              | DNS, CDN, SSL, DDoS protection      |
| Node.js      | 20 LTS           | Next.js runtime                     |
| PM2          | Latest           | Node.js process manager             |
| Redis        | Latest           | Caching (optional but recommended)  |
| Tailwind CSS | 4.x              | Frontend styling with CSS variables |


## Appendix B: Glossary


| Term              | Definition                                                                       |
| ----------------- | -------------------------------------------------------------------------------- |
| **ccTLD**         | Country Code Top-Level Domain (e.g., .pk, .ae, .co.uk)                           |
| **hreflang**      | HTML tag telling search engines which language/country version of a page to show |
| **SSR**           | Server-Side Rendering — page rendered on server, sent as HTML (great for SEO)    |
| **SSG**           | Static Site Generation — page pre-built at build time (fastest)                  |
| **ISR**           | Incremental Static Regeneration — SSG with periodic re-building                  |
| **Multi-tenant**  | One application serving multiple "tenants" (domains/customers)                   |
| **Headless CMS**  | CMS that provides content via API, no frontend rendering                         |
| **x-default**     | hreflang value for the default/fallback version of a page                        |
| **Canonical URL** | The "official" URL of a page (prevents duplicate content issues)                 |
| **GSC**           | Google Search Console — Google's tool for monitoring search performance          |
| **LCP**           | Largest Contentful Paint — Core Web Vital metric for page load speed             |
| **OTA**           | Online Travel Agency (e.g., Booking.com, Expedia)                                |


---

**Document prepared for TravelTourUp multi-domain expansion strategy.**  
**Last updated: March 12, 2026**