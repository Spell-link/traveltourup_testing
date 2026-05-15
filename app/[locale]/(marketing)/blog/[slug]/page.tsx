import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import { notFound } from "next/navigation";
import { BlogArticleJsonLd } from "@/components/seo/blog-article-json-ld";
import { BlogHubLinks } from "@/components/blog/blog-hub-links";
import { BlogPostArticleEnd } from "@/components/blog/blog-post-article-end";
import { BlogPostMedia } from "@/components/blog/blog-post-media";
import {
  createLocalizedRouteMetadata,
} from "@/config/metadata.config";
import { getSiteUrl } from "@/config/site-url";
import { loadPublicBlogPostBySlug } from "@/lib/services/blog/blog.service";
import { routing, type AppLocale } from "@/i18n/routing";
import { rtlDirProp, rtlTypographyClass } from "@/lib/i18n/rtl-typography";
import { cn } from "@/lib/utils";
import HtmlTextRenderer from "@/components/admin_ui/shared/html-text-renderer";

export const dynamic = "force-dynamic";

type BlogDetailPageProps = {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
};

export async function generateMetadata({ params }: BlogDetailPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const blog = await loadPublicBlogPostBySlug(slug, locale as AppLocale);

  if (!blog) {
    return {
      title: "Blog Not Found",
      description: "The blog post you are looking for does not exist.",
    };
  }

  const keywordList = [
    ...blog.tags,
    "travel blog",
    "TravelTourUp",
    blog.category.name.toLowerCase(),
  ];

  const config = {
    title: blog.seo.metaTitle || blog.title,
    description: blog.seo.metaDescription || blog.excerpt,
    keywords: keywordList,
    openGraph: {
      title: blog.seo.metaTitle || blog.title,
      description: blog.seo.metaDescription || blog.excerpt,
    },
  };

  const md = createLocalizedRouteMetadata(config, locale, `/blog/${blog.slug}`);
  const base = getSiteUrl();
  const languages: Record<string, string> = {
    "x-default": `${base}/en/blog/${blog.alternateSlugs.en ?? blog.slug}`,
  };
  for (const l of routing.locales) {
    const localizedSlug = blog.alternateSlugs[l as AppLocale];
    if (localizedSlug) {
      languages[l] = `${base}/${l}/blog/${localizedSlug}`;
    }
  }
  const ogImages = blog.images.map((img) => ({
    url: img.url,
    alt: img.alt,
  }));
  return {
    ...md,
    alternates: {
      canonical: `${base}/${locale}/blog/${blog.slug}`,
      languages,
    },
    openGraph: {
      ...md.openGraph,
      images: ogImages,
    },
    twitter: {
      ...md.twitter,
      ...(ogImages.length ? { images: ogImages.map((i) => i.url) } : {}),
    },
  };
}

const postShell =
  "overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-b from-card/90 via-card/55 to-muted/25 " +
  "shadow-[0_2px_28px_-14px_rgba(15,23,42,0.22)] ring-1 ring-inset ring-white/5 " +
  "dark:from-card/55 dark:via-card/35 dark:to-card/20 dark:shadow-[0_4px_40px_-12px_rgba(0,0,0,0.55)] " +
  "sm:rounded-3xl";

const Page = async ({ params }: BlogDetailPageProps) => {
  const { slug, locale } = await params;
  const blog = await loadPublicBlogPostBySlug(slug, locale as AppLocale);

  if (!blog) {
    notFound();
  }

  const cover = blog.images.find((i) => i.isFeatured) ?? blog.images[0];
  const rest = cover ? blog.images.filter((i) => i.id !== cover.id) : [];
  const hasMedia = blog.images.length > 0;

  const contentFrame =
    "relative mx-auto min-w-0 w-[92%] max-w-[1600px] px-0 sm:w-[88%] md:w-[80%] lg:w-[80%]";
  const articleDir = rtlDirProp(locale as AppLocale);
  const articleTypography = rtlTypographyClass(locale as AppLocale);
  return (
    <section className="relative overflow-x-clip bg-gradient-to-b from-background via-background to-muted/25 pb-16 pt-8 md:pb-20 md:pt-12">
      <BlogArticleJsonLd blog={blog} locale={locale} />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-primary/[0.08] via-primary/[0.02] to-transparent dark:from-primary/15 dark:via-primary/5"
        aria-hidden
      />

      <div className={contentFrame}>
    

        <div className={postShell}>
          <header className="border-b border-border/40 px-6 py-6 sm:px-8 sm:py-7 md:px-10 md:py-8">
            <div className="mb-4 flex flex-wrap items-center gap-2.5 text-sm text-muted-foreground">
              <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold tracking-wide text-primary">
                {blog.category.name}
              </span>
              <span className="h-1 w-1 rounded-full bg-border" aria-hidden />
              <span className="tabular-nums">{blog.readTime} min read</span>
              <span className="h-1 w-1 rounded-full bg-border" aria-hidden />
              <span className="tabular-nums">{blog.viewsCount} views</span>
              <span className="h-1 w-1 rounded-full bg-border" aria-hidden />
              <time
                className="tabular-nums"
                dateTime={blog.publishedAt.toISOString()}
              >
                {blog.publishedAt.toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
            </div>

            <h1 className="text-balance font-[family-name:var(--heading-font)] text-3xl font-bold leading-[1.15] tracking-tight text-foreground sm:text-4xl md:text-[2.5rem] md:leading-tight">
              {blog.title}
            </h1>
            {blog.excerpt ? (
              <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground md:text-xl">
                {blog.excerpt}
              </p>
            ) : null}
          </header>

          {hasMedia ? (
            <div className="border-b border-border/30 bg-muted/10 ">
              <BlogPostMedia
                cover={cover}
                rest={rest}
                postTitle={blog.title}
                embedded
              />
            </div>
          ) : null}

          <div
            className={cn(
              "px-6 py-8 sm:px-8 sm:py-9 md:px-10 md:py-10",
              hasMedia && "border-t border-border/25"
            )}
            id="article-body"
          >
            <div className="mb-5 flex items-center gap-3 sm:mb-6">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary shadow-sm ring-1 ring-primary/15 sm:h-10 sm:w-10">
                <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
              </div>
              <div>
                <span className="text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                  Article
                </span>
                <p className="mt-0.5 text-sm text-muted-foreground/90">Full story</p>
              </div>
            </div>

            {/* <article
              className="prose prose-lg prose-neutral max-w-none dark:prose-invert xl:prose-xl
            prose-headings:scroll-mt-24 prose-headings:font-[family-name:var(--heading-font)] prose-headings:font-bold prose-headings:tracking-tight
            prose-h2:mt-10 prose-h2:mb-4 prose-h2:border-b prose-h2:border-border/50 prose-h2:pb-3 prose-h2:text-2xl sm:prose-h2:text-3xl
            prose-h3:mt-8 prose-h3:mb-3 prose-h3:text-xl sm:prose-h3:text-2xl
            prose-p:leading-[1.8] prose-p:text-foreground/95
            prose-a:font-medium prose-a:text-primary prose-a:no-underline prose-a:decoration-2 prose-a:decoration-primary/30 prose-a:underline-offset-2 hover:prose-a:underline
            prose-strong:font-semibold prose-strong:text-foreground
            prose-ul:my-4 prose-ol:my-4 prose-li:my-1.5 prose-li:marker:text-primary/80
            prose-blockquote:my-6 prose-blockquote:border-l-4 prose-blockquote:border-primary/50 prose-blockquote:bg-muted/40 prose-blockquote:py-1 prose-blockquote:pl-5 prose-blockquote:pr-3 prose-blockquote:italic
            dark:prose-blockquote:border-primary/40 dark:prose-blockquote:bg-muted/25"
              dangerouslySetInnerHTML={{ __html: blog.content }}
            /> */}
            <article dir={articleDir} className={articleTypography}>
              <HtmlTextRenderer preserveFormatting={false} content={blog.content} />
            </article>
          </div>

          <BlogPostArticleEnd
            authorName={blog.author.name}
            updatedAt={blog.updatedAt}
            tags={blog.tags}
            categoryName={blog.category.name}
            variant="embedded"
          />
          <div className="px-6 pb-8 sm:px-8 md:px-10">
            <BlogHubLinks />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Page;
