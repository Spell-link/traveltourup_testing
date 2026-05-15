/**
 * Readability metrics analyzer for SEO optimization.
 * Calculates Flesch-Kincaid grade level and other readability metrics.
 */

export type ReadabilityMetrics = {
  wordCount: number;
  sentenceCount: number;
  paragraphCount: number;
  averageWordsPerSentence: number;
  averageParagraphLength: number;
  averageSyllablesPerWord: number;
  fleschKincaidGrade: number; // US grade level (0-18+)
  fleschReadingEase: number; // 0-100 score
  readingTime: number; // minutes
  status: "easy" | "moderate" | "hard";
  recommendation: string;
};

export type ExcerptAnalysis = {
  length: number;
  status: "short" | "good" | "long";
  recommendation: string;
};

/**
 * Strip HTML tags and normalize whitespace
 */
function stripHtml(html: string): string {
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
 * Count syllables in a word (simplified algorithm)
 * More accurate for English words
 */
function countSyllables(word: string): number {
  const cleanWord = word.toLowerCase().replace(/[^a-z]/g, "");
  if (cleanWord.length <= 3) return 1;

  let syllables = 0;
  let previousWasVowel = false;

  const vowels = "aeiou";

  for (let i = 0; i < cleanWord.length; i++) {
    const isVowel = vowels.includes(cleanWord[i]);

    if (isVowel && !previousWasVowel) {
      syllables++;
    }
    previousWasVowel = isVowel;
  }

  // Adjust for silent e
  if (cleanWord.endsWith("e")) {
    syllables--;
  }

  // Adjust for -le endings
  if (cleanWord.endsWith("le") && cleanWord.length > 2 && !vowels.includes(cleanWord[cleanWord.length - 3])) {
    syllables++;
  }

  return Math.max(1, syllables);
}

/**
 * Analyze readability metrics of content
 * Based on Flesch-Kincaid Grade Level formula
 */
export function analyzeReadability(content: string): ReadabilityMetrics {
  const plainText = stripHtml(content);

  if (!plainText.trim()) {
    return {
      wordCount: 0,
      sentenceCount: 0,
      paragraphCount: 0,
      averageWordsPerSentence: 0,
      averageParagraphLength: 0,
      averageSyllablesPerWord: 0,
      fleschKincaidGrade: 0,
      fleschReadingEase: 100,
      readingTime: 1,
      status: "easy",
      recommendation: "Add content to analyze readability.",
    };
  }

  // Count words
  const words = plainText.split(/\s+/).filter((w) => w.length > 0);
  const wordCount = words.length;

  // Count sentences (ends with . ! ?)
  const sentences = plainText.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const sentenceCount = sentences.length || 1;

  // Count paragraphs (double line breaks)
  const paragraphs = plainText.split(/\n\n+/).filter((p) => p.trim().length > 0);
  const paragraphCount = Math.max(1, paragraphs.length);

  // Calculate averages
  const averageWordsPerSentence = wordCount / sentenceCount;
  const averageParagraphLength = wordCount / paragraphCount;

  // Count syllables
  const totalSyllables = words.reduce((sum, word) => sum + countSyllables(word), 0);
  const averageSyllablesPerWord = totalSyllables / wordCount;

  // Flesch-Kincaid Grade Level formula
  // 0.39 * (words/sentences) + 11.8 * (syllables/words) - 15.59
  const fleschKincaidGrade = Math.max(
    0,
    0.39 * averageWordsPerSentence + 11.8 * averageSyllablesPerWord - 15.59
  );

  // Flesch Reading Ease formula (0-100)
  // 206.835 - 1.015 * (words/sentences) - 84.6 * (syllables/words)
  const fleschReadingEase = Math.max(0, Math.min(100, 206.835 - 1.015 * averageWordsPerSentence - 84.6 * averageSyllablesPerWord));

  // Reading time (200 words per minute average)
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  // Determine status based on grade level
  let status: "easy" | "moderate" | "hard";
  let recommendation: string;

  if (fleschKincaidGrade < 6) {
    status = "easy";
    recommendation = `Grade ${fleschKincaidGrade.toFixed(1)} reading level (very easy). Perfect for general audiences. ${getReadabilityTips(averageWordsPerSentence, averageSyllablesPerWord)}`;
  } else if (fleschKincaidGrade < 9) {
    status = "moderate";
    recommendation = `Grade ${fleschKincaidGrade.toFixed(1)} reading level (moderate). Good balance of accessibility and sophistication. ${getReadabilityTips(averageWordsPerSentence, averageSyllablesPerWord)}`;
  } else {
    status = "hard";
    recommendation = `Grade ${fleschKincaidGrade.toFixed(1)} reading level (difficult). Consider simplifying for broader appeal. ${getReadabilityTips(averageWordsPerSentence, averageSyllablesPerWord)}`;
  }

  return {
    wordCount,
    sentenceCount,
    paragraphCount,
    averageWordsPerSentence: Math.round(averageWordsPerSentence * 10) / 10,
    averageParagraphLength: Math.round(averageParagraphLength * 10) / 10,
    averageSyllablesPerWord: Math.round(averageSyllablesPerWord * 100) / 100,
    fleschKincaidGrade: Math.round(fleschKincaidGrade * 10) / 10,
    fleschReadingEase: Math.round(fleschReadingEase),
    readingTime,
    status,
    recommendation,
  };
}

/**
 * Analyze excerpt length for SERP display
 * Optimal: 155-160 characters
 */
export function analyzeExcerptLength(excerpt: string): ExcerptAnalysis {
  const length = excerpt.length;

  let status: "short" | "good" | "long";
  let recommendation: string;

  if (length === 0) {
    status = "short";
    recommendation = "Add an excerpt. Search engines display 155-160 characters.";
  } else if (length < 120) {
    status = "short";
    recommendation = `Excerpt is ${length} characters. Expand to 155-160 characters for optimal SERP display.`;
  } else if (length >= 120 && length <= 160) {
    status = "good";
    recommendation = `Excellent! Excerpt is ${length} characters - perfect for search result preview.`;
  } else {
    status = "long";
    recommendation = `Excerpt is ${length} characters. Trim to 160 characters max to avoid truncation in search results.`;
  }

  return { length, status, recommendation };
}

/**
 * Get specific readability improvement tips
 */
function getReadabilityTips(avgWordsPerSentence: number, avgSyllablesPerWord: number): string {
  const tips: string[] = [];

  if (avgWordsPerSentence > 20) {
    tips.push("Break up long sentences");
  }
  if (avgSyllablesPerWord > 1.5) {
    tips.push("Use simpler words");
  }
  if (avgWordsPerSentence < 8 && avgSyllablesPerWord < 1.2) {
    tips.push("Content is already optimized");
  }

  return tips.length > 0 ? `Tip: ${tips.join(", ")}.` : "";
}

/**
 * Get readability status color for UI
 */
export function getReadabilityStatusColor(status: "easy" | "moderate" | "hard"): string {
  switch (status) {
    case "easy":
      return "text-green-600 dark:text-green-400";
    case "moderate":
      return "text-blue-600 dark:text-blue-400";
    case "hard":
      return "text-orange-600 dark:text-orange-400";
    default:
      return "text-muted-foreground";
  }
}

/**
 * Get readability badge variant
 */
export function getReadabilityStatusVariant(
  status: "easy" | "moderate" | "hard"
): "default" | "destructive" | "outline" | "secondary" {
  switch (status) {
    case "easy":
    case "moderate":
      return "default";
    case "hard":
      return "secondary";
    default:
      return "outline";
  }
}

/**
 * Get excerpt length status color
 */
export function getExcerptStatusColor(status: "short" | "good" | "long"): string {
  switch (status) {
    case "good":
      return "text-green-600 dark:text-green-400";
    case "short":
      return "text-orange-600 dark:text-orange-400";
    case "long":
      return "text-orange-600 dark:text-orange-400";
    default:
      return "text-muted-foreground";
  }
}
