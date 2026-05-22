"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { isRtlLocale } from "@/lib/i18n/rtl";
import { rtlDirProp, rtlTypographyClass } from "@/lib/i18n/rtl-typography";
import { MapPin, Phone, Mail, Check, Twitter, Facebook, Instagram, Linkedin } from "lucide-react";

import type { FooterNavLink } from "@/types";
import { useTheme } from "@/components/ThemeProvider";
import { VARIANT_LOGOS, DEFAULT_LOGO } from "@/config/logos";
import {
  QUICK_LINKS,
  SERVICES,
  SOCIAL_LINKS,
  CONTACT,
  PAYMENT_METHODS,
} from "@/config/footer.config";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const SocialIcon = ({
  icon,
  className,
}: {
  icon: string;
  className?: string;
}) => {
  const icons: Record<string, React.ReactNode> = {
    twitter: <Twitter className={className} strokeWidth={2} />,
    facebook: <Facebook className={className} strokeWidth={2} />,
    instagram: <Instagram className={className} strokeWidth={2} />,
    linkedin: <Linkedin className={className} strokeWidth={2} />,
  };
  return icons[icon] || null;
};

const LinkColumn = ({
  title,
  links,
  t,
}: {
  title: string;
  links: FooterNavLink[];
  t: (key: string) => string;
}) => (
  <div>
    <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
      {title}
    </h3>
    <ul className="space-y-3">
      {links.map(({ href, labelKey }) => (
        <li key={`${href}-${labelKey}`}>
          <Link
            href={href}
            className="text-muted-foreground hover:text-primary text-sm transition-colors duration-200"
          >
            {t(labelKey)}
          </Link>
        </li>
      ))}
    </ul>
  </div>
);

export default function Footer() {
  const locale = useLocale();
  const rtl = isRtlLocale(locale);
  const t = useTranslations("Footer");
  const { themeVariant } = useTheme();
  const logo = VARIANT_LOGOS[themeVariant] || DEFAULT_LOGO;
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubscribe = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    const trimmed = email.trim();
    if (!trimmed) {
      setError(t("newsletterEmailRequired"));
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setError(t("newsletterEmailInvalid"));
      return;
    }
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setIsLoading(false);
    setSubscribed(true);
    setEmail("");
  };

  return (
    <footer className="bg-background border-t border-border">
      {/* Newsletter - Full-width top section */}
      {/* <div className="bg-gradient-to-r from-blue-600 to-blue-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-12">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="text-center lg:text-left">
              <h3 className="text-xl font-bold text-foreground mb-2">
                Stay in the loop
              </h3>
              <p className="text-primary/80 text-sm">
                Get exclusive deals, travel tips & inspiration delivered to your inbox.
              </p>
            </div>
            {subscribed ? (
              <div className="flex items-center justify-center lg:justify-end gap-3">
                <div className="w-10 h-10 rounded-full bg-background/20 flex items-center justify-center flex-shrink-0">
                  <CheckIcon className="w-5 h-5 text-foreground" />
                </div>
                <div>
                  <p className="text-foreground font-semibold">You&apos;re all set!</p>
                  <p className="text-primary/80 text-sm">Check your inbox for a welcome email.</p>
                </div>
              </div>
            ) : (
              <div className="w-full lg:w-auto lg:min-w-[380px]">
                <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <div className="relative flex-1 min-w-0">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(""); }}
                      placeholder="Enter your email"
                      disabled={isLoading}
                      className={`w-full pl-4 pr-11 py-3.5 rounded-xl border text-foreground placeholder-muted-foreground text-sm bg-background transition-all
                        ${error ? "border-destructive focus:ring-destructive/50" : "border-transparent focus:ring-white/30"}
                        focus:outline-none focus:ring-2 disabled:opacity-70 disabled:cursor-not-allowed`}
                      aria-label="Email for newsletter"
                      aria-invalid={!!error}
                      aria-describedby={error ? "newsletter-error" : undefined}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                      <EnvelopeIcon className="w-5 h-5" />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-6 py-3.5 rounded-xl bg-background text-primary font-semibold text-sm hover:bg-muted transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 flex-shrink-0"
                  >
                    {isLoading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                        Subscribing...
                      </>
                    ) : (
                      "Subscribe"
                    )}
                  </button>
                </form>
                {error && (
                  <p id="newsletter-error" className="text-destructive/80 text-sm mt-2 text-center sm:text-left">
                    {error}
                  </p>
                )}
                <p className="text-muted-foreground text-xs mt-3 text-center sm:text-left">
                  No spam. Unsubscribe anytime.
                </p>
              </div>
            )}
          </div>
        </div>
      </div> */}

      {/* Main footer content */}
      <div className="container mx-auto px-4 md:px-10 py-14 lg:py-8 md:py-16  ">
        {/* Newsletter - top section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-6 border-b border-border pb-6">
          <div
            dir={rtlDirProp(locale)}
            className={cn(!rtl && "text-center lg:text-left", rtl && rtlTypographyClass(locale))}
          >
            <h3 className="text-xl font-bold text-foreground mb-2">
              {t("stayTitle")}
            </h3>
            <p className="text-muted-foreground text-sm">{t("staySubtitle")}</p>
          </div>
          {subscribed ? (
            <div className="flex items-center justify-center lg:justify-end gap-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <Check className="w-5 h-5 text-foreground" strokeWidth={2} />
              </div>
              <div>
                <p className="text-foreground font-semibold">{t("subscribedTitle")}</p>
                <p className="text-muted-foreground text-sm">{t("subscribedSubtitle")}</p>
              </div>
            </div>
          ) : (
            <div className="w-full lg:w-auto lg:min-w-[380px]">
              <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Input
                  id="newsletter-email"
                  type="email"
                  value={email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  placeholder={t("emailPlaceholder")}
                  disabled={isLoading}
                  error={error || undefined}
                  errorId="newsletter-error"
                  aria-label={t("newsletterEmailAria")}
                  wrapperClassName="flex-1 min-w-0"
                  className="pr-11"
                  suffix={<Mail className="h-5 w-5 text-muted-foreground" strokeWidth={2} />}
                />
                <Button
                  type="submit"
                  disabled={isLoading}
                  variant="primary"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
                      {t("subscribing")}
                    </>
                  ) : (
                    t("subscribe")
                  )}
                </Button>
              </form>
              <p
                dir={rtlDirProp(locale)}
                className={cn(
                  "text-muted-foreground text-xs mt-3",
                  rtl ? rtlTypographyClass(locale) : "text-center sm:text-left",
                )}
              >
                {t("noSpam")}
              </p>
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8">
          {/* Brand column - spans 4 on large */}
          <div className="lg:col-span-4">
            <Link href="/" className="inline-block">
              <Image
                src={logo}
                alt={t("brandAlt")}
                width={180}
                height={80}
                className="h-14 w-auto transition-transform duration-300 scale-[1.2] hover:scale-[1.3]"
              />
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mb-6">
              {t("tagline")}
            </p>
            {/* Social links */}
            <div className="flex gap-3">
              {SOCIAL_LINKS.map(({ href, labelKey, icon }) => (
                <a
                  key={icon}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t(labelKey)}
                  className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-200"
                >
                  <SocialIcon icon={icon} className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links + Services — one row on small screens; split columns on lg */}
          <div className="grid min-w-0 grid-cols-2 gap-6 sm:gap-8 lg:contents">
            <div className="min-w-0 lg:col-span-2">
              <LinkColumn title={t("quickLinksTitle")} links={QUICK_LINKS} t={t} />
            </div>
            <div className="min-w-0 lg:col-span-2">
              <LinkColumn title={t("servicesTitle")} links={SERVICES} t={t} />
            </div>
          </div>

          {/* Contact - spans 4 */}
          <div className="lg:col-span-4 sm:col-span-2">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
              {t("contactTitle")}
            </h3>
            <ul className="space-y-4">
              {/* <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" strokeWidth={2} />
                <span className="text-muted-foreground text-sm">
                  {CONTACT.address}
                  <br />
                  {CONTACT.addressLine2}
                </span>
              </li> */}
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-primary flex-shrink-0" strokeWidth={2} />
                <a href={`tel:${CONTACT.phone.replace(/\s/g, "")}`} className="text-muted-foreground hover:text-primary text-sm transition-colors">
                  {CONTACT.phone}
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-primary flex-shrink-0" strokeWidth={2} />
                <a href={`mailto:${CONTACT.email}`} className="text-muted-foreground hover:text-primary text-sm transition-colors">
                  {CONTACT.email}
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-border bg-muted">
        <div className="container mx-auto px-4 md:px-10 py-6">
          <div className="flex flex-col gap-6 md:flex-row items-center md:items-center md:justify-between">
            {/* Copyright */}
            <p className="text-muted-foreground text-sm">
              © {new Date().getFullYear()} {t("copyright")}
            </p>

            {/* Payment methods */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                {t("weAccept")}
              </span>
              <div className="flex gap-2">
                {PAYMENT_METHODS.map((method) => (
                  <div
                    key={method}
                    className="px-3 py-1.5 bg-muted border border-border rounded-lg text-xs font-semibold text-muted-foreground shadow-sm"
                  >
                    {method}
                  </div>
                ))}
              </div>
            </div>

            {/* Legal links */}
            <div className="flex flex-wrap gap-6">
              <Link
                href="/privacy"
                className="text-muted-foreground hover:text-primary text-sm transition-colors"
              >
                {t("privacy")}
              </Link>
              <Link
                href="/terms"
                className="text-muted-foreground hover:text-primary text-sm transition-colors"
              >
                {t("terms")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

