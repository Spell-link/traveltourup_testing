import "server-only";

import { loadLatestFeaturedBlogPostsForHome } from "@/lib/services/blog/blog.service";
import HomeFeaturedBlogs from "@/components/blog/home-featured-blogs";
import type { AppLocale } from "@/i18n/routing";

export default async function FeaturedBlogSection({ locale }: { locale: AppLocale }) {
  const posts = await loadLatestFeaturedBlogPostsForHome(4, locale);
  return <HomeFeaturedBlogs posts={posts} />;
}
