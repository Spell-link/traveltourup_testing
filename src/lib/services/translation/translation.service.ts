import "server-only";

import { ValidationError } from "@/lib/api/errors";
import type { AppLocale } from "@/i18n/routing";
import { getEnglishBlogSourceError } from "@/lib/blog/english-translation-guard";
import { translateObjectSelective } from "@/lib/translations/translate-object";
import { translateFieldMap } from "@/lib/translations/translate";
import { TranslationProviderError } from "@/lib/translations/translate";
import type {
  TranslateFieldsBody,
  TranslatePayloadBody,
} from "@/lib/validations/translation.schema";

function assertDifferentLocales(sourceLocale: AppLocale, targetLocale: AppLocale): void {
  if (sourceLocale === targetLocale) {
    throw new ValidationError([
      { path: ["targetLocale"], message: "Target locale must differ from source locale." },
    ]);
  }
}

export async function translateFields(
  body: TranslateFieldsBody,
): Promise<Record<string, string>> {
  assertDifferentLocales(body.sourceLocale, body.targetLocale);

  const englishError = getEnglishBlogSourceError(body.fields);
  if (englishError) {
    throw new ValidationError([{ path: ["fields"], message: englishError }]);
  }

  const entries = Object.entries(body.fields);
  try {
    const translated = await translateFieldMap(
      Object.fromEntries(entries),
      body.sourceLocale,
      body.targetLocale,
    );
    return translated;
  } catch (error) {
    if (error instanceof TranslationProviderError) {
      throw new ValidationError([{ path: [], message: error.message }]);
    }
    throw error;
  }
}

export async function translatePayload(body: TranslatePayloadBody): Promise<unknown> {
  assertDifferentLocales(body.sourceLocale, body.targetLocale);

  try {
    return await translateObjectSelective(body.payload, {
      sourceLocale: body.sourceLocale,
      targetLocale: body.targetLocale,
      includePaths: body.includePaths,
      excludePaths: body.excludePaths,
    });
  } catch (error) {
    if (error instanceof TranslationProviderError) {
      throw new ValidationError([{ path: [], message: error.message }]);
    }
    throw error;
  }
}
