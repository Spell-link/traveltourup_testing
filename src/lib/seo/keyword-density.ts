/**
 * Keyword density analyzer for SEO optimization.
 * Analyzes keyphrase occurrence and provides recommendations.
 */

export type KeywordDensityResult = {
  keyphrase: string;
  totalWords: number;
  keyphraseOccurrences: number;
  density: number; // percentage (0-100)
  status: "low" | "good" | "high";
  recommendation: string;
};

/**
 * Extract plain text from HTML content
 */
function stripHtmlTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normalize text for keyword matching (lowercase, trim punctuation)
 */
function normalizeText(text: string): string {
  return text.toLowerCase().trim();
}

/**
 * Count occurrences of a keyphrase in text (case-insensitive, word-boundary aware)
 */
function countKeyphraseOccurrences(text: string, keyphrase: string): number {
  if (!keyphrase.trim()) return 0;

  const normalized = normalizeText(text);
  const normalizedPhrase = normalizeText(keyphrase);

  if (!normalizedPhrase) return 0;

  // Word boundary regex to match whole phrases only
  const regex = new RegExp(`\\b${normalizedPhrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
  const matches = normalized.match(regex);
  return matches ? matches.length : 0;
}

/**
 * Calculate total word count from text
 */
function countWords(text: string): number {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  return words.length;
}

/**
 * Analyze keyword density in content
 * Ideal density: 1-2% of content
 */
export function analyzeKeywordDensity(
  content: string,
  title: string,
  metaDescription: string,
  keyphrase: string
): KeywordDensityResult {
  if (!keyphrase.trim()) {
    return {
      keyphrase: "",
      totalWords: 0,
      keyphraseOccurrences: 0,
      density: 0,
      status: "low",
      recommendation: "Enter a focus keyphrase to analyze keyword density.",
    };
  }

  // Extract plain text from HTML
  const plainText = stripHtmlTags(content);

  // Combine all content for keyword analysis
  const fullText = `${title} ${metaDescription} ${plainText}`;

  // Count words (excluding the title to avoid skewing short posts)
  const contentWords = countWords(plainText);
  const totalWords = contentWords;

  if (totalWords === 0) {
    return {
      keyphrase,
      totalWords: 0,
      keyphraseOccurrences: 0,
      density: 0,
      status: "low",
      recommendation: "Add content to analyze keyword density.",
    };
  }

  // Count occurrences
  const keyphraseOccurrences = countKeyphraseOccurrences(fullText, keyphrase);
  const density = (keyphraseOccurrences / totalWords) * 100;

  // Determine status and recommendation
  let status: "low" | "good" | "high";
  let recommendation: string;

  if (density === 0) {
    status = "low";
    recommendation = `Focus keyphrase not found in content. Add "${keyphrase}" at least once to improve SEO.`;
  } else if (density < 0.5) {
    status = "low";
    recommendation = `Keyword density is ${density.toFixed(2)}%. Aim for 1-2% by using "${keyphrase}" more naturally in your content.`;
  } else if (density >= 0.5 && density <= 2.5) {
    status = "good";
    recommendation = `Excellent keyword density (${density.toFixed(2)}%). Your focus keyphrase is well-optimized.`;
  } else {
    status = "high";
    recommendation = `Keyword density is ${density.toFixed(2)}%, which may be too high. Reduce usage of "${keyphrase}" to avoid keyword stuffing.`;
  }

  return {
    keyphrase,
    totalWords,
    keyphraseOccurrences,
    density,
    status,
    recommendation,
  };
}

/**
 * Extract the most frequent meaningful phrases (2-3 words) from content
 */
export function extractKeyPhrases(content: string, limit: number = 10): Array<{ phrase: string; count: number }> {
  const plainText = stripHtmlTags(content).toLowerCase();
  const words = plainText.split(/\s+/).filter((w) => w.length > 2);

  if (words.length < 3) return [];

  // Extract 2-3 word phrases
  const phraseMap = new Map<string, number>();

  for (let i = 0; i < words.length - 1; i++) {
    // 2-word phrases
    const bigram = `${words[i]} ${words[i + 1]}`;
    phraseMap.set(bigram, (phraseMap.get(bigram) || 0) + 1);

    // 3-word phrases
    if (i < words.length - 2) {
      const trigram = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
      phraseMap.set(trigram, (phraseMap.get(trigram) || 0) + 1);
    }
  }

  // Sort by frequency and return top N
  return Array.from(phraseMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([phrase, count]) => ({ phrase, count }));
}

/**
 * Get density status color for UI display
 */
export function getDensityStatusColor(status: "low" | "good" | "high"): string {
  switch (status) {
    case "good":
      return "text-green-600 dark:text-green-400";
    case "low":
      return "text-orange-600 dark:text-orange-400";
    case "high":
      return "text-red-600 dark:text-red-400";
    default:
      return "text-muted-foreground";
  }
}

/**
 * Get density status badge variant for UI
 */
export function getDensityStatusVariant(status: "low" | "good" | "high"): "default" | "destructive" | "outline" | "secondary" {
  switch (status) {
    case "good":
      return "default";
    case "low":
      return "secondary";
    case "high":
      return "destructive";
    default:
      return "outline";
  }
}
