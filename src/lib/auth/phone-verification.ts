import "server-only";

import { prisma } from "@/lib/prisma";
import { phoneDisplayParts } from "@/lib/auth/phone-verification.core";

export {
  PHONE_VERIFY_METADATA,
  isPhoneVerificationPending,
  mapPhoneAuthError,
  maskPhone,
  normalizeSignupPhone,
  phoneDisplayParts,
} from "@/lib/auth/phone-verification.core";

export async function markPhoneVerificationRequired(userId: string): Promise<void> {
  await prisma.user.updateMany({
    where: { id: userId },
    data: { phone_verify_required: true },
  });
}

export async function syncVerifiedPhoneToProfile(userId: string, e164: string): Promise<void> {
  const parts = phoneDisplayParts(e164);
  const now = new Date();
  await prisma.user.update({
    where: { id: userId },
    data: {
      phone_e164: e164,
      phone: parts.phone,
      phone_country_code: parts.phone_country_code,
      phone_verified_at: now,
      phone_verify_required: false,
    },
  });
}

export async function getPhoneVerificationStatus(userId: string): Promise<{
  phone_verify_required: boolean;
  phone_verified_at: Date | null;
}> {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { phone_verify_required: true, phone_verified_at: true },
  });
  return {
    phone_verify_required: row?.phone_verify_required ?? false,
    phone_verified_at: row?.phone_verified_at ?? null,
  };
}
