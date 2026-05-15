import type { AppLocale } from "@/i18n/routing";
import { apiJson } from "@/lib/http/api-client";

export async function translateFields(
  sourceLocale: AppLocale,
  targetLocale: AppLocale,
  fields: Record<string, string>,
): Promise<Record<string, string>> {
  const data = await apiJson<{ fields: Record<string, string> }>("/api/v1/translate", {
    method: "POST",
    body: {
      sourceLocale,
      targetLocale,
      fields,
    },
  });
  return data.fields;
}
