import "server-only";

import { ForbiddenError } from "@/lib/authz/errors";
import { hasPermission, type AuthzContext } from "@/lib/authz";

export function assertCanChangeFlightBooking(input: {
  authz: AuthzContext | null;
  userId: string;
  bookingUserId: string | null;
}): void {
  if (!input.authz) throw new ForbiddenError();
  if (hasPermission(input.authz, "bookings:manage")) return;
  if (
    input.bookingUserId === input.userId &&
    hasPermission(input.authz, "bookings:cancel_own")
  ) {
    return;
  }
  throw new ForbiddenError();
}
