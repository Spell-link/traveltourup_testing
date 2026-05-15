"use client";

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/admin_ui/ui/card";
import { Badge } from "@/components/admin_ui/ui/badge";
import { Progress } from "@/components/admin_ui/ui/progress";
import { AlertCircle, TrendingUp } from "lucide-react";
import { analyzeKeywordDensity, getDensityStatusColor, getDensityStatusVariant } from "@/lib/seo/keyword-density";

export type KeywordDensityWidgetProps = {
  content: string;
  title: string;
  excerpt: string;
  focusKeyphrase: string;
};

export function KeywordDensityWidget({
  content,
  title,
  excerpt,
  focusKeyphrase,
}: KeywordDensityWidgetProps) {
  const analysis = useMemo(
    () => analyzeKeywordDensity(content, title, excerpt, focusKeyphrase),
    [content, title, excerpt, focusKeyphrase]
  );

  const densityPercentage = Math.min(100, (analysis.density / 2) * 100); // 2% is max ideal

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Keyword Density
        </CardTitle>
        <CardDescription>
          Analysis of focus keyphrase occurrence in your content
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {!focusKeyphrase ? (
          <div className="flex items-start gap-3 rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-900 dark:bg-orange-950/30">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange-600 dark:text-orange-400" />
            <p className="text-sm text-orange-800 dark:text-orange-200">
              Enter a focus keyphrase to analyze keyword density.
            </p>
          </div>
        ) : (
          <>
            {/* Main metrics */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-lg border border-border p-3">
                <div className="text-2xl font-bold text-foreground">{analysis.keyphraseOccurrences}</div>
                <p className="text-xs text-muted-foreground">Occurrences</p>
              </div>

              <div className="rounded-lg border border-border p-3">
                <div className={`text-2xl font-bold ${getDensityStatusColor(analysis.status)}`}>
                  {analysis.density.toFixed(2)}%
                </div>
                <p className="text-xs text-muted-foreground">Density</p>
              </div>

              <div className="rounded-lg border border-border p-3">
                <div className="text-2xl font-bold text-foreground">{analysis.totalWords}</div>
                <p className="text-xs text-muted-foreground">Total Words</p>
              </div>

              <div className="rounded-lg border border-border p-3">
                <Badge variant={getDensityStatusVariant(analysis.status)} className="w-full justify-center">
                  {analysis.status.charAt(0).toUpperCase() + analysis.status.slice(1)}
                </Badge>
              </div>
            </div>

            {/* Density bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Density Range</span>
                <span className="text-xs text-muted-foreground">Ideal: 1-2%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full transition-all ${
                    analysis.status === "good"
                      ? "bg-green-500 dark:bg-green-600"
                      : analysis.status === "low"
                        ? "bg-orange-500 dark:bg-orange-600"
                        : "bg-red-500 dark:bg-red-600"
                  }`}
                  style={{ width: `${densityPercentage}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0%</span>
                <span>1-2%</span>
                <span>5%+</span>
              </div>
            </div>

            {/* Recommendation */}
            <div className="rounded-lg border border-border bg-muted/50 p-3">
              <p className="text-sm text-foreground">{analysis.recommendation}</p>
            </div>

            {/* Keyphrase display */}
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">Focus Keyphrase</p>
              <Badge variant="outline" className="font-mono text-xs">
                "{analysis.keyphrase}"
              </Badge>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
