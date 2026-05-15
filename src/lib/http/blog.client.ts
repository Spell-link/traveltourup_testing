"use client";

import { apiJson, apiPaginatedJson, type PaginatedApiResponse } from "@/lib/http/api-client";
import type { BlogPostAdminDto, BlogPostDto } from "@/lib/blog/blog.types";

export const BLOGS_V1_BASE = "/api/v1/blogs";

// --------------- Read (admin + public — server decides by auth) ---------------

export async function listBlogPosts(
  params?: Record<string, string | number | undefined>,
): Promise<PaginatedApiResponse<BlogPostDto>> {
  return apiPaginatedJson<BlogPostDto>(BLOGS_V1_BASE, params);
}

export async function getBlogPost(key: string): Promise<BlogPostAdminDto> {
  return apiJson<BlogPostAdminDto>(`${BLOGS_V1_BASE}/${encodeURIComponent(key)}`);
}

export async function listBlogCategories(): Promise<
  { id: string; name: string; slug: string }[]
> {
  return apiJson(`${BLOGS_V1_BASE}/categories`);
}

// --------------- Write (requires admin permission) ---------------

export async function createBlogPost(body: unknown): Promise<BlogPostDto> {
  return apiJson<BlogPostDto>(BLOGS_V1_BASE, { method: "POST", body });
}

export async function updateBlogPost(id: string, body: unknown): Promise<BlogPostDto> {
  return apiJson<BlogPostDto>(`${BLOGS_V1_BASE}/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body,
  });
}

export async function deleteBlogPost(id: string): Promise<void> {
  await apiJson<{ ok: true }>(`${BLOGS_V1_BASE}/${encodeURIComponent(id)}`, { method: "DELETE" });
}
