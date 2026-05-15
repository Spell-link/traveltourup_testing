-- Add SEO fields to blog_posts table
ALTER TABLE "blog_posts"
ADD COLUMN "focus_keyphrase" TEXT,
ADD COLUMN "canonical_url" TEXT,
ADD COLUMN "robots_meta" VARCHAR(255) DEFAULT 'index,follow';

-- Create indexes for SEO fields
CREATE INDEX "blog_posts_focus_keyphrase_idx" ON "blog_posts"("focus_keyphrase");
CREATE INDEX "blog_posts_robots_meta_idx" ON "blog_posts"("robots_meta");
