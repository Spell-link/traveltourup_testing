Analyze the current Next.js project structure, architecture, admin flow, blog system, i18n flow, database schema, API patterns, form handling, and frontend rendering carefully first and then implement a complete scalable multilingual translation architecture by following the existing project conventions, coding standards, UI patterns, validation flow, folder structure, state management, and reusable component strategy without breaking any existing functionality, UI, routes, SEO, or current workflows.

Implement a production-ready generic multilingual system with English as the default/base language and support for Urdu, French, Arabic,Russian and future languages.

==================================================
BLOG MULTILINGUAL ARCHITECTURE
==================================================

Implement a proper translation-based architecture for blogs instead of duplicating blogs per language.

Create a normalized translation structure:

1. Base blog entity:
- non-translatable/common fields:
  - category
  - featured image
  - gallery/media
  - tags
  - status
  - author
  - publish date
  - read time
  - featured flag
  - visibility
  - SEO indexing flags
  - etc

2. Translation entity:
- locale
- title
- slug
- short description
- excerpt
- content
- meta title
- meta description
- SEO keywords
- image alt text
- OG fields if applicable

Follow current ORM/database approach already used in the project.

==================================================
ADMIN PANEL IMPLEMENTATION
==================================================

Upgrade the existing create/edit blog flow into a multilingual tab-based architecture.

Requirements:

1. Keep all common/non-translatable fields outside tabs.

2. Add translation tabs:
- English
- Urdu
- French
- Arabic
- Russian


3. Each tab should contain:
- title
- slug
- short description
- content
- SEO title
- SEO description
- SEO keywords
- image alt text

4. English should be primary/default tab.

5. Add “Auto Translate” button inside every non-English tab:
- translate from English content
- use LibreTranslate API
- auto-fill all translation fields
- allow manual review/edit before saving

6. Add translation loading state and proper error handling.

7. Preserve existing editor/form validations and UX patterns.

8. Follow existing form component structure:
- react-hook-form
- zod validation
- existing UI components
- you can use existing generic form components or update it in the  generic way while all other things remain same and working well
- existing collapsible/section patterns
- existing styling conventions

9. Ensure edit mode correctly loads translations.

10. Ensure translations are saved efficiently and atomically.

11. Prevent duplicate locale entries.

12. Keep form optimized and reusable.

==================================================
CLIENT SIDE BLOG IMPLEMENTATION
==================================================

Implement multilingual blog rendering using locale-based routing.

Requirements:

1. Follow existing Next.js app router structure.

2. Use locale routes:
- /en/blog
- /ur/blog
- /fr/blog
- /ar/blog
- /ru/blog

3. Blog detail routes:
- /en/blog/[slug]
- /ur/blog/[slug]

4. Fetch blog translation according to active locale.

5. Add fallback strategy:
- if translation missing → fallback to English

6. Add proper SEO support:
- hreflang tags
- locale metadata
- canonical support
- localized metadata generation

7. Add RTL support for Urdu/Arabic:
- dir="rtl"

8. Ensure existing blog UI/design remains unchanged.

9. Ensure server-side rendering and SEO remain optimized.

==================================================
GENERIC TRANSLATION SERVICE
==================================================

Create a reusable generic translation layer for the entire platform.

Structure example:

lib/translations/
- translate.ts
- translate-object.ts
- rules.ts
- cache.ts

Requirements:

1. Create centralized translation service using LibreTranslate.

2. Use environment variables:
- LIBRE_TRANSLATE_URL
- LIBRE_TRANSLATE_API_KEY

3. Current staging/testing mode:
- use public LibreTranslate endpoint

4. Keep architecture production-ready so later only env variables need changing when moving to self-hosted VPS LibreTranslate.

5. Create generic recursive object translator:
- translate nested objects
- arrays
- strings
- dynamic API data

6. Add non-translatable key protection:
- ids
- prices
- currency
- airport codes
- urls
- slugs
- timestamps
- images
- etc

7. Add proper typing and optimization.

8. Add translation caching support architecture.

9. Add robust error handling and fallback behavior.

10. Ensure service is reusable for:
- blogs
- flights
- hotels
- destinations
- CMS
- dynamic APIs

==================================================
DUFFEL / HOTEL DYNAMIC DATA STRATEGY
==================================================

Implement generic translation utilities usable later for Duffel flights and hotel APIs.

Requirements:

1. Do NOT translate entire raw API payloads blindly.

2. Create selective translation approach.

3. Keep architecture scalable and optimized.

4. Ensure translation utilities are reusable and decoupled.

==================================================
API ARCHITECTURE
==================================================

1. Never call LibreTranslate directly from client components.

2. Create internal API abstraction layer.

3. Frontend → internal API → LibreTranslate

4. Add proper validation/security handling.

==================================================
I18N
==================================================

Use next-intl and integrate properly with current project architecture.

Requirements:
- locale middleware
- locale detection
- route handling
- translation messages structure
- RTL support
- future scalability

==================================================
IMPORTANT REQUIREMENTS
==================================================

- Do not break existing functionality.
- Do not change existing UI unnecessarily.
- Keep backward compatibility.
- Follow current project structure and conventions strictly.
- Reuse existing components wherever possible.
- Keep implementation modular and scalable.
- Optimize database queries.
- Avoid unnecessary re-renders.
- Maintain SSR/SEO performance.
- Keep code production-ready and clean.
- Add comments only where necessary.
- Keep architecture generic for future modules.
- Ensure everything works correctly in both create and edit flows.
- Ensure multilingual content persists correctly.
- Ensure fallback behavior works properly.
- Ensure existing English flow continues working exactly as before.

Before implementing, first deeply analyze the current project structure and adapt the implementation according to the existing architecture instead of introducing conflicting patterns.



so create the complete solid planning on this one and than start the execution in the professional way 