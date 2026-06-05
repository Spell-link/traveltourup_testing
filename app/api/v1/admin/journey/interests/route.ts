import type { NextRequest } from "next/server";
import { getServerAuthz } from "@/lib/authz/session";
import { handleApiError } from "@/lib/api/error-handler";
import { paginatedResponse } from "@/lib/api/response";
import { listAdminJourneyInterests } from "@/lib/services/journey/admin-journey.service";
import { adminJourneyInterestsQuerySchema } from "@/lib/validations/customer-journey.schema";

export const dynamic = "force-dynamic";

function qp(raw: string | null) {
  return raw === null || raw === "" ? undefined : raw;
}

export async function GET(req: NextRequest) {
  try {
    const { authz } = await getServerAuthz();
    const { searchParams } = new URL(req.url);
    const query = adminJourneyInterestsQuerySchema.parse({
      page: qp(searchParams.get("page")),
      limit: qp(searchParams.get("limit")),
      stage: qp(searchParams.get("stage")),
      product_type: qp(searchParams.get("product_type")),
      abandoned_only: qp(searchParams.get("abandoned_only")),
      from: qp(searchParams.get("from")),
      to: qp(searchParams.get("to")),
      sort: qp(searchParams.get("sort")),
      order: qp(searchParams.get("order")),
    });

    const { items, total, page, limit } = await listAdminJourneyInterests({ authz, query });
    return paginatedResponse(items, { total, page, limit });
  } catch (error) {
    return handleApiError(error);
  }
}
