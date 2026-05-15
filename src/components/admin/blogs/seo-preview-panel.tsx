"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/admin_ui/ui/tabs";
import { Badge } from "@/components/admin_ui/ui/badge";
import { Monitor, Smartphone } from "lucide-react";

export type SeoPreviewPanelProps = {
  title: string;
  metaTitle: string;
  slug: string;
  metaDescription: string;
  focusKeyphrase: string;
};

const SEO_TITLE_OPTIMAL = 60;
const SEO_DESCRIPTION_OPTIMAL = 160;

/**
 * Highlight keyphrase in text (if present)
 */
function highlightKeyphrase(text: string, keyphrase: string): React.ReactNode {
  if (!keyphrase.trim()) return text;

  const regex = new RegExp(`(${keyphrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);

  return parts.map((part, i) =>
    regex.test(part) ? (
      <span key={i} className="font-semibold text-green-600 dark:text-green-400">
        {part}
      </span>
    ) : (
      part
    )
  );
}

/**
 * Truncate text to specified length
 */
function truncateText(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.substring(0, length - 3) + "...";
}

/**
 * Get character count status
 */
function getCharCountStatus(current: number, optimal: number): "good" | "warning" | "error" {
  const tolerance = Math.round(optimal * 0.2);
  if (current === 0) return "warning";
  if (Math.abs(current - optimal) <= tolerance) return "good";
  return "error";
}

export function SeoPreviewPanel({
  title,
  metaTitle,
  slug,
  metaDescription,
  focusKeyphrase,
}: SeoPreviewPanelProps) {
  const [activeTab, setActiveTab] = useState<"desktop" | "mobile">("desktop");

  const displayTitle = metaTitle.trim() || title;
  const displayDescription = metaDescription.trim() || "";

  const titleStatus = getCharCountStatus(displayTitle.length, SEO_TITLE_OPTIMAL);
  const descriptionStatus = getCharCountStatus(displayDescription.length, SEO_DESCRIPTION_OPTIMAL);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="font-semibold text-foreground">SERP Preview</h3>
        <p className="text-xs text-muted-foreground">
          How your post will appear in Google search results
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "desktop" | "mobile")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="desktop" className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            <span className="hidden sm:inline">Desktop</span>
          </TabsTrigger>
          <TabsTrigger value="mobile" className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            <span className="hidden sm:inline">Mobile</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="desktop" className="space-y-4 pt-4">
          <div className="space-y-2 rounded-lg border border-border bg-muted/50 p-4">
            {/* Google-like SERP result */}
            <div className="space-y-1">
              {/* URL/Breadcrumb */}
              <div className="text-xs text-teal-600 dark:text-teal-400">
                traveltourup.com › blog › {slug || "your-post-slug"}
              </div>

              {/* Title */}
              <h4
                className="text-base font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                title={displayTitle}
              >
                {highlightKeyphrase(truncateText(displayTitle, 60), focusKeyphrase)}
              </h4>

              {/* Meta Description */}
              <p className="text-sm text-foreground/80">
                {displayDescription
                  ? highlightKeyphrase(truncateText(displayDescription, 160), focusKeyphrase)
                  : "No meta description provided. Add one to improve click-through rates."}
              </p>
            </div>
          </div>

          {/* Character counts */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Title</span>
                <span
                  className={`text-xs font-semibold ${
                    titleStatus === "good"
                      ? "text-green-600 dark:text-green-400"
                      : titleStatus === "warning"
                        ? "text-orange-600 dark:text-orange-400"
                        : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {displayTitle.length}/{SEO_TITLE_OPTIMAL}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full transition-all ${
                    titleStatus === "good"
                      ? "bg-green-500 dark:bg-green-600"
                      : titleStatus === "warning"
                        ? "bg-orange-500 dark:bg-orange-600"
                        : "bg-red-500 dark:bg-red-600"
                  }`}
                  style={{ width: `${Math.min(100, (displayTitle.length / SEO_TITLE_OPTIMAL) * 100)}%` }}
                />
              </div>
            </div>

            <div className="space-y-1 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Description</span>
                <span
                  className={`text-xs font-semibold ${
                    descriptionStatus === "good"
                      ? "text-green-600 dark:text-green-400"
                      : descriptionStatus === "warning"
                        ? "text-orange-600 dark:text-orange-400"
                        : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {displayDescription.length}/{SEO_DESCRIPTION_OPTIMAL}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full transition-all ${
                    descriptionStatus === "good"
                      ? "bg-green-500 dark:bg-green-600"
                      : descriptionStatus === "warning"
                        ? "bg-orange-500 dark:bg-orange-600"
                        : "bg-red-500 dark:bg-red-600"
                  }`}
                  style={{ width: `${Math.min(100, (displayDescription.length / SEO_DESCRIPTION_OPTIMAL) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Tips */}
          {/* <div className="space-y-2 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/30">
            <p className="text-xs font-medium text-blue-900 dark:text-blue-100">Tips:</p>
            <ul className="space-y-1 text-xs text-blue-800 dark:text-blue-200">
              {!metaTitle && <li>• Add a custom SEO title (60 chars max)</li>}
              {!metaDescription && <li>• Write a meta description (155-160 chars)</li>}
              {focusKeyphrase && displayTitle.toLowerCase().includes(focusKeyphrase.toLowerCase()) && (
                <li className="text-green-700 dark:text-green-300">✓ Focus keyphrase found in title</li>
              )}
            </ul>
          </div> */}
        </TabsContent>

        <TabsContent value="mobile" className="space-y-4 pt-4">
          <div className="mx-auto max-w-xs space-y-2 rounded-lg border border-border bg-muted/50 p-3">
            {/* Mobile SERP result */}
            <div className="space-y-1">
              {/* URL/Breadcrumb */}
              <div className="text-xs text-teal-600 dark:text-teal-400">
                traveltourup.com
              </div>

              {/* Title */}
              <h4 className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                {highlightKeyphrase(truncateText(displayTitle, 55), focusKeyphrase)}
              </h4>

              {/* Meta Description */}
              <p className="text-xs text-foreground/80 line-clamp-2">
                {displayDescription
                  ? highlightKeyphrase(truncateText(displayDescription, 140), focusKeyphrase)
                  : "No meta description provided."}
              </p>
            </div>
          </div>

          <div className="space-y-1 rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-900 dark:bg-yellow-950/30">
            <p className="text-xs font-medium text-yellow-900 dark:text-yellow-100">Mobile Note:</p>
            <p className="text-xs text-yellow-800 dark:text-yellow-200">
              Mobile displays truncate text more aggressively. Keep titles under 55 characters and descriptions under 140 characters for optimal display.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
