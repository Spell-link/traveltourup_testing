import { JsonLd } from "@/components/seo/json-ld";
import type { BlogPostDto } from "@/lib/blog/blog.types";
import { SITE_NAME } from "@/config/brand";
import { getSiteUrl } from "@/config/site-url";

type BlogArticleJsonLdProps = {
  blog: BlogPostDto;
  locale: string;
};

export function BlogArticleJsonLd({ blog, locale }: BlogArticleJsonLdProps) {
  const base = getSiteUrl();
  const pageUrl = `${base}/${locale}/blog/${blog.slug}`;

  const images = blog.images.length
    ? blog.images.map((i) => i.url)
    : blog.image
      ? [blog.image]
      : [];

  const article = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: blog.title,
    description: blog.seo.metaDescription || blog.excerpt,
    datePublished: blog.publishedAt.toISOString(),
    dateModified: blog.updatedAt.toISOString(),
    author: {
      "@type": "Person",
      name: blog.author.name,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: `${base}/favicon.png`,
      },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": pageUrl },
    url: pageUrl,
    inLanguage: locale,
    ...(images.length ? { image: images } : {}),
  };

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: `${base}/${locale}`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: `${base}/${locale}/blog`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: blog.title,
        item: pageUrl,
      },
    ],
  };

  return <JsonLd data={[article, breadcrumb]} />;
}
