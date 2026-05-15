import "server-only";

import type { Prisma } from "@/generated/prisma";
import type { AppLocale } from "@/i18n/routing";
import { prisma } from "@/lib/prisma";

export const blogPostInclude = {
  category: {
    include: {
      translations: true,
    },
  },
  author: { select: { id: true, first_name: true, last_name: true } },
  images: { orderBy: { sort_order: "asc" as const } },
  translations: true,
} as const;

type FindManyArgs = NonNullable<Parameters<typeof prisma.blogPost.findMany>[0]>;

export type BlogPostWhereInput = NonNullable<FindManyArgs["where"]>;
export type BlogPostOrderByInput =
  | Prisma.BlogPostOrderByWithRelationInput
  | Prisma.BlogPostOrderByWithRelationInput[];

type CreateArgs = Parameters<typeof prisma.blogPost.create>[0];
export type BlogPostCreateInput = CreateArgs["data"];

type UpdateArgs = Parameters<typeof prisma.blogPost.update>[0];
export type BlogPostUpdateInput = UpdateArgs["data"];

export type BlogPostTranslationWriteInput = {
  locale: AppLocale;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  meta_title?: string | null;
  meta_description?: string | null;
  focus_keyphrase?: string | null;
  canonical_url?: string | null;
  image_alts: Record<string, string>;
};

async function _blogPostWithRelations() {
  const rows = await prisma.blogPost.findMany({
    include: blogPostInclude,
    take: 1,
  });
  return rows[0];
}

export type BlogPostRow = NonNullable<
  Awaited<ReturnType<typeof _blogPostWithRelations>>
>;

function reorderRowsByIds(rows: BlogPostRow[], ids: string[]): BlogPostRow[] {
  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids.map((id) => byId.get(id)).filter((row): row is BlogPostRow => Boolean(row));
}

export const blogRepository = {
  findManyPublished(args?: { take?: number; skip?: number }) {
    return prisma.blogPost.findMany({
      where: { status: "published", published_at: { not: null } },
      orderBy: [{ featured: "desc" }, { published_at: "desc" }],
      include: blogPostInclude,
      ...args,
    });
  },

  findLatestFeaturedPublished(take: number) {
    return prisma.blogPost.findMany({
      where: {
        status: "published",
        published_at: { not: null },
        featured: true,
      },
      orderBy: { published_at: "desc" },
      take,
      include: blogPostInclude,
    });
  },

  findPublishedByLocaleSlug(locale: AppLocale, slug: string) {
    return prisma.blogPost.findFirst({
      where: {
        status: "published",
        published_at: { not: null },
        translations: {
          some: {
            locale,
            slug,
          },
        },
      },
      include: blogPostInclude,
    });
  },

  findPublishedSlugRowsForSitemap() {
    return prisma.blogPostTranslation.findMany({
      where: {
        blog_post: {
          status: "published",
          published_at: { not: null },
        },
      },
      select: {
        locale: true,
        slug: true,
        updated_at: true,
        blog_post_id: true,
      },
      orderBy: { updated_at: "desc" },
    });
  },

  async findManyPublishedPaginated(args: {
    where: BlogPostWhereInput;
    skip: number;
    take: number;
    locale?: AppLocale;
  }) {
    const where: BlogPostWhereInput = {
      ...args.where,
      status: "published",
      published_at: { not: null },
    };
    const [rows, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        orderBy: [{ featured: "desc" }, { published_at: "desc" }],
        skip: args.skip,
        take: args.take,
        include: blogPostInclude,
      }),
      prisma.blogPost.count({ where }),
    ]);
    return { rows, total };
  },

  async findManyPaginatedAdmin(args: {
    where: BlogPostWhereInput;
    skip: number;
    take: number;
    orderBy: BlogPostOrderByInput;
    sort?: "title" | "slug";
    order?: "asc" | "desc";
  }) {
    if (args.sort === "title" || args.sort === "slug") {
      const translationWhere: Prisma.BlogPostTranslationWhereInput = {
        locale: "en",
        blog_post: args.where,
      };
      const [translations, total] = await Promise.all([
        prisma.blogPostTranslation.findMany({
          where: translationWhere,
          orderBy: { [args.sort]: args.order ?? "desc" },
          skip: args.skip,
          take: args.take,
          select: { blog_post_id: true },
        }),
        prisma.blogPostTranslation.count({ where: translationWhere }),
      ]);
      const ids = translations.map((row) => row.blog_post_id);
      if (ids.length === 0) {
        return { rows: [], total };
      }
      const rows = await prisma.blogPost.findMany({
        where: { id: { in: ids } },
        include: blogPostInclude,
      });
      return { rows: reorderRowsByIds(rows, ids), total };
    }

    const [rows, total] = await Promise.all([
      prisma.blogPost.findMany({
        where: args.where,
        orderBy: args.orderBy,
        skip: args.skip,
        take: args.take,
        include: blogPostInclude,
      }),
      prisma.blogPost.count({ where: args.where }),
    ]);
    return { rows, total };
  },

  findByIdAdmin(id: string) {
    return prisma.blogPost.findUnique({
      where: { id },
      include: blogPostInclude,
    });
  },

  findTranslationByLocaleSlug(locale: AppLocale, slug: string, excludePostId?: string) {
    return prisma.blogPostTranslation.findFirst({
      where: {
        locale,
        slug,
        ...(excludePostId ? { NOT: { blog_post_id: excludePostId } } : {}),
      },
      select: { id: true, blog_post_id: true },
    });
  },

  create(data: BlogPostCreateInput) {
    return prisma.blogPost.create({
      data,
      include: blogPostInclude,
    });
  },

  update(id: string, data: BlogPostUpdateInput) {
    return prisma.blogPost.update({
      where: { id },
      data,
      include: blogPostInclude,
    });
  },

  delete(id: string) {
    return prisma.blogPost.delete({ where: { id } });
  },

  async upsertTranslations(postId: string, translations: BlogPostTranslationWriteInput[]) {
    for (const translation of translations) {
      await prisma.blogPostTranslation.upsert({
        where: {
          blog_post_id_locale: {
            blog_post_id: postId,
            locale: translation.locale,
          },
        },
        create: {
          blog_post_id: postId,
          locale: translation.locale,
          title: translation.title,
          slug: translation.slug,
          content: translation.content,
          excerpt: translation.excerpt,
          meta_title: translation.meta_title ?? null,
          meta_description: translation.meta_description ?? null,
          focus_keyphrase: translation.focus_keyphrase ?? null,
          canonical_url: translation.canonical_url ?? null,
          image_alts: translation.image_alts,
        },
        update: {
          title: translation.title,
          slug: translation.slug,
          content: translation.content,
          excerpt: translation.excerpt,
          meta_title: translation.meta_title ?? null,
          meta_description: translation.meta_description ?? null,
          focus_keyphrase: translation.focus_keyphrase ?? null,
          canonical_url: translation.canonical_url ?? null,
          image_alts: translation.image_alts,
        },
      });
    }
  },

  findManyCategories(locale: AppLocale = "en") {
    return prisma.blogCategory.findMany({
      orderBy: { slug: "asc" },
      select: {
        id: true,
        slug: true,
        translations: {
          where: { locale },
          select: { name: true, locale: true },
        },
      },
    });
  },
};
