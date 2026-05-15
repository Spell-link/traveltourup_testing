"use client";

import { Link } from "@/i18n/navigation";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Building2, ChevronUp, Loader2, Lock, Shield } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { createThreeDSecureSession } from "@duffel/components";
import { isRtlLocale } from "@/lib/i18n/rtl";
import { parseIsoCurrencyAmountLine } from "@/lib/currency/format-display";
import { useCurrency } from "@/components/providers/CurrencyProvider";
import { Sheet, SheetContent, SheetTitle } from "@/components/admin_ui/ui/sheet";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { postStaysBooking } from "@/lib/http/stays.client";
import {
  StaysDuffelCardBlock,
  type StaysDuffelCardBlockHandle,
} from "@/components/hotels/StaysDuffelCardBlock";

const BOOKING_STORAGE_KEY = "booking-details";

type CheckoutStep = "guest" | "pay";
type PaymentStage = "idle" | "tokenizing" | "authenticating" | "booking";

type SessionBookingDetails = {
  type?: string;
  title?: string;
  price?: string;
  options?: { label: string; value: string }[];
  subtitle?: string;
};

type StaysQuoteSession = {
  quote_id?: string;
  total_amount?: string;
  currency?: string;
  check_in?: string;
  check_out?: string;
};

type BookedStay = {
  booking_ref_no?: string;
  id?: string;
};

/**
 * Hotel checkout uses Duffel Customer Card + 3DS direct-pay flow.
 */
export function HotelCheckoutDuffel({ quoteId }: { quoteId: string }) {
  const t = useTranslations("Hotels.checkout");
  const locale = useLocale();
  const isRtl = isRtlLocale(locale);
  const { currencyCode, formatPrice } = useCurrency();
  const bookingIdempotencyRef = useRef(
    typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `bk-${Date.now()}`,
  );
  const cardBlockRef = useRef<StaysDuffelCardBlockHandle | null>(null);

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [givenName, setGivenName] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [bornOn, setBornOn] = useState("1990-01-01");
  const [step, setStep] = useState<CheckoutStep>("guest");
  const [paymentStage, setPaymentStage] = useState<PaymentStage>("idle");
  const [cardIsValid, setCardIsValid] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);
  const [doneBooking, setDoneBooking] = useState<BookedStay | null>(null);
  const [bookingDetails, setBookingDetails] = useState<SessionBookingDetails | null>(null);
  const [staysQuoteSession, setStaysQuoteSession] = useState<StaysQuoteSession | null>(null);
  const [mobileOrderSummaryOpen, setMobileOrderSummaryOpen] = useState(false);
  const [lgUp, setLgUp] = useState<boolean | null>(null);
  
  // Dynamic Duffel component client key (generated per-session on backend)
  const [duffelClientKey, setDuffelClientKey] = useState<string>("");
  const [loadingDuffelKey, setLoadingDuffelKey] = useState(true);
  const [duffelKeyError, setDuffelKeyError] = useState<string | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    setLgUp(mq.matches);
    const onChange = () => setLgUp(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (lgUp) setMobileOrderSummaryOpen(false);
  }, [lgUp]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = sessionStorage.getItem(BOOKING_STORAGE_KEY);
      if (raw) {
        setBookingDetails(JSON.parse(raw) as SessionBookingDetails);
      }
    } catch {
      setBookingDetails(null);
    }
    try {
      const rawQuote = sessionStorage.getItem("ttu_stays_quote");
      if (rawQuote) {
        setStaysQuoteSession(JSON.parse(rawQuote) as StaysQuoteSession);
      }
    } catch {
      setStaysQuoteSession(null);
    }
  }, []);

  /**
   * Fetch temporary Duffel component client key from backend.
   * This key is generated per-session and used only for secure card tokenization.
   * The actual API key never leaves the server.
   */
  useEffect(() => {
    let isMounted = true;

    async function fetchClientKey() {
      try {
        setLoadingDuffelKey(true);
        setDuffelKeyError(null);

        const response = await fetch("/api/duffel/client-key", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!isMounted) return;

        if (!response.ok) {
          const errorData = (await response.json()) as { message?: string };
          throw new Error(
            errorData.message || `Failed to fetch Duffel client key (HTTP ${response.status})`
          );
        }

        const data = (await response.json()) as { client_key?: string };
        if (!data.client_key) {
          throw new Error("Duffel client key was not provided by the server");
        }

        if (isMounted) {
          setDuffelClientKey(data.client_key);
          console.log("[HotelCheckoutDuffel] Successfully fetched Duffel client key");
        }
      } catch (error) {
        if (isMounted) {
          const message =
            error instanceof Error
              ? error.message
              : "Failed to fetch Duffel client key. Please refresh and try again.";
          setDuffelKeyError(message);
          console.error("[HotelCheckoutDuffel] Error fetching client key:", message);
        }
      } finally {
        if (isMounted) {
          setLoadingDuffelKey(false);
        }
      }
    }

    void fetchClientKey();

    return () => {
      isMounted = false;
    };
  }, []);

  const summaryBookingLine = useMemo(() => {
    const st = (bookingDetails?.type ?? "Hotel").toLowerCase();
    const cat =
      st === "hotel" ? t("summaryTypeHotel") : st === "car" ? t("summaryTypeCar") : t("summaryTypeFlight");
    return `${cat} ${t("summaryBookingWord")}`;
  }, [bookingDetails?.type, t]);

  const summaryTitle = bookingDetails?.title ?? t("defaultSummaryTitle");

  const summaryPrimaryPrice = useMemo(() => {
    if (staysQuoteSession?.currency && staysQuoteSession?.total_amount) {
      const n = Number.parseFloat(staysQuoteSession.total_amount);
      if (Number.isFinite(n)) {
        return formatPrice(n, staysQuoteSession.currency, locale);
      }
    }
    const parsed = parseIsoCurrencyAmountLine(bookingDetails?.price);
    if (parsed) return formatPrice(parsed.amount, parsed.currency, locale);
    return bookingDetails?.price ?? "—";
  }, [bookingDetails?.price, staysQuoteSession?.currency, staysQuoteSession?.total_amount, formatPrice, locale]);

  const chargedInDuffelCopy = useMemo(() => {
    if (staysQuoteSession?.currency && staysQuoteSession?.total_amount) {
      return `${staysQuoteSession.currency} ${staysQuoteSession.total_amount}`;
    }
    return parseIsoCurrencyAmountLine(bookingDetails?.price) ? bookingDetails?.price ?? null : null;
  }, [bookingDetails?.price, staysQuoteSession?.currency, staysQuoteSession?.total_amount]);

  const showChargeBasis =
    chargedInDuffelCopy &&
    staysQuoteSession?.currency &&
    staysQuoteSession.currency.toUpperCase() !== currencyCode.toUpperCase();

  const summaryOptions = useMemo(() => {
    if (bookingDetails?.options?.length) return bookingDetails.options;
    const rows: { label: string; value: string }[] = [];
    if (staysQuoteSession?.check_in && staysQuoteSession?.check_out) {
      rows.push({
        label: t("rowLabelStay"),
        value: `${staysQuoteSession.check_in} - ${staysQuoteSession.check_out}`,
      });
    }
    if (quoteId) rows.push({ label: t("rowLabelQuote"), value: quoteId });
    return rows;
  }, [bookingDetails?.options, staysQuoteSession?.check_in, staysQuoteSession?.check_out, quoteId, t]);

  const canPreparePay = useMemo(() => {
    if (!quoteId?.trim()) return false;
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    const identityOk = Boolean(givenName.trim()) && Boolean(familyName.trim()) && /^\d{4}-\d{2}-\d{2}$/.test(bornOn);
    const phoneOk = Boolean(phone.trim());
    return emailOk && identityOk && phoneOk;
  }, [quoteId, email, phone, givenName, familyName, bornOn]);

  const isPaymentBusy = paymentStage !== "idle";
  const paymentStageLabel =
    paymentStage === "tokenizing"
      ? "Tokenizing card..."
      : paymentStage === "authenticating"
        ? "Authenticating 3DS..."
        : paymentStage === "booking"
          ? t("bookingInProgress")
          : null;

  const resetToGuestStep = useCallback(() => {
    if (isPaymentBusy) return;
    setStep("guest");
    setCardIsValid(false);
    setStepError(null);
  }, [isPaymentBusy]);

  const beginPayment = useCallback(async () => {
    setStepError(null);
    if (!quoteId?.trim()) {
      setStepError(t("errorMissingQuoteId"));
      return;
    }
    if (!canPreparePay) {
      setStepError(t("errorFillAllFields"));
      return;
    }
    if (!duffelClientKey) {
      setStepError("Duffel client key is not available. Please refresh the page and try again.");
      return;
    }
    if (isPaymentBusy) return;

    setPaymentStage("tokenizing");
    try {
      const card = await cardBlockRef.current?.tokenizeCard();
      if (!card?.card_id) {
        throw new Error("Card tokenization is not ready.");
      }

      setPaymentStage("authenticating");
      const session = await createThreeDSecureSession(
        duffelClientKey,
        card.card_id,
        quoteId.trim(),
        [],
        true,
      );

      if (session.status !== "ready_for_payment") {
        throw new Error(`3DS session is not ready for payment (${session.status}).`);
      }

      setPaymentStage("booking");
      const booked = await postStaysBooking(
        {
          quote_id: quoteId.trim(),
          email: email.trim(),
          phone_number: phone.trim(),
          guests: [
            {
              given_name: givenName.trim(),
              family_name: familyName.trim(),
              born_on: bornOn,
            },
          ],
          payment: {
            three_d_secure_session_id: session.id,
          },
        },
        bookingIdempotencyRef.current,
      );

      if (typeof window !== "undefined") {
        sessionStorage.removeItem("ttu_stays_quote");
      }
      setDoneBooking(booked as BookedStay);
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("errorBookingFailed");
      const suffix = t("errorAppendNewQuote");
      setStepError(msg.includes("expired") || msg.includes("quote") ? `${msg} ${suffix}` : msg);
    } finally {
      setPaymentStage("idle");
    }
  }, [
    quoteId,
    canPreparePay,
    duffelClientKey,
    isPaymentBusy,
    email,
    phone,
    givenName,
    familyName,
    bornOn,
    t,
  ]);

  const renderOrderSummaryCard = (sticky: boolean) => (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-card shadow-sm",
        sticky && "sticky top-24",
      )}
    >
      <div className="flex items-center gap-3 border-b border-border bg-muted px-6 py-4">
        <Building2 className="shrink-0 text-xl text-primary" aria-hidden />
        <h3 className="text-lg font-bold text-foreground">{t("orderSummaryTitle")}</h3>
      </div>
      <div className="p-6">
        <div className="mb-6">
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {summaryBookingLine}
          </p>
          <h4 className="text-xl font-bold text-foreground">{summaryTitle}</h4>
          {bookingDetails?.subtitle ? (
            <p className="mt-1 text-sm text-muted-foreground">{bookingDetails.subtitle}</p>
          ) : null}
        </div>
        <div className="mb-6 space-y-4">
          {summaryOptions.map((opt, i) => (
            <div key={`${opt.label}-${i}`} className="flex justify-between gap-2 text-sm">
              <span className="text-start text-muted-foreground">{opt.label}</span>
              <span className="max-w-[55%] text-end font-medium text-foreground">{opt.value}</span>
            </div>
          ))}
          <div className="flex justify-between gap-2 text-sm">
            <span className="text-start text-muted-foreground">{t("quoteTotalLabel")}</span>
            <span className="text-end font-medium text-foreground">{summaryPrimaryPrice}</span>
          </div>
        </div>
        <hr className="my-4 border-border border-dashed" />
        <div className="mb-2 flex items-end justify-between gap-2">
          <span className="font-medium text-muted-foreground">{t("totalAmountLabel")}</span>
          <span className="text-3xl font-bold text-primary">{summaryPrimaryPrice}</span>
        </div>
        {showChargeBasis ? <p className="text-end text-xs text-muted-foreground">{`Charged in ${chargedInDuffelCopy}`}</p> : null}
        <p className="text-end text-xs text-muted-foreground">{t("includesRoomTaxes")}</p>
      </div>
      <div className="flex items-center justify-center gap-2 bg-muted px-6 py-4 text-xs text-muted-foreground">
        <Shield className="h-4 w-4 shrink-0" aria-hidden />
        <span>{t("secureCheckout")}</span>
      </div>
    </div>
  );

  if (doneBooking && typeof doneBooking === "object" && doneBooking !== null && "booking_ref_no" in doneBooking) {
    return (
      <div
        className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-8 text-center shadow-lg"
        dir={isRtl ? "rtl" : "ltr"}
      >
        <h1 className="mb-2 text-2xl font-bold text-foreground">Booking confirmed</h1>
        <p className="mb-4 text-muted-foreground">
          Reference <strong className="text-foreground">{doneBooking.booking_ref_no ?? doneBooking.id}</strong>
        </p>
        <Link
          href={
            typeof doneBooking.id === "string" && doneBooking.id
              ? `/profile/bookings/${encodeURIComponent(doneBooking.id)}`
              : "/profile/bookings"
          }
          className="font-semibold text-primary hover:underline"
        >
          {t("confirmBooking")}
        </Link>
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          "container mx-auto sm:px-4",
          lgUp === false && "pb-[calc(5rem+env(safe-area-inset-bottom))]",
        )}
        dir={isRtl ? "rtl" : "ltr"}
      >
        <div className="mb-8 flex flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("quoteLabel")} <span className="font-mono text-xs">{quoteId}</span>
              {summaryPrimaryPrice !== "—" ? (
                <>
                  {" "}
                  {t("headerPriceSeparator")} {summaryPrimaryPrice}
                </>
              ) : null}
              {step === "pay" ? <span className="mt-1 block text-xs">Payment</span> : null}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
          <div className="space-y-6 lg:col-span-2">
            {step === "guest" ? (
              <section className="relative rounded-2xl border border-border bg-card/60 shadow-sm md:p-8 sm:px-4">
                <h2 className="mb-6 px-4 text-2xl font-bold text-foreground">{t("guestDetailsTitle")}</h2>

                {stepError ? (
                  <div className="mb-4 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {stepError}
                  </div>
                ) : null}

                <div className="space-y-6">
                  <div className="space-y-3 rounded-xl border border-border bg-card/80 p-4 md:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/80 pb-3">
                      <div>
                        <p className="text-base font-semibold text-foreground">
                          {t("guestIndex", { current: 1, total: 1 })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("quoteLabel")} <span className="font-mono">{quoteId}</span>
                        </p>
                      </div>
                      <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
                        {t("leadGuestBadge")}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Input
                        label={t("firstNameLabel")}
                        value={givenName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGivenName(e.target.value)}
                        required
                      />
                      <Input
                        label={t("lastNameLabel")}
                        value={familyName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFamilyName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      <Input
                        label={t("dobLabel")}
                        type="date"
                        value={bornOn}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBornOn(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-3 border-t border-border/60 pt-4 sm:col-span-2">
                      <h3 className="text-sm font-semibold text-foreground">{t("contactDetailsTitle")}</h3>
                      <p className="text-xs text-muted-foreground">{t("contactDetailsHint")}</p>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Input
                          label={t("emailLabel")}
                          type="email"
                          autoComplete="email"
                          value={email}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                          required
                        />
                        <Input
                          label={t("phoneLabel")}
                          type="tel"
                          placeholder={t("phonePlaceholder")}
                          autoComplete="tel"
                          value={phone}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 px-2">
                    <Button
                      type="button"
                      variant="primary"
                      size="lg"
                      className="inline-flex w-full items-center justify-center gap-2 py-4 text-base font-bold shadow-lg sm:w-auto"
                      disabled={!canPreparePay}
                      onClick={() => setStep("pay")}
                    >
                      Continue to payment
                    </Button>
                    {!canPreparePay ? (
                      <p className="mt-2 text-xs text-muted-foreground">{t("hintIncompleteForm")}</p>
                    ) : (
                      <p className="mt-2 text-xs text-muted-foreground">{t("hintChargesDuffel")}</p>
                    )}
                  </div>
                </div>
              </section>
            ) : null}

            {step === "pay" ? (
              <section className="relative rounded-2xl border border-border bg-card/60 p-6 shadow-sm md:p-8">
                {isPaymentBusy ? (
                  <div
                    className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl bg-background/80 backdrop-blur-sm"
                    role="status"
                    aria-live="polite"
                    aria-busy
                  >
                    <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
                    <span className="text-sm font-medium text-foreground">{paymentStageLabel}</span>
                  </div>
                ) : null}

                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">Payment</h2>
                    <p className="text-sm text-muted-foreground">Use a customer card and complete 3DS authentication.</p>
                  </div>
                  <Button type="button" variant="ghost" onClick={resetToGuestStep} disabled={isPaymentBusy}>
                    Back
                  </Button>
                </div>

                {stepError ? <p className="mb-4 text-sm text-destructive">{stepError}</p> : null}

                <div className="mb-6 flex items-start gap-3 rounded-xl bg-primary/10 p-4 text-sm text-foreground">
                  <Lock className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                  <p>Secure payment powered by Duffel card tokenization and 3DS.</p>
                </div>

                {loadingDuffelKey ? (
                  <div className="rounded-xl border border-border/60 bg-background/50 p-4">
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
                      <span className="text-sm text-muted-foreground">Loading payment method...</span>
                    </div>
                  </div>
                ) : duffelKeyError ? (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                    {duffelKeyError}
                  </div>
                ) : duffelClientKey ? (
                  <StaysDuffelCardBlock
                    ref={cardBlockRef}
                    clientKey={duffelClientKey}
                    onValidityChange={setCardIsValid}
                  />
                ) : (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                    Duffel client key is not available. Please refresh the page and try again.
                  </div>
                )}

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    className="inline-flex w-full items-center justify-center gap-2 py-4 text-base font-bold shadow-lg sm:w-auto"
                    disabled={!cardIsValid || isPaymentBusy || !duffelClientKey || loadingDuffelKey || !!duffelKeyError}
                    onClick={() => void beginPayment()}
                  >
                    {paymentStage === "idle" ? "Book stay" : paymentStageLabel}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Card tokenization, 3DS authentication, and booking creation happen in one secure flow.
                  </p>
                </div>
              </section>
            ) : null}
          </div>

          {(lgUp === true || lgUp === null) && (
            <div className="hidden lg:block lg:col-span-1">{renderOrderSummaryCard(true)}</div>
          )}
        </div>
      </div>

      {lgUp === false ? (
        <>
          <div
            dir={isRtl ? "rtl" : "ltr"}
            className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 shadow-[0_-4px_24px_rgba(0,0,0,0.1)] backdrop-blur supports-[backdrop-filter]:bg-card/90 lg:hidden dark:shadow-[0_-4px_24px_rgba(0,0,0,0.35)]"
          >
            <div className="mx-auto w-full max-w-6xl px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2.5">
              <button
                type="button"
                onClick={() => setMobileOrderSummaryOpen(true)}
                className="flex w-full min-w-0 items-center justify-between gap-2 rounded-lg px-0.5 py-1 text-start transition-opacity hover:opacity-90 active:opacity-80"
                aria-expanded={mobileOrderSummaryOpen}
                aria-label={t("viewOrderSummaryAria")}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {t("totalAmountLabel")}
                  </p>
                  <p className="truncate text-base font-bold text-primary sm:text-lg">{summaryPrimaryPrice}</p>
                </div>
                <ChevronUp className="h-5 w-5 shrink-0 text-primary transition-transform duration-200" aria-hidden />
              </button>
            </div>
          </div>

          <Sheet open={mobileOrderSummaryOpen} onOpenChange={setMobileOrderSummaryOpen}>
            <SheetContent
              side="bottom"
              className="flex h-auto max-h-[90vh] flex-col gap-0 overflow-hidden rounded-t-2xl border-0 p-0 max-sm:px-0"
            >
              <SheetTitle className="sr-only">{t("sheetOrderSummaryTitle")}</SheetTitle>
              <div className="max-h-[min(90vh,860px)] overflow-y-auto overscroll-contain px-3 py-1 pb-6 pt-0 sm:px-4 dropdown-scrollbar">
                {renderOrderSummaryCard(false)}
              </div>
            </SheetContent>
          </Sheet>
        </>
      ) : null}
    </>
  );
}