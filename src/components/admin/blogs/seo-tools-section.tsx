"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/admin_ui/ui/tabs";
import { SeoPreviewPanel } from "./seo-preview-panel";
import { KeywordDensityWidget } from "./keyword-density-widget";
import { ReadabilityMetricsWidget } from "./readability-metrics-widget";
import { HeadingHierarchyWidget } from "./heading-hierarchy-widget";
import { InternalLinkWidget } from "./internal-link-widget";
import { BarChart3, Search, Link2 } from "lucide-react";

export type SeoToolsSectionProps = {
  title: string;
  metaTitle: string;
  metaDescription: string;
  slug: string;
  content: string;
  excerpt: string;
  focusKeyphrase: string;
  tags: string[];
  postId?: string;
  isSubmitting: boolean;
};

export function SeoToolsSection({
  title,
  metaTitle,
  metaDescription,
  slug,
  content,
  excerpt,
  focusKeyphrase,
  tags,
  postId,
  isSubmitting,
}: SeoToolsSectionProps) {
  const [activeTab, setActiveTab] = useState<"preview" | "analysis" | "links">("preview");

  return (
    <div className="space-y-4 border-t border-border pt-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">SEO Tools</h2>
        <p className="text-sm text-muted-foreground">
          Real-time SEO analysis and optimization recommendations
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "preview" | "analysis" | "links")}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="preview" className="flex items-center gap-2" disabled={isSubmitting}>
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">SERP Preview</span>
            <span className="sm:hidden">Preview</span>
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center gap-2" disabled={isSubmitting}>
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Analysis</span>
          </TabsTrigger>
          <TabsTrigger value="links" className="flex items-center gap-2" disabled={isSubmitting}>
            <Link2 className="h-4 w-4" />
            <span className="hidden sm:inline">Internal Links</span>
            <span className="sm:hidden">Links</span>
          </TabsTrigger>
        </TabsList>

        {/* SERP Preview Tab */}
        <TabsContent value="preview" className="space-y-4 pt-4">
          <SeoPreviewPanel
            title={title}
            metaTitle={metaTitle}
            slug={slug}
            metaDescription={metaDescription}
            focusKeyphrase={focusKeyphrase}
          />
        </TabsContent>

        {/* Analysis Tab (Keyword Density, Readability, Heading Hierarchy) */}
        <TabsContent value="analysis" className="space-y-4 pt-4">
          <div className="space-y-4">
            <KeywordDensityWidget
              content={content}
              title={title}
              excerpt={excerpt}
              focusKeyphrase={focusKeyphrase}
            />

            <ReadabilityMetricsWidget
              content={content}
              excerpt={excerpt}
            />

            <HeadingHierarchyWidget
              content={content}
            />
          </div>
        </TabsContent>

        {/* Internal Links Tab */}
        <TabsContent value="links" className="space-y-4 pt-4">
          {postId ? (
            <InternalLinkWidget
              currentPostId={postId}
              focusKeyphrase={focusKeyphrase}
              tags={tags}
              currentSlug={slug}
            />
          ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Save the post first to see internal linking suggestions. They'll appear after creation.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Quick Tips */}
      {/* <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
        <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
          Quick SEO Checklist
        </h3>
        <ul className="space-y-1 text-xs text-blue-800 dark:text-blue-200">
          <li>✓ Use focus keyphrase in title and description</li>
          <li>✓ Keep meta title under 60 characters</li>
          <li>✓ Keep meta description 155-160 characters</li>
          <li>✓ Start with H1, maintain heading hierarchy</li>
          <li>✓ Link to 2-3 related posts internally</li>
          <li>✓ Aim for 6-9th grade reading level</li>
        </ul>
      </div> */}
    </div>
  );
}
