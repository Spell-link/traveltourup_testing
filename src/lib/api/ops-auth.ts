import "server-only";
import { AppError } from "@/lib/api/errors";

/**
 * Authorises internal "ops" cron handlers (orphan PIT sweeper, refund poller,
 * cancellation quote expirer, …).
 *
 * Caller MUST send `Authorization: Bearer <OPS_JOB_TOKEN>`. The token is
 * required to be set in production; in non-production the handler refuses
 * unless `OPS_JOB_TOKEN_DEV_BYPASS=1` is set to allow local invocation.
 *
 * Timing-safe-ish comparison: we use a length check + `===` only after a
 * length-equal guard which is enough at our scale (the secret is rotated, not
 * a long-lived password).
 */
export function assertOpsAuthorised(getHeader: (name: string) => string | null): void {
  const expected = process.env.OPS_JOB_TOKEN?.trim();
  if (!expected) {
    if (
      process.env.NODE_ENV !== "production" &&
      process.env.OPS_JOB_TOKEN_DEV_BYPASS === "1"
    ) {
      return;
    }
    throw new AppError(
      503,
      "OPS_JOB_TOKEN is not configured.",
      "OPS_NOT_CONFIGURED",
    );
  }

  const header = getHeader("authorization")?.trim() ?? "";
  const presented = header.startsWith("Bearer ")
    ? header.slice("Bearer ".length).trim()
    : "";
  if (presented.length !== expected.length || presented !== expected) {
    throw new AppError(401, "Unauthorised.", "UNAUTHORIZED");
  }
}
