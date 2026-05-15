import "server-only";

import { cache } from "react";

import { NotFoundError } from "@/lib/api/errors";
import type {
  BlogCategoryOptionDto,
  BlogPostAdminDto,
  BlogPostDto,
  BlogPostImageDto,
  BlogPostTranslationDto,
} from "@/lib/blog/blog.types";
import {
  blogRepository,
  type BlogPostRow,
  type BlogPostOrderByInput,
  type BlogPostWhereInput,
} from "@/lib/db/repositories/blog.repository";
import { defaultLocale, locales, type AppLocale } from "@/i18n/routing";
import {
  blogAdminListQuerySchema,
  blogPublicListQuerySchema,
} from "@/lib/validations/blog.schema";
import type { z } from "zod";

type AdminListQuery = z.infer<typeof blogAdminListQuerySchema>;
type PublicListQuery = z.infer<typeof blogPublicListQuerySchema>;

type BlogTranslationRow = BlogPostRow["translations"][number];
type BlogCategoryTranslationRow = BlogPostRow["category"]["translations"][number];

function authorDisplayName(row: BlogPostRow): { id: string; name: string } {
  if (!row.author) {
    return { id: "team", name: "TravelTourUp Team" };
  }
  const name = [row.author.first_name, row.author.last_name].filter(Boolean).join(" ").trim();
  return {
    id: row.author.id,
    name: name || "TravelTourUp Team",
  };
}

function translationByLocale(
  translations: BlogTranslationRow[],
  locale: AppLocale,
): BlogTranslationRow | undefined {
  return translations.find((translation) => translation.locale === locale);
}

function resolveCategoryName(
  translations: BlogCategoryTranslationRow[],
  locale: AppLocale,
): string {
  const localized = translations.find((translation) => translation.locale === locale);
  const english = translations.find((translation) => translation.locale === defaultLocale);
  return localized?.name ?? english?.name ?? translations[0]?.name ?? "Category";
}

function parseImageAlts(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const entries = Object.entries(value as Record<string, unknown>).filter(
    ([, alt]) => typeof alt === "string" && alt.trim().length > 0,
  );
  return Object.fromEntries(entries) as Record<string, string>;
}

function mapImages(row: BlogPostRow, imageAlts: Record<string, string>): BlogPostImageDto[] {
  const images = row.images ?? [];
  return images.map((img) => ({
    id: img.id,
    url: img.url,
    alt: imageAlts[img.id] ?? "",
    sortOrder: img.sort_order,
    isFeatured: img.is_featured,
    storagePath: img.storage_path,
  }));
}

function deriveCoverFromImages(images: BlogPostImageDto[]): { image: string; imageAlt: string } {
  const featured = images.find((i) => i.isFeatured) ?? images[0];
  return {
    image: featured?.url ?? "",
    imageAlt: featured?.alt ?? "",
  };
}

function pickTranslation(
  translations: BlogTranslationRow[],
  locale: AppLocale,
): BlogTranslationRow | undefined {
  const localized = translationByLocale(translations, locale);
  if (localized) return localized;
  return translationByLocale(translations, defaultLocale);
}

function mapTranslationDto(row: BlogTranslationRow): BlogPostTranslationDto {
  return {
    locale: row.locale as AppLocale,
    title: row.title,
    slug: row.slug,
    content: row.content,
    excerpt: row.excerpt,
    imageAlts: parseImageAlts(row.image_alts),
    seo: {
      metaTitle: row.meta_title ?? row.title,
      metaDescription: row.meta_description ?? row.excerpt,
      focusKeyphrase: row.focus_keyphrase ?? null,
      canonicalUrl: row.canonical_url ?? null,
    },
  };
}

export function resolveBlogPostDto(row: BlogPostRow, locale: AppLocale = defaultLocale): BlogPostDto {
  const english = translationByLocale(row.translations, defaultLocale);
  const active = pickTranslation(row.translations, locale) ?? english;
  if (!active || !english) {
    throw new NotFoundError("Blog post translation");
  }

  const imageAlts = {
    ...parseImageAlts(english.image_alts),
    ...parseImageAlts(active.image_alts),
  };
  const images = mapImages(row, imageAlts);
  const { image, imageAlt } = deriveCoverFromImages(images);
  const publishedAt = row.published_at ?? row.created_at;
  const availableLocales = row.translations.map((translation) => translation.locale as AppLocale);
  const alternateSlugs = Object.fromEntries(
    row.translations.map((translation) => [translation.locale as AppLocale, translation.slug]),
  ) as Partial<Record<AppLocale, string>>;

  return {
    id: row.id,
    title: active.title || english.title,
    slug: active.slug || english.slug,
    content: active.content || english.content,
    excerpt: active.excerpt || english.excerpt,
    images,
    image,
    imageAlt,
    category: {
      id: row.category.id,
      name: resolveCategoryName(row.category.translations, locale),
      slug: row.category.slug,
    },
    author: authorDisplayName(row),
    publishedAt,
    updatedAt: row.updated_at,
    status: row.status,
    tags: row.tags,
    featured: row.featured,
    viewsCount: row.views_count,
    readTime: row.read_time,
    seo: {
      metaTitle: active.meta_title ?? active.title ?? english.meta_title ?? english.title,
      metaDescription:
        active.meta_description ?? active.excerpt ?? english.meta_description ?? english.excerpt,
      focusKeyphrase: active.focus_keyphrase ?? english.focus_keyphrase ?? null,
      canonicalUrl: active.canonical_url ?? english.canonical_url ?? null,
      robotsMeta: row.robots_meta ?? "index,follow",
    },
    locale,
    availableLocales,
    alternateSlugs,
  };
}

export function mapRowToAdminDto(row: BlogPostRow): BlogPostAdminDto {
  const base = resolveBlogPostDto(row, defaultLocale);
  const translations = Object.fromEntries(
    locales.map((locale) => {
      const translation = translationByLocale(row.translations, locale);
      return [locale, translation ? mapTranslationDto(translation) : null];
    }),
  ) as Record<AppLocale, BlogPostTranslationDto | null>;

  return {
    ...base,
    translations,
  };
}

export function mapRowToDto(row: BlogPostRow, locale: AppLocale = defaultLocale): BlogPostDto {
  return resolveBlogPostDto(row, locale);
}

const idAsc = { id: "asc" as const };

function listOrderBy(query: AdminListQuery): BlogPostOrderByInput {
  const dir = query.order;
  if (!query.sort) {
    return [{ updated_at: "desc" }, idAsc];
  }
  switch (query.sort) {
    case "title":
    case "slug":
      return [{ updated_at: "desc" }, idAsc];
    case "status":
      return [{ status: dir }, idAsc];
    case "category":
      return [{ category: { slug: dir } }, idAsc];
    case "updated":
      return [{ updated_at: dir }, idAsc];
    default:
      return [{ updated_at: "desc" }, idAsc];
  }
}

export async function listAdminBlogPosts(query: AdminListQuery): Promise<{
  items: BlogPostDto[];
  total: number;
}> {
  const where: BlogPostWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.category_id ? { category_id: query.category_id } : {}),
    ...(query.q
      ? {
          translations: {
            some: {
              locale: defaultLocale,
              OR: [
                { title: { contains: query.q, mode: "insensitive" } },
                { slug: { contains: query.q, mode: "insensitive" } },
                { excerpt: { contains: query.q, mode: "insensitive" } },
              ],
            },
          },
        }
      : {}),
  };

  const skip = (query.page - 1) * query.limit;
  const { rows, total } = await blogRepository.findManyPaginatedAdmin({
    where,
    skip,
    take: query.limit,
    orderBy: listOrderBy(query),
    sort: query.sort === "title" || query.sort === "slug" ? query.sort : undefined,
    order: query.order,
  });
  return { items: rows.map((row) => mapRowToDto(row, defaultLocale)), total };
}

export async function getAdminBlogPost(id: string): Promise<BlogPostAdminDto> {
  const row = await blogRepository.findByIdAdmin(id);
  if (!row) {
    throw new NotFoundError("Blog post");
  }
  return mapRowToAdminDto(row);
}

export function buildPublishedAt(
  status: string,
  publishedAt: Date | null | undefined,
  existing?: Date | null,
): Date | null {
  if (status !== "published") {
    return null;
  }
  if (publishedAt) return publishedAt;
  if (existing) return existing;
  return new Date();
}

export async function deleteAdminBlogPost(id: string): Promise<void> {
  await getAdminBlogPost(id);
  await blogRepository.delete(id);
}

export async function listPublicBlogPosts(query: PublicListQuery): Promise<{
  items: BlogPostDto[];
  total: number;
  page: number;
  limit: number;
}> {
  const locale = query.locale ?? defaultLocale;
  const extraWhere: BlogPostWhereInput = {
    ...(query.q
      ? {
          translations: {
            some: {
              locale,
              OR: [
                { title: { contains: query.q, mode: "insensitive" } },
                { excerpt: { contains: query.q, mode: "insensitive" } },
              ],
            },
          },
        }
      : {}),
    ...(query.category_slug
      ? { category: { slug: query.category_slug } }
      : {}),
  };

  const skip = (query.page - 1) * query.limit;
  const { rows, total } = await blogRepository.findManyPublishedPaginated({
    where: extraWhere,
    skip,
    take: query.limit,
    locale,
  });

  return {
    items: rows.map((row) => mapRowToDto(row, locale)),
    total,
    page: query.page,
    limit: query.limit,
  };
}

export async function getPublicBlogPostBySlug(
  slug: string,
  locale: AppLocale = defaultLocale,
): Promise<BlogPostDto> {
  const row = await blogRepository.findPublishedByLocaleSlug(locale, slug);
  if (!row) {
    throw new NotFoundError("Blog post");
  }
  return mapRowToDto(row, locale);
}

export async function loadPublishedBlogPostsForMarketing(
  locale: AppLocale = defaultLocale,
): Promise<BlogPostDto[]> {
  const { items } = await listPublicBlogPosts({ page: 1, limit: 500, locale });
  return items;
}

export const loadLatestFeaturedBlogPostsForHome = cache(
  async (limit = 4, locale: AppLocale = defaultLocale): Promise<BlogPostDto[]> => {
    const rows = await blogRepository.findLatestFeaturedPublished(limit);
    return rows.map((row) => mapRowToDto(row, locale));
  },
);

export const loadPublicBlogPostBySlug = cache(
  async (slug: string, locale: AppLocale = defaultLocale): Promise<BlogPostDto | null> => {
    try {
      return await getPublicBlogPostBySlug(slug, locale);
    } catch (e) {
      if (e instanceof NotFoundError) return null;
      throw e;
    }
  },
);

export async function listBlogCategoriesForAdmin(
  locale: AppLocale = defaultLocale,
): Promise<BlogCategoryOptionDto[]> {
  const rows = await blogRepository.findManyCategories(locale);
  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.translations[0]?.name ?? row.slug,
  }));
}
