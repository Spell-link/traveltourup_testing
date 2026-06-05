"use client";

import { useActionState, useMemo, useState } from "react";
import NextLink from "next/link";
import { Eye, EyeOff, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Input } from "@/components/ui/Input";
import { AuthSocialRow } from "@/components/auth/AuthSocialRow";
import { authInputClass, authPrimaryButtonClass } from "@/components/auth/authFormStyles";
import { signInAction, type AuthActionState } from "@/lib/auth/actions";
import { ADMIN_GATE_LOCALE } from "@/i18n/routing";

type Props = {
  defaultNext?: string;
  queryError?: string | null;
  resetSuccess?: string | null;
  /** Fixed English copy + /en links — admin gate (`next` → `/admin`). */
  adminGate?: boolean;
};

const initialState: AuthActionState = null;

/** Mirrors `messages/en.json` Auth namespace for neutral admin gate UI. */
const AUTH_EN = {
  loginTitle: "Welcome Back",
  loginSubtitle: "Sign in with your email",
  email: "Email",
  password: "Password",
  rememberMe: "Remember me",
  forgotPassword: "Forgot password?",
  signingIn: "Signing in…",
  signIn: "Sign In",
  noAccount: "Don't have an account?",
  registerNow: "Register now",
  terms: "Terms of Service",
  privacy: "Privacy Policy",
  agreePrefix: "By continuing, you agree to our",
  and: "and",
  ariaHidePassword: "Hide password",
  ariaShowPassword: "Show password",
} as const;

export default function LoginCom({
  defaultNext = "/",
  queryError = null,
  resetSuccess = null,
  adminGate = false,
}: Props) {
  const t = useTranslations("Auth");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [state, formAction, pending] = useActionState(signInAction, initialState);

  const l = useMemo(() => (adminGate ? AUTH_EN : null), [adminGate]);

  const title = l ? l.loginTitle : t("loginTitle");
  const subtitle = l ? l.loginSubtitle : t("loginSubtitle");
  const emailLabel = l ? l.email : t("email");
  const passwordLabel = l ? l.password : t("password");
  const rememberLabel = l ? l.rememberMe : t("rememberMe");
  const forgotLabel = l ? l.forgotPassword : t("forgotPassword");
  const submitLabel = l ? l.signIn : t("signIn");
  const signingInLabel = l ? l.signingIn : `${t("signIn")}…`;
  const noAccountLabel = l ? l.noAccount : t("noAccount");
  const registerLabel = l ? l.registerNow : t("signUp");
  const termsLabel = l ? l.terms : t("terms");
  const privacyLabel = l ? l.privacy : t("privacy");

  const forgotHref = useMemo(() => {
    const suffix =
      defaultNext === "/" ? "" : `?next=${encodeURIComponent(defaultNext)}`;
    if (adminGate) {
      return `/${ADMIN_GATE_LOCALE}/forgot-password${suffix}`;
    }
    return `/forgot-password${suffix}`;
  }, [adminGate, defaultNext]);

  const signupHref = useMemo(() => {
    const suffix =
      defaultNext === "/" ? "" : `?next=${encodeURIComponent(defaultNext)}`;
    if (adminGate) {
      return `/${ADMIN_GATE_LOCALE}/signup${suffix}`;
    }
    return `/signup${suffix}`;
  }, [adminGate, defaultNext]);

  const termsHref = adminGate ? `/${ADMIN_GATE_LOCALE}/terms` : "/terms";
  const privacyHref = adminGate ? `/${ADMIN_GATE_LOCALE}/privacy` : "/privacy";

  const ForgotLink = adminGate ? NextLink : Link;
  const SignupLink = adminGate ? NextLink : Link;
  const LegalLink = adminGate ? NextLink : Link;

  return (
    <div className="w-full min-w-0 overflow-x-hidden">
      <header className="mb-4 text-center md:mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </header>

      {resetSuccess ? (
        <p
          role="status"
          className="mb-4 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-center text-sm text-foreground"
        >
          {resetSuccess}
        </p>
      ) : null}

      {state?.error || queryError ? (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-center text-sm text-destructive"
        >
          {state?.error ?? queryError ?? ""}
        </p>
      ) : null}

      <form action={formAction} className="space-y-3 md:space-y-4">
        <input type="hidden" name="next" value={defaultNext} readOnly />

        <Input
          label={emailLabel}
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          aria-required="true"
          placeholder="you@example.com"
          required
          disabled={pending}
          className={authInputClass}
        />

        <Input
          label={passwordLabel}
          id="password"
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          aria-required="true"
          placeholder="Enter your password"
          required
          disabled={pending}
          className={authInputClass}
          suffix={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? (l?.ariaHidePassword ?? "Hide password") : (l?.ariaShowPassword ?? "Show password")}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-5 w-5" strokeWidth={2} /> : <Eye className="h-5 w-5" strokeWidth={2} />}
            </button>
          }
        />

        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              id="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
            />
            <span className="text-muted-foreground">{rememberLabel}</span>
          </label>
          <ForgotLink
            href={forgotHref}
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            {forgotLabel}
          </ForgotLink>
        </div>

        <button type="submit" disabled={pending} className={`${authPrimaryButtonClass} disabled:cursor-not-allowed disabled:opacity-60`}>
          {pending ? signingInLabel : submitLabel}
          <ChevronRight className="h-5 w-5" strokeWidth={2.5} />
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground md:mt-5">
        {noAccountLabel}{" "}
        <SignupLink href={signupHref} className="font-semibold text-primary underline-offset-2 hover:underline">
          {registerLabel}
        </SignupLink>
      </p>

      <AuthSocialRow next={defaultNext} adminGate={adminGate} />

      <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground md:mt-5">
        {l ? `${l.agreePrefix} ` : "By continuing, you agree to our "}
        <LegalLink href={termsHref} className="text-primary hover:underline">
          {termsLabel}
        </LegalLink>{" "}
        {l ? `${l.and} ` : "and "}
        <LegalLink href={privacyHref} className="text-primary hover:underline">
          {privacyLabel}
        </LegalLink>
        .
      </p>
    </div>
  );
}
