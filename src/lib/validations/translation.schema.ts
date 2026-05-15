import { z } from "zod";
import { locales } from "@/i18n/routing";

export const appLocaleSchema = z.enum(locales);

export const translateFieldsBodySchema = z.object({
  sourceLocale: appLocaleSchema.default("en"),
  targetLocale: appLocaleSchema,
  fields: z.record(z.string(), z.string()).refine((fields) => Object.keys(fields).length > 0, {
    message: "At least one field is required.",
  }),
});

export const translatePayloadBodySchema = z.object({
  sourceLocale: appLocaleSchema.default("en"),
  targetLocale: appLocaleSchema,
  payload: z.unknown(),
  includePaths: z.array(z.string()).optional(),
  excludePaths: z.array(z.string()).optional(),
});

export const translateRequestBodySchema = z.union([
  translateFieldsBodySchema,
  translatePayloadBodySchema,
]);

export type TranslateFieldsBody = z.infer<typeof translateFieldsBodySchema>;
export type TranslatePayloadBody = z.infer<typeof translatePayloadBodySchema>;
