"use client";

import { useActionState, useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { ChevronRight } from "lucide-react";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { OtpCodeInput } from "@/components/auth/OtpCodeInput";
import {
  defaultCallingCodeForLocale,
  PhoneNumberField,
} from "@/components/auth/PhoneNumberField";
import { authPrimaryButtonClass } from "@/components/auth/authFormStyles";
import {
  sendPhoneOtpAction,
  verifyPhoneOtpAction,
  type AuthActionState,
} from "@/lib/auth/actions";
import { buildE164FromParts } from "@/lib/validations/phone.schema";

type Props = {
  defaultNext?: string;
};

const initialState: AuthActionState = null;

export function VerifyPhoneCom({ defaultNext = "/" }: Props) {
  const locale = useLocale();
  const [countryCode, setCountryCode] = useState(() => defaultCallingCodeForLocale(locale));
  const [nationalNumber, setNationalNumber] = useState("");
  const [phoneE164, setPhoneE164] = useState("");
  const [otp, setOtp] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const [sendState, sendAction, sendPending] = useActionState(sendPhoneOtpAction, initialState);
  const [verifyState, verifyAction, verifyPending] = useActionState(verifyPhoneOtpAction, initialState);

  const state = verifyState ?? sendState;
  const pending = sendPending || verifyPending;

  useEffect(() => {
    const e164 = buildE164FromParts(countryCode, nationalNumber);
    if (e164) setPhoneE164(e164);
  }, [countryCode, nationalNumber]);

  useEffect(() => {
    if (sendState?.success) {
      setCodeSent(true);
      setResendCooldown(60);
    }
  }, [sendState]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  return (
    <AuthSplitLayout variant="signup">
      <div className="w-full min-w-0 overflow-x-hidden">
        <header className="mb-4 text-center md:mb-5">
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Verify your phone</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Add a mobile number so we can reach you about your trips and bookings.
          </p>
        </header>

        {state?.error ? (
          <p
            role="alert"
            className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-center text-sm text-destructive"
          >
            {state.error}
          </p>
        ) : null}

        {state?.success ? (
          <p
            role="status"
            className="mb-4 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-center text-sm text-foreground"
          >
            {state.success}
          </p>
        ) : null}

        {!codeSent ? (
          <form action={sendAction} className="space-y-4">
            <PhoneNumberField
              countryCallingCode={countryCode}
              nationalNumber={nationalNumber}
              onCountryCallingCodeChange={setCountryCode}
              onNationalNumberChange={setNationalNumber}
              disabled={pending}
              phoneFieldName="phone"
            />
            <button
              type="submit"
              disabled={pending || !phoneE164}
              className={`${authPrimaryButtonClass} w-full disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {sendPending ? "Sending code…" : "Send verification code"}
              <ChevronRight className="h-5 w-5" strokeWidth={2.5} />
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <form action={verifyAction} className="space-y-4">
              <input type="hidden" name="next" value={defaultNext} readOnly />
              <input type="hidden" name="phone" value={phoneE164} readOnly />
              <OtpCodeInput value={otp} onChange={setOtp} disabled={verifyPending} />
              <button
                type="submit"
                disabled={otp.length !== 6 || verifyPending}
                className={`${authPrimaryButtonClass} w-full disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {verifyPending ? "Verifying…" : "Verify & continue"}
                <ChevronRight className="h-5 w-5" strokeWidth={2.5} />
              </button>
            </form>

            <form action={sendAction} className="text-center">
              <input type="hidden" name="phone" value={phoneE164} readOnly />
              <input type="hidden" name="resend" value="true" readOnly />
              <button
                type="submit"
                disabled={sendPending || resendCooldown > 0}
                className="text-sm font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
              >
                {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
              </button>
            </form>

            <button
              type="button"
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
              onClick={() => {
                setCodeSent(false);
                setOtp("");
              }}
            >
              Change phone number
            </button>
          </div>
        )}
      </div>
    </AuthSplitLayout>
  );
}
