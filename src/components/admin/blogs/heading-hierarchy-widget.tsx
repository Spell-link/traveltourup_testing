"use client";

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/admin_ui/ui/card";
import { Badge } from "@/components/admin_ui/ui/badge";
import { Alert, AlertDescription } from "@/components/admin_ui/ui/alert";
import { Heading2, AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import { analyzeHeadingHierarchy, getIssueSeverity, getIssueDescription } from "@/lib/seo/heading-hierarchy";

export type HeadingHierarchyWidgetProps = {
  content: string;
};

export function HeadingHierarchyWidget({ content }: HeadingHierarchyWidgetProps) {
  const analysis = useMemo(() => analyzeHeadingHierarchy(content), [content]);

  const hasCriticalIssues = analysis.issues.some((i) => getIssueSeverity(i.issue) === "critical");
  const hasWarnings = analysis.issues.some((i) => getIssueSeverity(i.issue) === "warning");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heading2 className="h-5 w-5" />
          Heading Hierarchy
        </CardTitle>
        <CardDescription>
          Validates H1-H6 structure for proper content organization
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status overview */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-border p-3 text-center">
            <div className="text-2xl font-bold text-foreground">{analysis.totalHeadings}</div>
            <p className="text-xs text-muted-foreground">Headings</p>
          </div>

          <div className="rounded-lg border border-border p-3 text-center">
            <div className="text-2xl font-bold text-foreground">{analysis.h1Count}</div>
            <p className="text-xs text-muted-foreground">H1 Tags</p>
          </div>

          <div className="rounded-lg border border-border p-3 text-center">
            <Badge
              variant={analysis.isValid ? "default" : "destructive"}
              className="w-full justify-center"
            >
              {analysis.isValid ? "Valid" : "Issues Found"}
            </Badge>
          </div>
        </div>

        {/* Issues section */}
        {analysis.issues.length > 0 ? (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground">Issues</h4>
            <div className="space-y-2">
              {analysis.issues.map((issue, i) => {
                const severity = getIssueSeverity(issue.issue);
                const Icon =
                  severity === "critical" ? AlertCircle : severity === "warning" ? AlertTriangle : AlertCircle;
                const color =
                  severity === "critical"
                    ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
                    : severity === "warning"
                      ? "border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/30"
                      : "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30";
                const textColor =
                  severity === "critical"
                    ? "text-red-800 dark:text-red-200"
                    : severity === "warning"
                      ? "text-yellow-800 dark:text-yellow-200"
                      : "text-blue-800 dark:text-blue-200";

                return (
                  <Alert key={i} className={`border ${color}`}>
                    <Icon className={`h-4 w-4 ${severity === "critical" ? "text-red-600" : severity === "warning" ? "text-yellow-600" : "text-blue-600"}`} />
                    <AlertDescription className={textColor}>
                      <p className="font-medium text-sm mb-1">{getIssueDescription(issue)}</p>
                      {issue.text && <p className="text-xs opacity-75">"{issue.text}"</p>}
                    </AlertDescription>
                  </Alert>
                );
              })}
            </div>
          </div>
        ) : (
          <Alert className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              Perfect heading structure! Your content is properly organized for SEO.
            </AlertDescription>
          </Alert>
        )}

        {/* Heading outline */}
        {analysis.headings.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground">Content Structure</h4>
            <div className="rounded-lg border border-border bg-muted/50 p-3">
              <div className="space-y-1 font-mono text-xs text-foreground/80">
                {analysis.headings.map((h, i) => (
                  <div key={i} style={{ paddingLeft: `${(h.level - 1) * 12}px` }} className="truncate">
                    <span className="font-semibold text-muted-foreground">H{h.level}</span>
                    <span className="ml-2">{h.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Recommendations */}
        {analysis.recommendations.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground">Recommendations</h4>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/30">
              <ul className="space-y-1">
                {analysis.recommendations.map((rec, i) => (
                  <li key={i} className="flex gap-2 text-sm text-blue-800 dark:text-blue-200">
                    <span className="mt-1 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-600 dark:bg-blue-400" />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Heading counts */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div>
            <p className="font-semibold text-foreground">{analysis.h2Count}</p>
            <p className="text-muted-foreground">H2</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">{analysis.h3Count}</p>
            <p className="text-muted-foreground">H3</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">{analysis.h4Count + analysis.h5Count + analysis.h6Count}</p>
            <p className="text-muted-foreground">H4-H6</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
