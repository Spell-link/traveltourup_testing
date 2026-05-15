import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ForbiddenError, UnauthorizedError } from "@/lib/authz/errors";
import { DuffelApiError } from "@/lib/duffel/errors";
import {
  AppError,
  BookingFailedAfterPaymentError,
  BookingFailedRefundedError,
  BookingFailedRefundPendingError,
  ConflictError,
  ValidationError,
} from "./errors";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPrismaUniqueViolation(
  error: unknown,
): error is { code: "P2002"; meta?: { target?: string | string[] } } {
  return isRecord(error) && error.code === "P2002";
}

/** Infer slug conflict from Prisma P2002 meta.target (field or constraint names). */
function prismaUniqueViolationIsSlug(error: { meta?: { target?: string | string[] } }): boolean {
  const t = error.meta?.target;
  const fields = Array.isArray(t) ? t : t != null ? [t] : [];
  return fields.some((f) => {
    const s = String(f).toLowerCase();
    return s.includes("slug") || s.includes("blog_posts_slug");
  });
}

export function handleApiError(error: unknown) {
  if (error instanceof DuffelApiError) {
    const statusCode = error.status === 429 ? 429 : error.status >= 500 ? 502 : 400;
    const code =
      error.status === 429 ? ("UPSTREAM_RATE_LIMIT" as const) : ("UPSTREAM_ERROR" as const);
    return NextResponse.json(
      {
        success: false as const,
        code,
        message: error.clientMessage,
      },
      { status: statusCode },
    );
  }

  if (error instanceof ConflictError) {
    return NextResponse.json(
      {
        success: false as const,
        code: error.code,
        message: error.message,
        ...(error.issues !== undefined ? { issues: error.issues } : {}),
      },
      { status: 409 },
    );
  }

  if (error instanceof ValidationError) {
    return NextResponse.json(
      { success: false as const, code: error.code, issues: error.issues },
      { status: error.statusCode },
    );
  }

  if (error instanceof BookingFailedAfterPaymentError) {
    return NextResponse.json(
      {
        success: false as const,
        code: error.code,
        message: error.message,
        ...(error.supportReference != null && error.supportReference !== ""
          ? { support_reference: error.supportReference }
          : {}),
        ...(error.paymentIntentId != null && error.paymentIntentId !== ""
          ? { payment_intent_id: error.paymentIntentId }
          : {}),
      },
      { status: error.statusCode },
    );
  }

  if (error instanceof BookingFailedRefundPendingError) {
    return NextResponse.json(
      {
        success: false as const,
        code: error.code,
        message: error.message,
        ...(error.paymentIntentId != null && error.paymentIntentId !== ""
          ? { payment_intent_id: error.paymentIntentId }
          : {}),
        ...(error.refundId != null && error.refundId !== ""
          ? { refund_id: error.refundId }
          : {}),
        ...(error.refundStatus != null && error.refundStatus !== ""
          ? { refund_status: error.refundStatus }
          : {}),
      },
      { status: error.statusCode },
    );
  }

  if (error instanceof BookingFailedRefundedError) {
    return NextResponse.json(
      {
        success: false as const,
        code: error.code,
        message: error.message,
        ...(error.paymentIntentId != null && error.paymentIntentId !== ""
          ? { payment_intent_id: error.paymentIntentId }
          : {}),
        ...(error.refundId != null && error.refundId !== ""
          ? { refund_id: error.refundId }
          : {}),
      },
      { status: error.statusCode },
    );
  }

  if (error instanceof AppError) {
    return NextResponse.json(
      { success: false as const, code: error.code, message: error.message },
      { status: error.statusCode },
    );
  }

  if (error instanceof UnauthorizedError) {
    return NextResponse.json(
      { success: false as const, code: error.code, message: error.message },
      { status: error.statusCode },
    );
  }

  if (error instanceof ForbiddenError) {
    return NextResponse.json(
      { success: false as const, code: error.code, message: error.message },
      { status: error.statusCode },
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      { success: false as const, code: "VALIDATION_ERROR" as const, issues: error.issues },
      { status: 400 },
    );
  }

  if (isPrismaUniqueViolation(error)) {
    const slugIssue = prismaUniqueViolationIsSlug(error);
    const message = slugIssue
      ? "A post with this URL slug already exists. Use a different slug."
      : "This change conflicts with an existing record (duplicate value).";
    return NextResponse.json(
      {
        success: false as const,
        code: "CONFLICT" as const,
        message,
        ...(slugIssue
          ? {
              issues: [
                {
                  path: ["slug"],
                  message: "A post with this URL slug already exists. Use a different slug.",
                },
              ],
            }
          : {}),
      },
      { status: 409 },
    );
  }

  console.error("Unhandled error:", error);
  return NextResponse.json(
    { success: false as const, code: "INTERNAL_ERROR" as const, message: "Internal server error" },
    { status: 500 },
  );
}
