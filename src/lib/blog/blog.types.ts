import type { AppLocale } from "@/i18n/routing";

/** Single gallery image on a blog post (DB row) — API / RSC DTO. */
export type BlogPostImageDto = {
  id: string;
  url: string;
  alt: string;
  sortOrder: number;
  isFeatured: boolean;
  /** Supabase `blogs_images` object key when set (admin cleanup / replace). */
  storagePath: string | null;
};

export type BlogPostTranslationDto = {
  locale: AppLocale;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  imageAlts: Record<string, string>;
  seo: {
    metaTitle: string;
    metaDescription: string;
    focusKeyphrase: string | null;
    canonicalUrl: string | null;
  };
};

/** Canonical JSON/RSC shape for a blog post (admin + public API + loaders). */
export type BlogPostDto = {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  /** All images, ordered; exactly one has `isFeatured` for listing / OG. */
  images: BlogPostImageDto[];
  /** Featured cover URL (duplicate of the featured entry for backwards-compatible consumers). */
  image: string;
  imageAlt: string;
  category: {
    id: string;
    name: string;
    slug: string;
  };
  author: {
    id: string;
    name: string;
  };
  publishedAt: Date;
  updatedAt: Date;
  status: string;
  tags: string[];
  featured: boolean;
  viewsCount: number;
  readTime: number;
  seo: {
    metaTitle: string;
    metaDescription: string;
    focusKeyphrase: string | null;
    canonicalUrl: string | null;
    robotsMeta: string | null;
  };
  locale: AppLocale;
  availableLocales: AppLocale[];
  alternateSlugs: Partial<Record<AppLocale, string>>;
};

export type BlogPostAdminDto = BlogPostDto & {
  translations: Record<AppLocale, BlogPostTranslationDto | null>;
};

export type BlogCategoryOptionDto = {
  id: string;
  slug: string;
  name: string;
};
