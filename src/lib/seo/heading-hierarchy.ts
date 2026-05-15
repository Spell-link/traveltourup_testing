/**
 * Heading hierarchy validator for SEO optimization.
 * Validates H1-H6 structure and reports issues.
 */

export type HeadingIssue = {
  level: number;
  text: string;
  index: number;
  issue: "missing_h1" | "multiple_h1" | "skipped_level" | "improper_order";
};

export type HeadingHierarchyAnalysis = {
  headings: Array<{ level: number; text: string; index: number }>;
  h1Count: number;
  h2Count: number;
  h3Count: number;
  h4Count: number;
  h5Count: number;
  h6Count: number;
  totalHeadings: number;
  issues: HeadingIssue[];
  isValid: boolean;
  recommendations: string[];
};

/**
 * Extract all headings (h1-h6) from HTML content
 */
function extractHeadings(html: string): Array<{ level: number; text: string; index: number }> {
  const headings: Array<{ level: number; text: string; index: number }> = [];

  // Match all heading tags
  const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h\1>/gi;
  let match;
  let index = 0;

  while ((match = headingRegex.exec(html)) !== null) {
    const level = parseInt(match[1], 10);
    let text = match[2];

    // Remove nested tags and decode entities
    text = text
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();

    if (text.length > 0) {
      headings.push({ level, text, index });
      index++;
    }
  }

  return headings;
}

/**
 * Validate heading hierarchy structure
 */
function validateHeadings(headings: Array<{ level: number; text: string; index: number }>): HeadingIssue[] {
  const issues: HeadingIssue[] = [];

  if (headings.length === 0) {
    return issues;
  }

  // Check for H1
  const h1Count = headings.filter((h) => h.level === 1).length;
  if (h1Count === 0) {
    issues.push({
      level: 1,
      text: "",
      index: 0,
      issue: "missing_h1",
    });
  } else if (h1Count > 1) {
    headings.forEach((h, i) => {
      if (h.level === 1 && i > 0) {
        issues.push({
          ...h,
          issue: "multiple_h1",
        });
      }
    });
  }

  // Check for skipped levels and improper order
  let previousLevel = 0;
  let lowestLevelSoFar = Infinity;

  headings.forEach((h) => {
    const { level, text, index } = h;

    // Check if we're skipping levels (e.g., H1 to H3)
    if (previousLevel > 0 && level > previousLevel + 1) {
      // Only report if we haven't seen this level before
      if (level < lowestLevelSoFar) {
        issues.push({
          level,
          text,
          index,
          issue: "skipped_level",
        });
      }
    }

    lowestLevelSoFar = Math.min(lowestLevelSoFar, level);
    previousLevel = level;
  });

  // H1 should be first (if it exists)
  const firstH1 = headings.findIndex((h) => h.level === 1);
  if (firstH1 > 0) {
    headings.slice(0, firstH1).forEach((h) => {
      issues.push({
        ...h,
        issue: "improper_order",
      });
    });
  }

  return issues;
}

/**
 * Analyze heading hierarchy in HTML content
 */
export function analyzeHeadingHierarchy(htmlContent: string): HeadingHierarchyAnalysis {
  const headings = extractHeadings(htmlContent);
  const issues = validateHeadings(headings);

  // Count by level
  const counts = {
    h1: 0,
    h2: 0,
    h3: 0,
    h4: 0,
    h5: 0,
    h6: 0,
  };

  headings.forEach((h) => {
    counts[`h${h.level}` as keyof typeof counts]++;
  });

  // Generate recommendations
  const recommendations: string[] = [];

  if (counts.h1 === 0) {
    recommendations.push("Add an H1 heading at the beginning to define the page's main topic.");
  }
  if (counts.h1 > 1) {
    recommendations.push("Use only one H1 per page. The first H1 should be your main title.");
  }
  if (issues.some((i) => i.issue === "skipped_level")) {
    recommendations.push("Maintain proper heading hierarchy (don't skip levels like H1 → H3).");
  }
  if (issues.some((i) => i.issue === "improper_order")) {
    recommendations.push("Place H1 before other headings for better content structure.");
  }
  if (counts.h2 === 0 && counts.h1 > 0) {
    recommendations.push("Add H2 subheadings to break up content and improve readability.");
  }

  const isValid = issues.length === 0;

  if (isValid && headings.length > 0) {
    recommendations.push("Excellent heading structure! Your content is well-organized for SEO.");
  } else if (isValid && headings.length === 0) {
    recommendations.push("No headings found. Add headings to structure your content.");
  }

  return {
    headings,
    h1Count: counts.h1,
    h2Count: counts.h2,
    h3Count: counts.h3,
    h4Count: counts.h4,
    h5Count: counts.h5,
    h6Count: counts.h6,
    totalHeadings: headings.length,
    issues,
    isValid,
    recommendations,
  };
}

/**
 * Get issue severity for UI display
 */
export function getIssueSeverity(issue: HeadingIssue["issue"]): "critical" | "warning" | "info" {
  switch (issue) {
    case "missing_h1":
    case "multiple_h1":
      return "critical";
    case "improper_order":
    case "skipped_level":
      return "warning";
    default:
      return "info";
  }
}

/**
 * Get human-readable issue description
 */
export function getIssueDescription(issue: HeadingIssue): string {
  switch (issue.issue) {
    case "missing_h1":
      return "Missing H1 heading. Every page should have exactly one H1 heading.";
    case "multiple_h1":
      return `H1 found at level ${issue.level}. Remove extra H1 headings - use only one per page.`;
    case "skipped_level":
      return `H${issue.level} heading should be preceded by H${issue.level - 1}. Maintain proper hierarchy.`;
    case "improper_order":
      return `Heading appears before H1. Move H1 to the beginning of your content.`;
    default:
      return "Heading structure issue detected.";
  }
}

/**
 * Generate outline from headings
 */
export function generateOutline(headings: Array<{ level: number; text: string; index: number }>): string[] {
  return headings.map((h) => {
    const indent = "  ".repeat(h.level - 1);
    return `${indent}H${h.level}: ${h.text}`;
  });
}
