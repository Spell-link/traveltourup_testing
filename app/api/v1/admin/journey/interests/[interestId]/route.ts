import type { NextRequest } from "next/server";
import { getServerAuthz } from "@/lib/authz/session";
import { handleApiError } from "@/lib/api/error-handler";
import { AppError } from "@/lib/api/errors";
import { successResponse } from "@/lib/api/response";
import { getAdminJourneyInterestDetail } from "@/lib/services/journey/admin-journey.service";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ interestId: string }> };

export async function GET(_req: NextRequest, ctx: RouteContext) {
  try {
    const { authz } = await getServerAuthz();
    const { interestId } = await ctx.params;
    const id = interestId?.trim();
    if (!id) {
      throw new AppError(400, "Missing interest id.", "VALIDATION_ERROR");
    }

    const data = await getAdminJourneyInterestDetail({ authz, interestId: id });
    return successResponse(data, 200);
  } catch (error) {
    return handleApiError(error);
  }
}
