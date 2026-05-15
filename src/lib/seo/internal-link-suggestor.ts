/**
 * Internal link suggestor for SEO optimization.
 * Suggests related posts and analyzes link density.
 */

import { blogRepository, type BlogPostRow } from "@/lib/db/repositories/blog.repository";

function englishTranslation(post: BlogPostRow) {
  return post.translations.find((translation) => translation.locale === "en") ?? post.translations[0];
}

function englishCategoryName(post: BlogPostRow): string {
  const translation =
    post.category.translations.find((row) => row.locale === "en") ?? post.category.translations[0];
  return translation?.name ?? "Uncategorized";
}

export type LinkSuggestion = {
  postId: string;
  title: string;
  slug: string;
  excerpt: string;
  relevanceScore: number; // 0-100
  matchedKeywords: string[];
  category: string;
};

export type LinkDensityAnalysis = {
  internalLinkCount: number;
  externalLinkCount: number;
  totalLinkCount: number;
  textualLinkDensity: number; // percentage of words in links
  status: "low" | "good" | "high";
  recommendation: string;
};

/**
 * Extract all links from HTML content
 */
function extractLinks(html: string): Array<{ url: string; text: string; isInternal: boolean }> {
  const links: Array<{ url: string; text: string; isInternal: boolean }> = [];

  // Match all anchor tags
  const linkRegex = /<a\s+(?:[^>]*?\s+)?href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi;
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    const url = match[1];
    let text = match[2];

    // Remove nested tags
    text = text.replace(/<[^>]*>/g, "").trim();

    if (text.length > 0) {
      // Determine if internal or external (simple heuristic)
      const isInternal = !url.startsWith("http") || url.includes("traveltourup") || url.includes("localhost");

      links.push({ url, text, isInternal });
    }
  }

  return links;
}

/**
 * Count total words in text (excluding HTML)
 */
function countWords(text: string): number {
  const plainText = text
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return plainText.split(/\s+/).filter((w) => w.length > 0).length;
}

/**
 * Suggest internal links based on tags and keyphrase
 */
export async function suggestInternalLinks(
  currentPostId: string,
  focusKeyphrase: string,
  tags: string[],
  limit: number = 5
): Promise<LinkSuggestion[]> {
  try {
    // Get all published posts (for suggestions)
    const publishedPosts = await blogRepository.findManyPublishedPaginated({
      where: {},
      skip: 0,
      take: 100,
    });

    const suggestions: LinkSuggestion[] = [];

    for (const post of publishedPosts.rows) {
      // Skip current post
      if (post.id === currentPostId) continue;

      const translation = englishTranslation(post);
      if (!translation) continue;

      let relevanceScore = 0;
      const matchedKeywords: string[] = [];

      // Calculate relevance based on tag matches
      const matchedTags = tags.filter((tag) => post.tags?.includes(tag) || false);
      relevanceScore += matchedTags.length * 20;
      matchedKeywords.push(...matchedTags);

      // Calculate relevance based on keyphrase match in title/excerpt
      if (focusKeyphrase && focusKeyphrase.trim()) {
        const normalizedKeyphrase = focusKeyphrase.toLowerCase();
        if (translation.title.toLowerCase().includes(normalizedKeyphrase)) {
          relevanceScore += 30;
          matchedKeywords.push(focusKeyphrase);
        } else if (translation.excerpt.toLowerCase().includes(normalizedKeyphrase)) {
          relevanceScore += 15;
        }
      }

      // Add if relevant
      if (relevanceScore > 0) {
        suggestions.push({
          postId: post.id,
          title: translation.title,
          slug: translation.slug,
          excerpt: translation.excerpt,
          relevanceScore: Math.min(100, relevanceScore),
          matchedKeywords: Array.from(new Set(matchedKeywords)), // Remove duplicates
          category: englishCategoryName(post),
        });
      }
    }

    // Sort by relevance score and return top N
    return suggestions
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);
  } catch (error) {
    console.error("Error suggesting internal links:", error);
    return [];
  }
}

/**
 * Analyze internal vs external link density
 */
export function analyzeInternalLinkDensity(htmlContent: string): LinkDensityAnalysis {
  const links = extractLinks(htmlContent);

  if (links.length === 0) {
    return {
      internalLinkCount: 0,
      externalLinkCount: 0,
      totalLinkCount: 0,
      textualLinkDensity: 0,
      status: "low",
      recommendation: "Add internal links to related blog posts to improve SEO and user experience.",
    };
  }

  const internalLinkCount = links.filter((l) => l.isInternal).length;
  const externalLinkCount = links.filter((l) => !l.isInternal).length;
  const totalLinkCount = links.length;

  // Calculate link density
  const totalWords = countWords(htmlContent);
  const linkText = links.reduce((sum, link) => sum + countWords(link.text), 0);
  const textualLinkDensity = totalWords > 0 ? (linkText / totalWords) * 100 : 0;

  // Determine status and recommendation
  let status: "low" | "good" | "high";
  let recommendation: string;

  if (internalLinkCount === 0) {
    status = "low";
    recommendation =
      "No internal links found. Link to 2-3 related posts to improve SEO and keep readers engaged.";
  } else if (internalLinkCount < 2) {
    status = "low";
    recommendation = `Only ${internalLinkCount} internal link(s). Consider adding more to improve internal link structure.`;
  } else if (internalLinkCount >= 2 && internalLinkCount <= 5) {
    status = "good";
    recommendation = `Good internal linking (${internalLinkCount} links). This helps distribute page authority.`;
  } else {
    status = "high";
    recommendation = `You have ${internalLinkCount} internal links. This is good, but avoid excessive linking.`;
  }

  return {
    internalLinkCount,
    externalLinkCount,
    totalLinkCount,
    textualLinkDensity: Math.round(textualLinkDensity * 100) / 100,
    status,
    recommendation,
  };
}

/**
 * Get link density status color
 */
export function getLinkDensityStatusColor(status: "low" | "good" | "high"): string {
  switch (status) {
    case "good":
      return "text-green-600 dark:text-green-400";
    case "low":
      return "text-orange-600 dark:text-orange-400";
    case "high":
      return "text-blue-600 dark:text-blue-400";
    default:
      return "text-muted-foreground";
  }
}

/**
 * Calculate relevance percentage display
 */
export function getRelevanceDisplay(score: number): string {
  if (score >= 80) return "Very Relevant";
  if (score >= 60) return "Relevant";
  if (score >= 40) return "Somewhat Relevant";
  return "Low Relevance";
}

/**
 * Get relevance color
 */
export function getRelevanceColor(score: number): string {
  if (score >= 80) return "text-green-600 dark:text-green-400";
  if (score >= 60) return "text-blue-600 dark:text-blue-400";
  if (score >= 40) return "text-orange-600 dark:text-orange-400";
  return "text-muted-foreground";
}
