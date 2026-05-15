import "server-only";

import type { NextRequest } from "next/server";
import { handleApiError } from "@/lib/api/error-handler";
import { paginatedResponse, successResponse } from "@/lib/api/response";
import { getServerAuthz } from "@/lib/authz/session";
import { hasPermission } from "@/lib/authz/guards";
import type { PermissionId } from "@/lib/authz/registry";
import {
  deleteAdminBlogPost,
  getAdminBlogPost,
  getPublicBlogPostBySlug,
  listAdminBlogPosts,
  listPublicBlogPosts,
} from "@/lib/services/blog/blog.service";
import {
  createAdminBlogPost,
  updateAdminBlogPost,
} from "@/lib/services/blog/blog-write.service";
import {
  appLocaleSchema,
  blogAdminListQuerySchema,
  blogPostCuidParamSchema,
  blogPostKeyParamSchema,
  blogPublicListQuerySchema,
  createBlogPostSchema,
  updateBlogPostSchema,
} from "@/lib/validations/blog.schema";
import { z } from "zod";

const BLOG_READ: PermissionId = "admin.blogs:read";

function isBlogPostCuid(key: string): boolean {
  return z.string().cuid().safeParse(key).success;
}

export async function handleBlogCollectionGET(req: NextRequest): Promise<Response> {
  try {
    const { authz } = await getServerAuthz();
    const { searchParams } = new URL(req.url);

    if (hasPermission(authz, BLOG_READ)) {
      const query = blogAdminListQuerySchema.parse({
        q: searchParams.get("q") ?? undefined,
        status: searchParams.get("status") ?? undefined,
        category_id: searchParams.get("category_id") ?? undefined,
        page: searchParams.get("page") ?? undefined,
        limit: searchParams.get("limit") ?? undefined,
        sort: searchParams.get("sort") ?? undefined,
        order: searchParams.get("order") ?? undefined,
      });
      const { items, total } = await listAdminBlogPosts(query);
      return paginatedResponse(items, {
        total,
        page: query.page,
        limit: query.limit,
      });
    }

    const query = blogPublicListQuerySchema.parse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      q: searchParams.get("q") ?? undefined,
      category_slug: searchParams.get("category_slug") ?? undefined,
      locale: searchParams.get("locale") ?? undefined,
    });
    const { items, total, page, limit } = await listPublicBlogPosts(query);
    return paginatedResponse(items, { total, page, limit });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function handleBlogCollectionPOST(req: NextRequest): Promise<Response> {
  try {
    const body = await req.json();
    const data = createBlogPostSchema.parse(body);
    const post = await createAdminBlogPost(data);
    return successResponse(post, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function handleBlogItemGET(
  req: NextRequest,
  params: Promise<{ key: string }>,
): Promise<Response> {
  try {
    const { key } = blogPostKeyParamSchema.parse(await params);
    const { authz } = await getServerAuthz();

    if (hasPermission(authz, BLOG_READ) && isBlogPostCuid(key)) {
      const post = await getAdminBlogPost(key);
      return successResponse(post);
    }

    const { searchParams } = new URL(req.url);
    const locale = appLocaleSchema.optional().parse(searchParams.get("locale") ?? undefined);
    const post = await getPublicBlogPostBySlug(key, locale);
    return successResponse(post);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function handleBlogItemPATCH(
  req: NextRequest,
  params: Promise<{ key: string }>,
): Promise<Response> {
  try {
    const { key } = blogPostCuidParamSchema.parse(await params);
    const body = await req.json();
    const data = updateBlogPostSchema.parse(body);
    const post = await updateAdminBlogPost(key, data);
    return successResponse(post);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function handleBlogItemDELETE(
  _req: NextRequest,
  params: Promise<{ key: string }>,
): Promise<Response> {
  try {
    const { key } = blogPostCuidParamSchema.parse(await params);
    await deleteAdminBlogPost(key);
    return successResponse({ ok: true as const });
  } catch (error) {
    return handleApiError(error);
  }
}
