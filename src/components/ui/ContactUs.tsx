"use client";

import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import {
  Facebook,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  Phone,
  SendHorizontal,
  ThumbsUp,
  Twitter,
} from "lucide-react";

import { useAuth } from "@/components/providers/AuthProvider";
import { Input } from "./Input";
import AnimatedUnderline from "./AnimatedUnderline";
import { useLocale, useTranslations } from "next-intl";
import { isRtlLocale } from "@/lib/i18n/rtl";

const socialLinks = [
  { msgKey: "socialInstagram" as const, href: process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM_URL || "", icon: Instagram },
  { msgKey: "socialFacebook" as const, href: process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK_URL || "", icon: Facebook },
  { msgKey: "socialTwitter" as const, href: process.env.NEXT_PUBLIC_SOCIAL_TWITTER_URL || "", icon: Twitter },
  { msgKey: "socialLinkedIn" as const, href: process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN_URL || "", icon: Linkedin },
];

type SubmitStatus = "idle" | "loading" | "success" | "error";

function applyUserToForm(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}): { firstName: string; lastName: string; email: string } {
  const meta = user.user_metadata ?? {};
  const fn1 = String(meta.first_name ?? "").trim();
  const ln1 = String(meta.last_name ?? "").trim();
  if (fn1 || ln1) {
    return { firstName: fn1, lastName: ln1, email: user.email ?? "" };
  }
  const full = String(meta.full_name ?? "").trim();
  if (full) {
    const parts = full.split(/\s+/);
    return {
      firstName: parts[0] ?? "",
      lastName: parts.slice(1).join(" "),
      email: user.email ?? "",
    };
  }
  return { firstName: "", lastName: "", email: user.email ?? "" };
}

export default function ContactUs() {
  const { user, loading: authLoading } = useAuth();
  const t = useTranslations("Contact");
  const locale = useLocale();
  const isRtl = isRtlLocale(locale);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const prefillFromUser = useCallback(() => {
    if (!user) return;
    const { firstName: f, lastName: l, email: e } = applyUserToForm(user);
    setFirstName(f);
    setLastName(l);
    setEmail(e);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    prefillFromUser();
  }, [authLoading, prefillFromUser]);

  const clearSuccessOnEdit = () => {
    if (status === "success") setStatus("idle");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setStatus("loading");

    const name = `${firstName} ${lastName}`.trim();
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email: email.trim(),
          message: message.trim(),
        }),
      });

      if (res.status === 429) {
        const retry = res.headers.get("Retry-After");
        const sec = retry ? Math.max(1, parseInt(retry, 10) || 60) : 60;
        setErrorMessage(t("rateLimit", { seconds: sec }));
        setStatus("error");
        return;
      }

      const data: unknown = await res.json().catch(() => ({}));
      const err =
        data &&
        typeof data === "object" &&
        "error" in data &&
        typeof (data as { error: unknown }).error === "string"
          ? (data as { error: string }).error
          : t("errorGeneric");

      if (!res.ok) {
        setErrorMessage(err);
        setStatus("error");
        return;
      }

      setStatus("success");
      setMessage("");
      setFirstName("");
      setLastName("");
      setEmail("");
    } catch {
      setErrorMessage(t("errorSendFailed"));
      setStatus("error");
    }
  };

  return (
    <section className="bg-background" dir={isRtl ? "rtl" : "ltr"}>
      <div className="container mx-auto px-4 md:px-10 ">
        <div className="grid grid-cols-1 gap-10 border border-border/50 bg-card/60 p-2 shadow-sm backdrop-blur-sm md:p-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-6 xl:p-14">
          <div className="flex flex-col  gap-4">
            <div className="space-y-6">
              <div className="space-y-3">
                <AnimatedUnderline title={t("heading")} rtl={isRtl} />
              </div>

              <div className="space-y-2 text-start text-base leading-8 text-muted-foreground md:max-w-md md:text-lg">
                <p className="text-lg font-medium text-foreground md:text-xl">
                  {t("subheading")}
                </p>
                <p>{t("intro")}</p>
              </div>
            </div>

            <div className="">
              <div className="space-y-2 text-start text-sm text-muted-foreground sm:text-base">
                <div className="flex items-start gap-3">
                  <div className=" flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div className="text-start">
                    <p>{t("addressLine1")}</p>
                    <p>{t("addressLine2")}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Phone className="h-4 w-4" />
                  </div>
                  <a href="tel:+1 800 443 0456" className="text-start underline decoration-primary/40 underline-offset-4 transition-colors hover:text-primary" >+1 800 443 0456</a>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Mail className="h-4 w-4" />
                  </div>
                  <a
                    href="mailto:support@traveltourup.com"
                    className="text-start underline decoration-primary/40 underline-offset-4 transition-colors hover:text-primary"
                  >
                    support@traveltourup.com
                  </a>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 mt-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-all duration-200">
                  <ThumbsUp className="h-4 w-4" />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {socialLinks.map(({ msgKey, href, icon: Icon }) => (
                    <a
                      key={msgKey}
                      target="_blank"
                      rel="noopener noreferrer"
                      href={href}
                      aria-label={t(msgKey)}
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-all duration-200 hover:bg-primary hover:text-primary-foreground "
                    >
                      <Icon className="h-4 w-4" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="grid w-full gap-5 self-center text-start"
            noValidate
          >
            {status === "success" && (
              <p className="text-start text-sm font-medium text-green-600 dark:text-green-400" role="status">
                {t("successMessage")}
              </p>
            )}
            {status === "error" && errorMessage && (
              <p className="text-start text-sm font-medium text-destructive" role="alert">
                {errorMessage}
              </p>
            )}

            {/* TODO: captcha (Turnstile / hCaptcha) */}
            <div className="hidden" aria-hidden data-contact-captcha-placeholder />

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Input
                name="firstName"
                label={t("firstNameLabel")}
                placeholder={t("firstNamePlaceholder")}
                value={firstName}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  clearSuccessOnEdit();
                  setFirstName(e.target.value);
                }}
                autoComplete="given-name"
              />

              <Input
                name="lastName"
                label={t("lastNameLabel")}
                placeholder={t("lastNamePlaceholder")}
                value={lastName}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  clearSuccessOnEdit();
                  setLastName(e.target.value);
                }}
                autoComplete="family-name"
              />
            </div>

            <Input
              name="email"
              type="email"
              label={t("emailLabel")}
              icon={<Mail className="h-4 w-4" />}
              placeholder={t("emailPlaceholder")}
              value={email}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                clearSuccessOnEdit();
                setEmail(e.target.value);
              }}
              required
              autoComplete="email"
            />

            <Input
              as="textarea"
              name="message"
              rows={5}
              label={t("messageLabel")}
              placeholder={t("messagePlaceholder")}
              className="min-h-[150px] resize-none py-3"
              value={message}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => {
                clearSuccessOnEdit();
                setMessage(e.target.value);
              }}
              required
            />

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={status === "loading"}
                className="inline-flex min-w-28 items-center justify-center gap-2 rounded-lg bg-primary px-7 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-60"
              >
                <span>{status === "loading" ? t("sending") : t("send")}</span>
                <SendHorizontal className={`h-4 w-4 ${isRtl ? "-scale-x-100" : ""}`} />
              </button>
            </div>
          </form>
        </div>
        <div className="mt-2 w-full  overflow-hidden border border-border">
          <iframe
            src="https://www.google.com/maps?q=Lahore&output=embed"
            className="h-[300px] w-full"
            title={t("mapIframeTitle")}
            loading="lazy"
          ></iframe>
        </div>
      </div>
    </section>
  );
}
