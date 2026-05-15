import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma";
import { getDuffelWebhookSecret } from "@/lib/duffel/config";
import { verifyDuffelWebhookSignature } from "@/lib/duffel/webhook-verify";
import { logger } from "@/lib/obs/logger";
import { REQUEST_ID_HEADER, getRequestId } from "@/lib/obs/request-id";
import { recordDuffelWebhookEvent } from "@/lib/services/duffel/duffel-webhook.service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestId = getRequestId((name) => request.headers.get(name));
  const log = logger.withContext({ request_id: requestId });
  const ok = <T>(body: T, status = 200) =>
    NextResponse.json(body, { status, headers: { [REQUEST_ID_HEADER]: requestId } });

  const secret = getDuffelWebhookSecret();
  if (!secret) {
    log.warn("Duffel webhook received but secret is not configured");
    return ok({ success: false as const, code: "WEBHOOK_NOT_CONFIGURED" as const }, 503);
  }

  const raw = await request.text();
  const sig = request.headers.get("X-Duffel-Signature");
  if (!verifyDuffelWebhookSignature(secret, raw, sig)) {
    log.warn("Duffel webhook rejected — invalid signature");
    return ok({ success: false as const, code: "INVALID_SIGNATURE" as const }, 401);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return ok({ success: false as const, code: "INVALID_JSON" as const }, 400);
  }

  if (!parsed || typeof parsed !== "object") {
    return ok({ success: false as const, code: "INVALID_JSON" as const }, 400);
  }

  const eventType =
    typeof (parsed as { type?: unknown }).type === "string"
      ? (parsed as { type: string }).type
      : null;

  try {
    const result = await recordDuffelWebhookEvent(parsed as Prisma.InputJsonValue);
    log.info("Duffel webhook processed", {
      error_code: eventType,
      ...(result.duplicate ? { duplicate: true } : {}),
    });
    return ok({
      success: true as const,
      duplicate: result.duplicate ? (true as const) : (false as const),
    });
  } catch (err) {
    log.error("Duffel webhook persist error", {
      error_code: eventType,
      detail: err instanceof Error ? err.message : String(err),
    });
    return ok({ success: false as const, code: "WEBHOOK_PROCESS_ERROR" as const }, 500);
  }
}
