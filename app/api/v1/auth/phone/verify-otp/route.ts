import type { NextRequest } from "next/server";
import { handlePhoneVerifyOtp } from "@/lib/api/auth/auth.controller";

export const dynamic = "force-dynamic";

export function POST(req: NextRequest) {
  return handlePhoneVerifyOtp(req);
}
