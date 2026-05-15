"use client";

import { useCallback, useState } from "react";
import type { AppLocale } from "@/i18n/routing";
import {
  buildTranslatableEnglishFields,
  getEnglishBlogSourceError,
} from "@/lib/blog/english-translation-guard";
import { translateFields } from "@/lib/http/translation.client";

export type BlogAutoTranslateSnapshot = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  meta_title: string;
  meta_description: string;
  focus_keyphrase: string;
  image_alts: Record<string, string>;
};

function clampSeoField(value: string, max: number): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

export function useBlogAutoTranslate() {
  const [loadingLocale, setLoadingLocale] = useState<AppLocale | null>(null);
  const [error, setError] = useState<string | null>(null);

  const autoTranslate = useCallback(
    async (
      targetLocale: AppLocale,
      source: BlogAutoTranslateSnapshot,
    ): Promise<BlogAutoTranslateSnapshot | null> => {
      setLoadingLocale(targetLocale);
      setError(null);
      try {
        const englishError = getEnglishBlogSourceError(source);
        if (englishError) {
          setError(englishError);
          return null;
        }

        const fields = buildTranslatableEnglishFields(source);
        const translated = await translateFields("en", targetLocale, fields);
        const image_alts: Record<string, string> = {};
        for (const [key, value] of Object.entries(translated)) {
          if (key.startsWith("image_alt_")) {
            image_alts[key.replace("image_alt_", "")] = value;
          }
        }

        return {
          title: translated.title ?? "",
          slug: source.slug,
          excerpt: translated.excerpt ?? "",
          content: translated.content ?? "",
          meta_title: clampSeoField(translated.meta_title ?? "", 60),
          meta_description: clampSeoField(translated.meta_description ?? "", 160),
          focus_keyphrase: translated.focus_keyphrase ?? "",
          image_alts,
        };
      } catch (err) {
        setError(err instanceof Error ? err.message : "Auto translate failed.");
        return null;
      } finally {
        setLoadingLocale(null);
      }
    },
    [],
  );

  return {
    autoTranslate,
    loadingLocale,
    error,
    clearError: () => setError(null),
  };
}
