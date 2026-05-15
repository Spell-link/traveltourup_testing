import "server-only";

import type { NextRequest } from "next/server";
import { handleApiError } from "@/lib/api/error-handler";
import { successResponse } from "@/lib/api/response";
import { clientIpFromHeaders, rateLimitByKey } from "@/lib/api/rate-limit-ip";
import {
  translateFields,
  translatePayload,
} from "@/lib/services/translation/translation.service";
import {
  translateFieldsBodySchema,
  translatePayloadBodySchema,
} from "@/lib/validations/translation.schema";

const TRANSLATE_RATE_LIMIT = 30;

export async function handleTranslatePOST(req: NextRequest): Promise<Response> {
  try {
    const ip = clientIpFromHeaders((name) => req.headers.get(name));
    const limited = rateLimitByKey(`translate:${ip}`, TRANSLATE_RATE_LIMIT);
    if (!limited.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Too many translation requests. Please try again shortly.",
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(limited.retryAfterSec),
          },
        },
      );
    }

    const body = await req.json();
    const fieldsResult = translateFieldsBodySchema.safeParse(body);
    if (fieldsResult.success) {
      const data = await translateFields(fieldsResult.data);
      return successResponse({ fields: data });
    }

    const payloadResult = translatePayloadBodySchema.safeParse(body);
    if (payloadResult.success) {
      const data = await translatePayload(payloadResult.data);
      return successResponse({ payload: data });
    }

    throw fieldsResult.error;
  } catch (error) {
    return handleApiError(error);
  }
}
