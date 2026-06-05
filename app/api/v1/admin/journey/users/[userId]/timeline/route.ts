import type { NextRequest } from "next/server";
import { getServerAuthz } from "@/lib/authz/session";
import { handleApiError } from "@/lib/api/error-handler";
import { AppError } from "@/lib/api/errors";
import { successResponse } from "@/lib/api/response";
import { getAdminUserJourneyTimeline } from "@/lib/services/journey/admin-journey.service";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ userId: string }> };

export async function GET(_req: NextRequest, ctx: RouteContext) {
  try {
    const { authz } = await getServerAuthz();
    const { userId } = await ctx.params;
    const uid = userId?.trim();
    if (!uid) {
      throw new AppError(400, "Missing user id.", "VALIDATION_ERROR");
    }

    const data = await getAdminUserJourneyTimeline({ authz, userId: uid });
    return successResponse(data, 200);
  } catch (error) {
    return handleApiError(error);
  }
}
