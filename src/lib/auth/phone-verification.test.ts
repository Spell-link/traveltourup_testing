import { describe, expect, it } from "vitest";
import {
  buildE164FromParts,
  formatDuffelPhone,
} from "@/lib/validations/phone.schema";
import {
  isPhoneVerificationPending,
  maskPhone,
  normalizeSignupPhone,
  phoneDisplayParts,
} from "@/lib/auth/phone-verification.core";

describe("phone signup validation", () => {
  it("builds E.164 from country code and national number", () => {
    expect(buildE164FromParts("+92", "323 3123210")).toBe("+923233123210");
  });

  it("normalizes spaced international numbers", () => {
    expect(normalizeSignupPhone("+92 3233123210")).toBe("+923233123210");
  });
});

describe("phone verification helpers", () => {
  it("masks phone for display", () => {
    const masked = maskPhone("+923233123210");
    expect(masked).toContain("3210");
  });

  it("splits E.164 into profile parts", () => {
    const parts = phoneDisplayParts("+442080160509");
    expect(parts.phone_country_code).toBe("+44");
    expect(formatDuffelPhone(`+44${parts.phone}`)).toBeTruthy();
  });

  it("detects pending verification from metadata", () => {
    expect(
      isPhoneVerificationPending({
        id: "u1",
        app_metadata: {},
        user_metadata: { phone_verify_required: true, phone_verified: false },
        aud: "authenticated",
        created_at: "",
      } as never),
    ).toBe(true);

    expect(
      isPhoneVerificationPending({
        id: "u1",
        app_metadata: {},
        user_metadata: { phone_verify_required: true, phone_verified: true },
        aud: "authenticated",
        created_at: "",
        phone_confirmed_at: new Date().toISOString(),
      } as never),
    ).toBe(false);
  });
});
