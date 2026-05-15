import "server-only";

import type { AppLocale } from "@/i18n/routing";
import { translateText } from "./translate";
import { shouldSkipTranslationKey, type TranslateRulesOptions } from "./rules";

const DEFAULT_MAX_DEPTH = 12;

export type TranslateObjectOptions = TranslateRulesOptions & {
  sourceLocale: AppLocale | string;
  targetLocale: AppLocale | string;
  maxDepth?: number;
};

export async function translateObjectSelective<T>(
  value: T,
  options: TranslateObjectOptions,
  path = "",
  depth = 0,
): Promise<T> {
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  if (depth > maxDepth) return value;

  if (typeof value === "string") {
    if (!value.trim()) return value;
    return (await translateText(value, options.sourceLocale, options.targetLocale)) as T;
  }

  if (Array.isArray(value)) {
    const next = await Promise.all(
      value.map((item, index) =>
        translateObjectSelective(item, options, `${path}[${index}]`, depth + 1),
      ),
    );
    return next as T;
  }

  if (value && typeof value === "object") {
    const entries = await Promise.all(
      Object.entries(value as Record<string, unknown>).map(async ([key, child]) => {
        const childPath = path ? `${path}.${key}` : key;
        if (shouldSkipTranslationKey(key, childPath, options)) {
          return [key, child] as const;
        }
        const translatedChild = await translateObjectSelective(
          child,
          options,
          childPath,
          depth + 1,
        );
        return [key, translatedChild] as const;
      }),
    );
    return Object.fromEntries(entries) as T;
  }

  return value;
}
