import { NextRequest } from "next/server";

import { handleApiError } from "@/lib/api/error-handler";
import { ValidationError } from "@/lib/api/errors";
import { successResponse } from "@/lib/api/response";
import { hasPermission } from "@/lib/authz";
import { ForbiddenError } from "@/lib/authz/errors";
import { requireUserId } from "@/lib/authz/server";
import { getServerAuthz } from "@/lib/authz/session";
import {
  createAdminFlightPricingRule,
  listAdminFlightPricingRules,
} from "@/lib/services/admin/admin-flight-pricing-rules.service";
import { flightPricingRuleBodySchema } from "@/lib/validations/flight-pricing-rule.schema";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const { userId, authz } = await getServerAuthz();
  await requireUserId(userId);
  if (!authz || !hasPermission(authz, "bookings:manage")) {
    throw new ForbiddenError();
  }
}

export async function GET() {
  try {
    await requireAdmin();
    const rows = await listAdminFlightPricingRules();
    return successResponse({ items: rows });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const json = (await req.json()) as unknown;
    const parsed = flightPricingRuleBodySchema.safeParse(json);
    if (!parsed.success) throw new ValidationError(parsed.error.issues);
    const row = await createAdminFlightPricingRule(parsed.data);
    return successResponse(row, 201);
  } catch (e) {
    return handleApiError(e);
  }
}
