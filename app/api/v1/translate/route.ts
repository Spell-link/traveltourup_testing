import { NextRequest } from "next/server";
import { handleTranslatePOST } from "@/lib/api/translation/translation.controller";
import { withPermissionRoute } from "@/lib/api/with-route-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  return withPermissionRoute("admin.blogs:write", () => handleTranslatePOST(req));
}
