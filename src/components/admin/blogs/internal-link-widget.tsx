"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/admin_ui/ui/card";
import { Badge } from "@/components/admin_ui/ui/badge";
import { Progress } from "@/components/admin_ui/ui/progress";
import { Alert, AlertDescription } from "@/components/admin_ui/ui/alert";
import { Link2, Loader2, AlertCircle, Info, ExternalLink } from "lucide-react";
import { Button } from "@/components/admin_ui/ui/button";
import type { LinkSuggestion } from "@/lib/seo/internal-link-suggestor";

export type InternalLinkWidgetProps = {
  currentPostId: string;
  focusKeyphrase: string;
  tags: string[];
  currentSlug: string;
};

export function InternalLinkWidget({
  currentPostId,
  focusKeyphrase,
  tags,
  currentSlug,
}: InternalLinkWidgetProps) {
  const [suggestions, setSuggestions] = useState<LinkSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch suggestions when props change
  useEffect(() => {
    if (!currentPostId) return;

    const fetchSuggestions = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/v1/blogs/suggestions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currentPostId,
            focusKeyphrase,
            tags,
            limit: 5,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch suggestions");
        }

        const data = await response.json();
        setSuggestions(data.suggestions || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [currentPostId, focusKeyphrase, tags]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          Internal Linking
        </CardTitle>
        <CardDescription>
          Suggestions for linking to related posts
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {!focusKeyphrase && !tags.length ? (
          <Alert className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-800 dark:text-blue-200">
              Add a focus keyphrase or tags to see internal linking suggestions.
            </AlertDescription>
          </Alert>
        ) : loading ? (
          <div className="flex items-center justify-center gap-2 py-8">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Analyzing related posts...</span>
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : suggestions.length === 0 ? (
          <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              No related posts found. Write more posts to unlock link suggestions.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="space-y-3">
              {suggestions.map((suggestion, i) => (
                <div key={i} className="rounded-lg border border-border p-3 space-y-2">
                  {/* Title and category */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-medium text-foreground line-clamp-2">
                        {suggestion.title}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        /{suggestion.slug}
                      </p>
                    </div>
                    <Badge variant="outline" className="flex-shrink-0 text-xs">
                      {suggestion.category}
                    </Badge>
                  </div>

                  {/* Relevance score */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Relevance</span>
                      <span className={`text-xs font-semibold ${
                        suggestion.relevanceScore >= 80
                          ? "text-green-600 dark:text-green-400"
                          : suggestion.relevanceScore >= 60
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-orange-600 dark:text-orange-400"
                      }`}>
                        {suggestion.relevanceScore}%
                      </span>
                    </div>
                    <Progress value={suggestion.relevanceScore} className="h-1.5" />
                  </div>

                  {/* Matched keywords */}
                  {suggestion.matchedKeywords.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {suggestion.matchedKeywords.slice(0, 3).map((keyword) => (
                        <Badge key={keyword} variant="secondary" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                      {suggestion.matchedKeywords.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{suggestion.matchedKeywords.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Link button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 w-full h-8 text-xs"
                    onClick={() => {
                      // Copy link markdown to clipboard
                      const markdown = `[${suggestion.title}](/blog/${suggestion.slug})`;
                      navigator.clipboard.writeText(markdown);
                    }}
                    title="Click to copy markdown link"
                  >
                    <Link2 className="h-3 w-3 mr-1" />
                    Copy Link
                  </Button>
                </div>
              ))}
            </div>

            {/* Tips */}
            <Alert className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-xs text-blue-800 dark:text-blue-200">
                <strong>Tip:</strong> Add 2-3 internal links per post to improve SEO and user engagement. Link to posts with high relevance scores.
              </AlertDescription>
            </Alert>
          </>
        )}
      </CardContent>
    </Card>
  );
}
