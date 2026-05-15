import type { MetadataRoute } from "next";
import { BASE_URL } from "@/config/metadata.config";
import { blogRepository } from "@/lib/db/repositories/blog.repository";
import { routing } from "@/i18n/routing";

/** Stable hint for marketing URLs; override with NEXT_PUBLIC_SEO_STATIC_LASTMOD (ISO 8601) when static copy changes. */
function staticMarketingLastModified(): Date {
  const raw = process.env.NEXT_PUBLIC_SEO_STATIC_LASTMOD?.trim();
  if (raw) {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date(Date.UTC(2026, 4, 8));
}

const STATIC_MARKETING_LASTMOD = staticMarketingLastModified();

/** Customer-facing paths (without locale prefix); site uses `/[locale]/…`. */
const LOCALIZED_PATHS: {
  path: string;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[0]["changeFrequency"]>;
  priority: number;
}[] = [
  { path: "", changeFrequency: "daily", priority: 1 },
  { path: "/flights", changeFrequency: "daily", priority: 0.95 },
  { path: "/hotels", changeFrequency: "daily", priority: 0.95 },
  { path: "/cars", changeFrequency: "weekly", priority: 0.9 },
  { path: "/blog", changeFrequency: "weekly", priority: 0.88 },
  { path: "/about", changeFrequency: "monthly", priority: 0.75 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.75 },
  { path: "/faqs", changeFrequency: "monthly", priority: 0.72 },
  { path: "/privacy", changeFrequency: "monthly", priority: 0.45 },
  { path: "/terms", changeFrequency: "monthly", priority: 0.45 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of routing.locales) {
    for (const { path, changeFrequency, priority } of LOCALIZED_PATHS) {
      const urlPath = path === "" ? `/${locale}` : `/${locale}${path}`;
      entries.push({
        url: `${BASE_URL}${urlPath}`,
        lastModified: STATIC_MARKETING_LASTMOD,
        changeFrequency,
        priority,
      });
    }
  }

  let posts: { slug: string; updated_at: Date; locale: string }[] = [];
  try {
    posts = await blogRepository.findPublishedSlugRowsForSitemap();
  } catch {
    // DB unavailable (e.g. local without DB) — still emit static URLs.
  }

  for (const post of posts) {
    entries.push({
      url: `${BASE_URL}/${post.locale}/blog/${post.slug}`,
      lastModified: post.updated_at,
      changeFrequency: "monthly",
      priority: 0.64,
    });
  }

  return entries;
}
