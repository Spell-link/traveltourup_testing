import type { Metadata } from "next";
import { Suspense } from "react";
// import Home from "@/components/Home";
import FeaturedBlogSection from "@/components/blog/FeaturedBlogSection";
import HomeFeaturedBlogsSkeleton from "@/components/blog/HomeFeaturedBlogsSkeleton";
import { metadataForLocalizedRoute } from "@/config/metadata.config";
import type { AppLocale } from "@/i18n/routing";
import HomeView from "@/views/HomeView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return metadataForLocalizedRoute(locale, "/");
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <HomeView
      blogSection={
        <Suspense fallback={<HomeFeaturedBlogsSkeleton />}>
          <FeaturedBlogSection locale={locale as AppLocale} />
        </Suspense>
      }
    />
  );
}
