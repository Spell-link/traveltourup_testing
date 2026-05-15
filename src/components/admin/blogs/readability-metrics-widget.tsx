"use client";

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/admin_ui/ui/card";
import { Badge } from "@/components/admin_ui/ui/badge";
import { Progress } from "@/components/admin_ui/ui/progress";
import { BookOpen, BarChart3 } from "lucide-react";
import {
  analyzeReadability,
  analyzeExcerptLength,
  getReadabilityStatusColor,
  getReadabilityStatusVariant,
  getExcerptStatusColor,
} from "@/lib/seo/readability-metrics";

export type ReadabilityMetricsWidgetProps = {
  content: string;
  excerpt: string;
};

export function ReadabilityMetricsWidget({ content, excerpt }: ReadabilityMetricsWidgetProps) {
  const readability = useMemo(() => analyzeReadability(content), [content]);
  const excerptAnalysis = useMemo(() => analyzeExcerptLength(excerpt), [excerpt]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Readability Metrics
        </CardTitle>
        <CardDescription>
          Content analysis for clarity and accessibility
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Main readability metrics grid */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-border p-3">
            <div className="text-2xl font-bold text-foreground">{readability.wordCount}</div>
            <p className="text-xs text-muted-foreground">Words</p>
          </div>

          <div className="rounded-lg border border-border p-3">
            <div className="text-2xl font-bold text-foreground">{readability.readingTime}</div>
            <p className="text-xs text-muted-foreground">Min Read</p>
          </div>

          <div className={`rounded-lg border border-border p-3`}>
            <div className={`text-2xl font-bold ${getReadabilityStatusColor(readability.status)}`}>
              {readability.fleschKincaidGrade.toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground">Grade Level</p>
          </div>

          <div className="rounded-lg border border-border p-3">
            <Badge variant={getReadabilityStatusVariant(readability.status)} className="w-full justify-center">
              {readability.status.charAt(0).toUpperCase() + readability.status.slice(1)}
            </Badge>
          </div>
        </div>

        {/* Flesch Reading Ease score */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Flesch Reading Ease</span>
            <span className="font-mono text-sm font-semibold">{readability.fleschReadingEase}</span>
          </div>
          <Progress value={readability.fleschReadingEase} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0 (Hard)</span>
            <span>50</span>
            <span>100 (Easy)</span>
          </div>
        </div>

        {/* Detailed metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">Sentences</p>
            <p className="text-lg font-semibold text-foreground">{readability.sentenceCount}</p>
            <p className="text-xs text-muted-foreground">{readability.averageWordsPerSentence.toFixed(1)} words/avg</p>
          </div>

          <div className="rounded-lg border border-border p-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">Paragraphs</p>
            <p className="text-lg font-semibold text-foreground">{readability.paragraphCount}</p>
            <p className="text-xs text-muted-foreground">{readability.averageParagraphLength.toFixed(0)} words/avg</p>
          </div>

          <div className="rounded-lg border border-border p-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">Syllables/Word</p>
            <p className="text-lg font-semibold text-foreground">{readability.averageSyllablesPerWord.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">{readability.averageSyllablesPerWord < 1.5 ? "Simple" : "Complex"} words</p>
          </div>

          <div className="rounded-lg border border-border p-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">Excerpt Length</p>
            <p className="text-lg font-semibold text-foreground">{excerptAnalysis.length}</p>
            <p className={`text-xs font-medium ${getExcerptStatusColor(excerptAnalysis.status)}`}>
              {excerptAnalysis.status === "good" ? "Optimal" : excerptAnalysis.status === "short" ? "Too Short" : "Too Long"}
            </p>
          </div>
        </div>

        {/* Recommendations */}
        <div className="space-y-3">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/30">
            <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-2">Readability Tips:</p>
            <p className="text-sm text-blue-800 dark:text-blue-200">{readability.recommendation}</p>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
            <p className="text-xs font-semibold text-amber-900 dark:text-amber-100 mb-2">Excerpt:</p>
            <p className="text-sm text-amber-800 dark:text-amber-200">{excerptAnalysis.recommendation}</p>
          </div>
        </div>

        {/* Tips for improvement */}
        {(readability.averageWordsPerSentence > 20 || readability.averageSyllablesPerWord > 1.5) && (
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-900 dark:bg-orange-950/30">
            <p className="text-xs font-semibold text-orange-900 dark:text-orange-100 mb-2">Improvement Ideas:</p>
            <ul className="space-y-1 text-sm text-orange-800 dark:text-orange-200">
              {readability.averageWordsPerSentence > 20 && <li>• Break long sentences into shorter ones</li>}
              {readability.averageSyllablesPerWord > 1.5 && <li>• Replace complex words with simpler alternatives</li>}
              {readability.averageParagraphLength > 150 && <li>• Add more paragraph breaks for readability</li>}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
