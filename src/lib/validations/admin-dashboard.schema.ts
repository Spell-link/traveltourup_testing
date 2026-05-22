import { z } from "zod";

export const adminDashboardQuerySchema = z.object({
  range: z.enum(["7d", "30d", "90d", "ytd"]).default("30d"),
  granularity: z.enum(["day", "week"]).default("day"),
});

export type AdminDashboardQuery = z.infer<typeof adminDashboardQuerySchema>;
