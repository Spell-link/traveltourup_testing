import { z } from "zod";
import { locales } from "@/i18n/routing";
import { paginationQuerySchema } from "./pagination.schema";

export const appLocaleSchema = z.enum(locales);

export const blogAdminSortFieldSchema = z.enum(["title", "slug", "status", "category", "updated"]);

export const blogAdminListQuerySchema = paginationQuerySchema.extend({
  q: z.string().optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  category_id: z.string().optional(),
  sort: blogAdminSortFieldSchema.optional(),
  order: z.enum(["asc", "desc"]).default("desc"),
});

/**
 * Public list allows a higher page size than admin (`paginationQuerySchema` caps at 100)
 * so marketing can load many published posts in one call.
 */
export const blogPublicListQuerySchema = paginationQuerySchema
  .omit({ limit: true })
  .extend({
    limit: z.coerce.number().int().min(1).max(500).default(20),
    q: z.string().optional(),
    category_slug: z.string().optional(),
    locale: appLocaleSchema.optional(),
  });

export const blogImageInputSchema = z.object({
  url: z.string().min(1).max(4000),
  sort_order: z.coerce.number().int().min(0).optional(),
  is_featured: z.boolean(),
  storage_path: z.string().min(1).max(500).nullable().optional(),
});

/** Trims; empty or whitespace-only string becomes `null` (matches blog admin form + PATCH partial). */
function optionalSeoString(max: number) {
  return z.preprocess(
    (val) => {
      if (val === undefined) return undefined;
      if (val === null) return null;
      if (typeof val !== "string") return val;
      const t = val.trim();
      return t.length === 0 ? null : t;
    },
    z.string().max(max).nullable().optional(),
  );
}

function refineExactlyOneFeaturedImages<T extends { images: z.infer<typeof blogImageInputSchema>[] }>(
  data: T,
  ctx: z.RefinementCtx,
) {
  const n = data.images.filter((i) => i.is_featured).length;
  if (n !== 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Exactly one image must be marked as the featured cover.",
      path: ["images"],
    });
  }
}

/** Focus keyphrase for keyword density analysis (max 100 chars). */
function optionalFocusKeyphrase() {
  return z.preprocess(
    (val) => {
      if (val === undefined) return undefined;
      if (val === null) return null;
      if (typeof val !== "string") return val;
      const t = val.trim();
      return t.length === 0 ? null : t;
    },
    z.string().max(100).nullable().optional(),
  );
}

/** Canonical URL for duplicate content management. */
function optionalCanonicalUrl() {
  return z.preprocess(
    (val) => {
      if (val === undefined) return undefined;
      if (val === null) return null;
      if (typeof val !== "string") return val;
      const t = val.trim();
      return t.length === 0 ? null : t;
    },
    z.string().url().max(2048).nullable().optional(),
  );
}

/** Robots meta tag for SEO indexing control. */
const robotsMetaSchema = z.enum([
  "index,follow",
  "noindex,follow",
  "index,nofollow",
  "noindex,nofollow",
]).nullable().optional();

export const blogTranslationInputSchema = z.object({
  title: z.string().min(1).max(500),
  slug: z.string().min(1).max(300).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  content: z.string().min(1).max(2_000_000),
  excerpt: z.string().min(1).max(20_000),
  meta_title: optionalSeoString(60),
  meta_description: optionalSeoString(160),
  focus_keyphrase: optionalFocusKeyphrase(),
  canonical_url: optionalCanonicalUrl(),
  image_alts: z.record(z.string(), z.string().min(1).max(500)).default({}),
});

/** Zod 4 `z.record(enum, value)` requires every enum key; blog payloads only include filled locales. */
function omitUndefinedTranslationEntries(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(
      ([, entry]) => entry !== undefined && entry !== null,
    ),
  );
}

const blogTranslationsInputSchema = z.preprocess(
  omitUndefinedTranslationEntries,
  z.record(z.string(), blogTranslationInputSchema).superRefine((translations, ctx) => {
    for (const locale of Object.keys(translations)) {
      if (!appLocaleSchema.safeParse(locale).success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Unsupported locale: ${locale}`,
          path: [locale],
        });
      }
    }
  }),
);

const blogCreateBodySchema = z.object({
  translations: blogTranslationsInputSchema,
  images: z.array(blogImageInputSchema).min(1),
  tags: z.array(z.string()).default([]),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  featured: z.boolean().optional().default(false),
  views_count: z.coerce.number().int().min(0).optional().default(0),
  read_time: z.coerce.number().int().min(0).optional().default(0),
  robots_meta: robotsMetaSchema,
  published_at: z.coerce.date().optional().nullable(),
  category_id: z.string().min(1),
  author_id: z.string().uuid().optional().nullable(),
});

function refineEnglishTranslation<T extends { translations: Record<string, unknown> }>(
  data: T,
  ctx: z.RefinementCtx,
) {
  if (!data.translations?.en) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "English translation is required.",
      path: ["translations", "en"],
    });
  }
}

export const createBlogPostSchema = blogCreateBodySchema
  .superRefine(refineExactlyOneFeaturedImages)
  .superRefine(refineEnglishTranslation);

export const updateBlogPostSchema = blogCreateBodySchema
  .partial()
  .superRefine((data, ctx) => {
    if (data.images === undefined) return;
    if (data.images.length < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one image is required when updating images.",
        path: ["images"],
      });
      return;
    }
    refineExactlyOneFeaturedImages({ images: data.images }, ctx);
  });

/** Dynamic segment for GET (slug or admin id) — raw key before branching on auth + cuid. */
export const blogPostKeyParamSchema = z.object({
  key: z.string().min(1).max(300),
});

/** PATCH/DELETE: internal id only (Prisma cuid). */
export const blogPostCuidParamSchema = z.object({
  key: z.string().cuid(),
});
