"use client";

import { useActionState, useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { Eye, EyeOff, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { AuthSocialRow } from "@/components/auth/AuthSocialRow";
import { OtpCodeInput } from "@/components/auth/OtpCodeInput";
import {
  defaultCallingCodeForLocale,
  PhoneNumberField,
} from "@/components/auth/PhoneNumberField";
import { authInputClass, authPrimaryButtonClass } from "@/components/auth/authFormStyles";
import {
  sendPhoneOtpAction,
  signUpStartAction,
  verifyPhoneOtpAction,
  type AuthActionState,
} from "@/lib/auth/actions";
import { buildE164FromParts } from "@/lib/validations/phone.schema";

type Props = {
  defaultNext?: string;
};

const initialState: AuthActionState = null;

export default function SignUpCom({ defaultNext = "/" }: Props) {
  const locale = useLocale();
  const [step, setStep] = useState<"form" | "otp">("form");
  const [changingPhone, setChangingPhone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [countryCode, setCountryCode] = useState(() => defaultCallingCodeForLocale(locale));
  const [nationalNumber, setNationalNumber] = useState("");
  const [phoneE164, setPhoneE164] = useState("");
  /** Phone number the current OTP was sent to (may differ from form fields after change). */
  const [activePhoneE164, setActivePhoneE164] = useState("");
  const [otp, setOtp] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  const [startState, startAction, startPending] = useActionState(signUpStartAction, initialState);
  const [verifyState, verifyAction, verifyPending] = useActionState(verifyPhoneOtpAction, initialState);
  const [sendState, sendAction, sendPending] = useActionState(sendPhoneOtpAction, initialState);

  const otpUiState = changingPhone ? sendState : verifyState ?? sendState ?? startState;
  const pending =
    step === "form" ? startPending : changingPhone ? sendPending : verifyPending || sendPending;

  useEffect(() => {
    if (startState?.step === "otp") {
      setStep("otp");
      setChangingPhone(false);
      setResendCooldown(60);
    }
  }, [startState]);

  useEffect(() => {
    if (sendState?.success && step === "otp") {
      setChangingPhone(false);
      setResendCooldown(60);
      setOtp("");
      if (phoneE164) setActivePhoneE164(phoneE164);
    }
  }, [sendState, step, phoneE164]);

  useEffect(() => {
    if (startState?.step === "otp" && phoneE164) {
      setActivePhoneE164(phoneE164);
    }
  }, [startState?.step, phoneE164]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  useEffect(() => {
    const e164 = buildE164FromParts(countryCode, nationalNumber);
    if (e164) setPhoneE164(e164);
  }, [countryCode, nationalNumber]);

  const maskedPhone =
    sendState?.phone ?? startState?.phone ?? otpUiState?.phone;

  return (
    <div className="w-full min-w-0 overflow-x-hidden">
      <header className="mb-4 text-center md:mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          {step === "otp"
            ? changingPhone
              ? "Change phone number"
              : "Verify your phone"
            : "Register Now!"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {step === "otp"
            ? changingPhone
              ? "Enter a new mobile number. We will send a fresh verification code."
              : maskedPhone
                ? `Enter the code we sent to ${maskedPhone}.`
                : "Enter the verification code from your SMS."
            : "Register now to start your journey!"}
        </p>
      </header>

      {otpUiState?.error && step === "otp" ? (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-center text-sm text-destructive"
        >
          {otpUiState.error}
        </p>
      ) : null}

      {startState?.error && step === "form" ? (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-center text-sm text-destructive"
        >
          {startState.error}
        </p>
      ) : null}

      {otpUiState?.success && step === "otp" ? (
        <p
          role="status"
          className="mb-4 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-center text-sm text-foreground"
        >
          {otpUiState.success}
        </p>
      ) : null}

      {startState?.success && step === "form" ? (
        <p
          role="status"
          className="mb-4 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-center text-sm text-foreground"
        >
          {startState.success}
        </p>
      ) : null}

      {step === "form" ? (
        <form action={startAction} className="space-y-3 md:space-y-4">
          <input type="hidden" name="next" value={defaultNext} readOnly />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3 md:gap-4">
            <Input
              label="First name"
              id="first_name"
              name="first_name"
              type="text"
              autoComplete="given-name"
              placeholder="First name"
              required
              disabled={pending}
              className={authInputClass}
            />
            <Input
              label="Last name"
              id="last_name"
              name="last_name"
              type="text"
              autoComplete="family-name"
              placeholder="Last name"
              required
              disabled={pending}
              className={authInputClass}
            />
          </div>

          <Input
            label="Email"
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            disabled={pending}
            className={authInputClass}
          />

          <div>
            <Input
              label="Password"
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Create a strong password"
              required
              disabled={pending}
              className={authInputClass}
              suffix={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              }
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              At least 8 characters with 1 uppercase letter and 1 number
            </p>
          </div>

          <PhoneNumberField
            countryCallingCode={countryCode}
            nationalNumber={nationalNumber}
            onCountryCallingCodeChange={setCountryCode}
            onNationalNumberChange={setNationalNumber}
            disabled={pending}
            phoneFieldName="phone"
          />

          <div id="accept-terms-section" className="flex min-w-0 items-start gap-3 scroll-mt-24 pt-0.5">
            <input
              id="accept-terms"
              name="accept_terms"
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              className="mt-0.5 size-4 shrink-0 rounded border-input text-primary focus:ring-primary"
              required
            />
            <label
              htmlFor="accept-terms"
              className="min-w-0 flex-1 break-words text-sm leading-relaxed text-muted-foreground"
            >
              I agree to the{" "}
              <Link href="/terms" className="font-medium text-primary hover:underline">
                Terms and Conditions
              </Link>
              ,{" "}
              <Link href="/privacy" className="font-medium text-primary hover:underline">
                Privacy Policy
              </Link>
              , and consent to receive transactional SMS for account verification.
            </label>
          </div>

          <button
            type="submit"
            disabled={!acceptTerms || pending || !phoneE164}
            className={`${authPrimaryButtonClass} disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {pending ? "Creating account…" : "Continue"}
            <ChevronRight className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </form>
      ) : changingPhone ? (
        <div className="space-y-4">
          <form action={sendAction} className="space-y-4">
            <PhoneNumberField
              countryCallingCode={countryCode}
              nationalNumber={nationalNumber}
              onCountryCallingCodeChange={setCountryCode}
              onNationalNumberChange={setNationalNumber}
              disabled={sendPending}
              phoneFieldName="phone"
            />
            <button
              type="submit"
              disabled={sendPending || !phoneE164}
              className={`${authPrimaryButtonClass} w-full disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {sendPending ? "Sending code…" : "Send verification code"}
              <ChevronRight className="h-5 w-5" strokeWidth={2.5} />
            </button>
          </form>

          <button
            type="button"
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
            onClick={() => setChangingPhone(false)}
          >
            Back to code entry
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <form action={verifyAction} className="space-y-4">
            <input type="hidden" name="next" value={defaultNext} readOnly />
            <input type="hidden" name="phone" value={activePhoneE164} readOnly />
            <OtpCodeInput value={otp} onChange={setOtp} disabled={verifyPending} />
            <button
              type="submit"
              disabled={otp.length !== 6 || verifyPending || !activePhoneE164}
              className={`${authPrimaryButtonClass} w-full disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {verifyPending ? "Verifying…" : "Verify & continue"}
              <ChevronRight className="h-5 w-5" strokeWidth={2.5} />
            </button>
          </form>

          <form action={sendAction} className="text-center">
            <input type="hidden" name="phone" value={activePhoneE164} readOnly />
            <input type="hidden" name="resend" value="true" readOnly />
            <button
              type="submit"
              disabled={sendPending || resendCooldown > 0 || !activePhoneE164}
              className="text-sm font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
            >
              {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
            </button>
          </form>

          <button
            type="button"
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
            onClick={() => {
              setChangingPhone(true);
              setOtp("");
            }}
          >
            Change phone number
          </button>
        </div>
      )}

      {step === "form" ? (
        <>
          <p className="mt-4 text-center text-sm text-muted-foreground md:mt-5">
            Already have an account?{" "}
            <Link
              href={defaultNext === "/" ? "/login" : `/login?next=${encodeURIComponent(defaultNext)}`}
              className="font-semibold text-primary underline-offset-2 hover:underline"
            >
              Sign In
            </Link>
          </p>

          <AuthSocialRow next={defaultNext} />
        </>
      ) : null}
    </div>
  );
}
