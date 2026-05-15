import { describe, expect, it } from "vitest";
import { createBlogPostSchema, updateBlogPostSchema } from "@/lib/validations/blog.schema";

const baseImage = {
  url: "https://example.com/cover.jpg",
  is_featured: true,
};

const baseTranslation = {
  title: "Sample post",
  slug: "sample-post",
  content: "<p>Body</p>",
  excerpt: "Short excerpt",
  meta_title: null,
  meta_description: null,
  focus_keyphrase: null,
  canonical_url: null,
  image_alts: {},
};

describe("createBlogPostSchema translations", () => {
  it("accepts only locales present in the payload", () => {
    const parsed = createBlogPostSchema.safeParse({
      translations: {
        en: baseTranslation,
        fr: {
          ...baseTranslation,
          title: "Article",
          slug: "article",
          meta_description: "a".repeat(160),
        },
      },
      images: [baseImage],
      category_id: "cat_1",
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects SEO fields longer than the configured limits", () => {
    const parsed = createBlogPostSchema.safeParse({
      translations: {
        en: {
          ...baseTranslation,
          meta_description: "a".repeat(161),
        },
      },
      images: [baseImage],
      category_id: "cat_1",
    });

    expect(parsed.success).toBe(false);
  });
});

describe("updateBlogPostSchema translations", () => {
  it("accepts partial translation maps on PATCH", () => {
    const parsed = updateBlogPostSchema.safeParse({
      translations: {
        en: baseTranslation,
        fr: {
          ...baseTranslation,
          title: "Article",
          slug: "article",
        },
      },
    });

    expect(parsed.success).toBe(true);
  });
});
