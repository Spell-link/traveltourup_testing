import { NextRequest } from "next/server";

import { handleApiError } from "@/lib/api/error-handler";
import { ValidationError } from "@/lib/api/errors";
import { successResponse } from "@/lib/api/response";
import { hasPermission } from "@/lib/authz";
import { ForbiddenError } from "@/lib/authz/errors";
import { requireUserId } from "@/lib/authz/server";
import { getServerAuthz } from "@/lib/authz/session";
import {
  deleteAdminFlightPricingRule,
  getAdminFlightPricingRule,
  updateAdminFlightPricingRule,
} from "@/lib/services/admin/admin-flight-pricing-rules.service";
import { flightPricingRuleBodySchema } from "@/lib/validations/flight-pricing-rule.schema";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

async function requireAdmin() {
  const { userId, authz } = await getServerAuthz();
  await requireUserId(userId);
  if (!authz || !hasPermission(authz, "bookings:manage")) {
    throw new ForbiddenError();
  }
}

export async function GET(_req: NextRequest, ctx: RouteContext) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    const row = await getAdminFlightPricingRule(id);
    return successResponse(row);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PUT(req: NextRequest, ctx: RouteContext) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    const json = (await req.json()) as unknown;
    const parsed = flightPricingRuleBodySchema.safeParse(json);
    if (!parsed.success) throw new ValidationError(parsed.error.issues);
    const row = await updateAdminFlightPricingRule(id, parsed.data);
    return successResponse(row);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    await deleteAdminFlightPricingRule(id);
    return successResponse({ deleted: true });
  } catch (e) {
    return handleApiError(e);
  }
}
