import type { NextRequest } from "next/server";
import { handlePhoneSendOtp } from "@/lib/api/auth/auth.controller";

export const dynamic = "force-dynamic";

export function POST(req: NextRequest) {
  return handlePhoneSendOtp(req);
}
