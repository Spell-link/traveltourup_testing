-- Blog multilingual: category/post translation tables, backfill English, trim base tables.

CREATE TABLE "blog_category_translations" (
    "id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "locale" VARCHAR(8) NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_category_translations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "blog_post_translations" (
    "id" TEXT NOT NULL,
    "blog_post_id" TEXT NOT NULL,
    "locale" VARCHAR(8) NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "meta_title" TEXT,
    "meta_description" TEXT,
    "focus_keyphrase" TEXT,
    "canonical_url" TEXT,
    "image_alts" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_post_translations_pkey" PRIMARY KEY ("id")
);

INSERT INTO "blog_category_translations" ("id", "category_id", "locale", "name", "created_at", "updated_at")
SELECT
    md5(random()::text || clock_timestamp()::text || bc.id),
    bc.id,
    'en',
    bc.name,
    bc.created_at,
    bc.updated_at
FROM "blog_categories" bc;

INSERT INTO "blog_post_translations" (
    "id",
    "blog_post_id",
    "locale",
    "title",
    "slug",
    "content",
    "excerpt",
    "meta_title",
    "meta_description",
    "focus_keyphrase",
    "canonical_url",
    "image_alts",
    "created_at",
    "updated_at"
)
SELECT
    md5(random()::text || clock_timestamp()::text || bp.id),
    bp.id,
    'en',
    bp.title,
    bp.slug,
    bp.content,
    bp.excerpt,
    bp.meta_title,
    bp.meta_description,
    bp.focus_keyphrase,
    bp.canonical_url,
    COALESCE(
        (
            SELECT jsonb_object_agg(bpi.id, to_jsonb(bpi.alt))
            FROM "blog_post_images" bpi
            WHERE bpi.blog_post_id = bp.id
        ),
        '{}'::jsonb
    ),
    bp.created_at,
    bp.updated_at
FROM "blog_posts" bp;

CREATE UNIQUE INDEX "blog_category_translations_category_id_locale_key"
    ON "blog_category_translations"("category_id", "locale");

CREATE INDEX "blog_category_translations_locale_idx"
    ON "blog_category_translations"("locale");

CREATE UNIQUE INDEX "blog_post_translations_blog_post_id_locale_key"
    ON "blog_post_translations"("blog_post_id", "locale");

CREATE UNIQUE INDEX "blog_post_translations_locale_slug_key"
    ON "blog_post_translations"("locale", "slug");

CREATE INDEX "blog_post_translations_locale_idx"
    ON "blog_post_translations"("locale");

ALTER TABLE "blog_category_translations"
    ADD CONSTRAINT "blog_category_translations_category_id_fkey"
    FOREIGN KEY ("category_id") REFERENCES "blog_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "blog_post_translations"
    ADD CONSTRAINT "blog_post_translations_blog_post_id_fkey"
    FOREIGN KEY ("blog_post_id") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DROP INDEX IF EXISTS "blog_posts_focus_keyphrase_idx";
DROP INDEX IF EXISTS "blog_posts_slug_key";

ALTER TABLE "blog_categories" DROP COLUMN "name";

ALTER TABLE "blog_posts"
    DROP COLUMN "title",
    DROP COLUMN "slug",
    DROP COLUMN "content",
    DROP COLUMN "excerpt",
    DROP COLUMN "meta_title",
    DROP COLUMN "meta_description",
    DROP COLUMN "focus_keyphrase",
    DROP COLUMN "canonical_url";

ALTER TABLE "blog_post_images" DROP COLUMN "alt";
