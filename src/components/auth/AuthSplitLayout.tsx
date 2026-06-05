import type { ReactNode } from "react";
import NextLink from "next/link";
import { Link } from "@/i18n/navigation";
import { AuthVideo } from "./AuthVideo";
import { AuthFormScrollPane } from "./AuthFormScrollPane";
import { SITE_NAME } from "@/config/brand";
import { ADMIN_GATE_LOCALE } from "@/i18n/routing";

const YEAR = new Date().getFullYear();

export type AuthSplitVariant = "login" | "signup";

type AuthSplitLayoutProps = {
  children: ReactNode;
  variant: AuthSplitVariant;
  /** Fixed English panel + legal links under `/en/...` for admin-targeted login. */
  adminGate?: boolean;
};

const PANEL_COPY: Record<AuthSplitVariant, { headline: string; sub: string }> = {
  signup: {
    headline: "Create Your Account Now!",
    sub: "By creating an account, you'll enjoy personalized travel recommendations, faster bookings, and exclusive offers.",
  },
  login: {
    headline: "Your Journey Continues Here",
    sub: "Access saved trips, exclusive offers, and seamless booking in one place.",
  },
};

export function AuthSplitLayout({ children, variant, adminGate = false }: AuthSplitLayoutProps) {
  const copy = PANEL_COPY[variant];
  const TermsLink = adminGate ? NextLink : Link;
  const PrivacyLink = adminGate ? NextLink : Link;
  const termsHref = adminGate ? `/${ADMIN_GATE_LOCALE}/terms` : "/terms";
  const privacyHref = adminGate ? `/${ADMIN_GATE_LOCALE}/privacy` : "/privacy";

  return (
    <div className="relative flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden bg-background lg:flex-row lg:items-stretch">
      {/* Left half (desktop): video fills column; copy centered in this column only */}
      <div className="absolute inset-0 z-0 overflow-hidden lg:relative lg:inset-auto lg:z-auto lg:flex lg:h-full lg:w-1/2 lg:min-w-0 lg:flex-shrink-0 lg:flex-col">
        <div
          className="auth-video-fallback absolute inset-0 z-0 bg-gradient-to-br from-primary-900 via-primary-800 to-primary-950"
          aria-hidden
        />
        <AuthVideo />
        <div
          className="absolute inset-0 z-[2] bg-gradient-to-t from-black/85 via-black/45 to-black/35 lg:from-black/75 lg:via-black/40 lg:to-black/30"
          aria-hidden
        />

        {/* Desktop: text + footer centered within the left half */}
        <div className="absolute inset-0 z-10 hidden lg:flex lg:items-center lg:justify-center lg:overflow-y-auto lg:overscroll-contain lg:p-8 xl:p-12">
          <div className="flex w-full max-w-md flex-col items-center text-center">
            <p className="text-lg font-bold tracking-tight text-white drop-shadow-sm md:text-xl">{SITE_NAME}</p>
            <h2 className="mt-5 text-3xl font-bold leading-tight text-white md:text-4xl">{copy.headline}</h2>
            <p className="mt-4 text-sm leading-relaxed text-white/90 md:text-base">{copy.sub}</p>
            <div className="mt-8 w-full border-t border-white/20 pt-8 text-xs text-white/80">
              <p>© {YEAR} {SITE_NAME}. All rights reserved.</p>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-1">
                <TermsLink href={termsHref} className="underline-offset-2 hover:text-white hover:underline">
                  Terms of Service
                </TermsLink>
                <PrivacyLink href={privacyHref} className="underline-offset-2 hover:text-white hover:underline">
                  Privacy Policy
                </PrivacyLink>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right half (desktop): form — on mobile, stacks above full-bleed video */}
      <section className="relative z-10 flex min-h-0 w-full flex-1 flex-col overflow-hidden  lg:h-full lg:w-1/2 lg:min-w-0 lg:border-l lg:border-border bg-card/60">
        <div className="shrink-0 px-4 pt-[max(0.75rem,env(safe-area-inset-top,0px))] text-center lg:hidden">
          <p className="text-base font-bold tracking-tight text-white drop-shadow-md ">{SITE_NAME}</p>
        </div>

        <AuthFormScrollPane>{children}</AuthFormScrollPane>
      </section>
    </div>
  );
}
