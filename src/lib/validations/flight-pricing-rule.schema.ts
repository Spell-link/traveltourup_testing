import { z } from "zod";

const iata = z
  .string()
  .min(2)
  .max(8)
  .transform((s) => s.trim().toUpperCase());

export const flightPricingRuleBodySchema = z
  .object({
    name: z.string().min(1).max(120),
    enabled: z.boolean().default(true),
    priority: z.number().int().min(0).max(10_000).default(100),
    origin_iata: iata.nullable().optional(),
    destination_iata: iata.nullable().optional(),
    carrier_iata: iata.nullable().optional(),
    cabin_class: z
      .enum(["economy", "premium_economy", "business", "first"])
      .nullable()
      .optional(),
    commission_percent_override: z
      .number()
      .min(0)
      .max(100)
      .nullable()
      .optional(),
    markup_fixed_override: z
      .string()
      .regex(/^-?\d+(\.\d{1,2})?$/u, "must be a decimal with up to 2 places")
      .nullable()
      .optional(),
    max_commission_percent: z.number().min(0).max(100).nullable().optional(),
    max_markup_fixed: z
      .string()
      .regex(/^-?\d+(\.\d{1,2})?$/u)
      .nullable()
      .optional(),
    effective_from: z.string().datetime().nullable().optional(),
    effective_to: z.string().datetime().nullable().optional(),
    notes: z.string().max(2000).nullable().optional(),
  })
  .strict();

export type FlightPricingRuleBody = z.infer<typeof flightPricingRuleBodySchema>;
