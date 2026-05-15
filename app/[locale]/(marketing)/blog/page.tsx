import type { Metadata } from "next";
import { metadataForLocalizedRoute } from "@/config/metadata.config";
import { loadPublishedBlogPostsForMarketing } from "@/lib/services/blog/blog.service";
import BlogPostsExplorer from "@/components/blog/blog-explorer";
import type { AppLocale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return metadataForLocalizedRoute(locale, "/blog");
}

export default async function BlogIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const posts = await loadPublishedBlogPostsForMarketing(locale as AppLocale);
  return (
    <main>
      <BlogPostsExplorer posts={posts} />
    </main>
  );
}
