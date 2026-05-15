import "server-only";

import { ConflictError, NotFoundError } from "@/lib/api/errors";
import type { BlogPostDto } from "@/lib/blog/blog.types";
import {
  blogRepository,
  type BlogPostTranslationWriteInput,
  type BlogPostUpdateInput,
} from "@/lib/db/repositories/blog.repository";
import type { AppLocale } from "@/i18n/routing";
import {
  createBlogPostSchema,
  updateBlogPostSchema,
} from "@/lib/validations/blog.schema";
import type { z } from "zod";
import { sanitizeStoredBlogHtml } from "./blog-html-sanitize";
import { buildPublishedAt, mapRowToDto } from "./blog.service";

type CreateBody = z.infer<typeof createBlogPostSchema>;
type UpdateBody = z.infer<typeof updateBlogPostSchema>;

type BlogImageRow = {
  url: string;
  sort_order: number;
  is_featured: boolean;
  storage_path: string | null;
};

function normalizeBlogImageRowsForDb(images: BlogImageRow[]): BlogImageRow[] {
  if (images.length === 0) return images;
  const idx = images.findIndex((i) => i.is_featured);
  if (idx >= 0) {
    return images.map((img, i) => ({
      ...img,
      is_featured: i === idx,
    }));
  }
  return images.map((img, i) => ({
    ...img,
    is_featured: i === 0,
  }));
}

function slugConflictIssues(locale: AppLocale, slug: string) {
  return [
    {
      path: ["translations", locale, "slug"],
      message: `A post with slug "${slug}" already exists for ${locale}.`,
    },
  ] as const;
}

function remapImageAlts(
  imageAlts: Record<string, string>,
  images: Array<{ id: string; sort_order: number }>,
): Record<string, string> {
  const bySortOrder = new Map(images.map((image) => [String(image.sort_order), image.id]));
  const remapped: Record<string, string> = {};

  for (const [key, alt] of Object.entries(imageAlts)) {
    const imageId = bySortOrder.get(key) ?? key;
    remapped[imageId] = alt;
  }

  return remapped;
}

function toTranslationWrites(
  translations: CreateBody["translations"],
  images: Array<{ id: string; sort_order: number }>,
): BlogPostTranslationWriteInput[] {
  return Object.entries(translations).map(([locale, translation]) => ({
    locale: locale as AppLocale,
    title: translation.title,
    slug: translation.slug,
    content: sanitizeStoredBlogHtml(translation.content),
    excerpt: translation.excerpt,
    meta_title: translation.meta_title ?? null,
    meta_description: translation.meta_description ?? null,
    focus_keyphrase: translation.focus_keyphrase ?? null,
    canonical_url: translation.canonical_url ?? null,
    image_alts: remapImageAlts(translation.image_alts ?? {}, images),
  }));
}

async function assertUniqueTranslationSlugs(
  translations: BlogPostTranslationWriteInput[],
  excludePostId?: string,
): Promise<void> {
  for (const translation of translations) {
    const existing = await blogRepository.findTranslationByLocaleSlug(
      translation.locale,
      translation.slug,
      excludePostId,
    );
    if (existing) {
      throw new ConflictError(
        `A post with slug "${translation.slug}" already exists for ${translation.locale}.`,
        [...slugConflictIssues(translation.locale, translation.slug)],
      );
    }
  }
}

export async function createAdminBlogPost(body: CreateBody): Promise<BlogPostDto> {
  const published_at = buildPublishedAt(body.status, body.published_at, null);
  const imageRows = normalizeBlogImageRowsForDb(
    body.images.map((img, i) => ({
      url: img.url,
      sort_order: img.sort_order ?? i,
      is_featured: img.is_featured,
      storage_path: img.storage_path ?? null,
    })),
  );

  const translationWrites = toTranslationWrites(body.translations, imageRows.map((row, index) => ({
    id: String(index),
    sort_order: row.sort_order,
  })));
  await assertUniqueTranslationSlugs(translationWrites);

  const row = await blogRepository.create({
    tags: body.tags,
    status: body.status,
    featured: body.featured,
    views_count: body.views_count,
    read_time: body.read_time,
    robots_meta: body.robots_meta ?? "index,follow",
    published_at,
    category: { connect: { id: body.category_id } },
    ...(body.author_id
      ? { author: { connect: { id: body.author_id } } }
      : {}),
    images: {
      create: imageRows.map((row) => ({
        url: row.url,
        sort_order: row.sort_order,
        is_featured: row.is_featured,
        storage_path: row.storage_path,
      })),
    },
  });

  const remappedTranslations = toTranslationWrites(body.translations, row.images);
  await blogRepository.upsertTranslations(row.id, remappedTranslations);

  const refreshed = await blogRepository.findByIdAdmin(row.id);
  if (!refreshed) {
    throw new NotFoundError("Blog post");
  }
  return mapRowToDto(refreshed);
}

export async function updateAdminBlogPost(id: string, body: UpdateBody): Promise<BlogPostDto> {
  const existing = await blogRepository.findByIdAdmin(id);
  if (!existing) {
    throw new NotFoundError("Blog post");
  }

  const nextStatus = body.status ?? existing.status;
  const published_at =
    body.published_at !== undefined || body.status !== undefined
      ? buildPublishedAt(nextStatus, body.published_at ?? existing.published_at, existing.published_at)
      : existing.published_at;

  const data: BlogPostUpdateInput = {};
  if (body.images !== undefined) {
    const imageRows = normalizeBlogImageRowsForDb(
      body.images.map((img, i) => ({
        url: img.url,
        sort_order: img.sort_order ?? i,
        is_featured: img.is_featured,
        storage_path: img.storage_path ?? null,
      })),
    );
    data.images = {
      deleteMany: {},
      create: imageRows.map((row) => ({
        url: row.url,
        sort_order: row.sort_order,
        is_featured: row.is_featured,
        storage_path: row.storage_path,
      })),
    };
  }
  if (body.tags !== undefined) data.tags = body.tags;
  if (body.status !== undefined) data.status = body.status;
  if (body.featured !== undefined) data.featured = body.featured;
  if (body.views_count !== undefined) data.views_count = body.views_count;
  if (body.read_time !== undefined) data.read_time = body.read_time;
  if (body.robots_meta !== undefined) data.robots_meta = body.robots_meta;
  if (body.published_at !== undefined || body.status !== undefined) {
    data.published_at = published_at;
  }
  if (body.category_id !== undefined) {
    data.category = { connect: { id: body.category_id } };
  }
  if (body.author_id !== undefined) {
    data.author = body.author_id
      ? { connect: { id: body.author_id } }
      : { disconnect: true };
  }

  const row = Object.keys(data).length > 0
    ? await blogRepository.update(id, data)
    : existing;

  if (body.translations) {
    const translationWrites = toTranslationWrites(body.translations, row.images);
    await assertUniqueTranslationSlugs(translationWrites, id);
    await blogRepository.upsertTranslations(id, translationWrites);
  }

  const refreshed = await blogRepository.findByIdAdmin(id);
  if (!refreshed) {
    throw new NotFoundError("Blog post");
  }
  return mapRowToDto(refreshed);
}
