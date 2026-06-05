"use client";

import { useRouter } from "@/i18n/navigation";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { ChevronUp, Loader2, Lock } from "lucide-react";
import { HotelCheckoutAdditionalInfo } from "@/components/hotels/checkout/HotelCheckoutAdditionalInfo";
import { HotelCheckoutCancellationPolicy } from "@/components/hotels/checkout/HotelCheckoutCancellationPolicy";
import { HotelCheckoutContactSection } from "@/components/hotels/checkout/HotelCheckoutContactSection";
import { HotelCheckoutGuestForm } from "@/components/hotels/checkout/HotelCheckoutGuestForm";
import { HotelCheckoutOrderSummary } from "@/components/hotels/checkout/HotelCheckoutOrderSummary";
import { HotelCheckoutRecap } from "@/components/hotels/checkout/HotelCheckoutRecap";
import { useLocale, useTranslations } from "next-intl";
import { isRtlLocale } from "@/lib/i18n/rtl";
import { parseIsoCurrencyAmountLine } from "@/lib/currency/format-display";
import { useCurrency } from "@/components/providers/CurrencyProvider";
import { Sheet, SheetContent, SheetTitle } from "@/components/admin_ui/ui/sheet";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import {
  HotelBookingSuccessDialog,
  type HotelBookingSuccessPayload,
} from "@/components/hotels/HotelBookingSuccessDialog";
import {
  postStaysBooking,
  postStaysCheckoutPrepare,
  refreshStaysQuoteForCheckout,
} from "@/lib/http/stays.client";
import {
  isStaysQuoteExpired,
  readStaysQuoteSession,
  writeStaysQuoteSession,
  type StaysQuoteSession,
} from "@/lib/stays/stays-quote-session";
import { StripePaymentForm } from "@/components/payments/StripePaymentForm";
import {
  collectStaysCheckoutGuestIssues,
  normalizeStaysCheckoutGuestPayload,
} from "@/lib/validations/stays-checkout-issues";
import {
  emptyGuestRows,
  requiredGuestCount,
  type StaysCheckoutGuestFormRow,
} from "@/lib/stays/stays-checkout-occupancy";
import { staysBookingBodySchema } from "@/lib/validations/stays.schema";
import type { StaysCheckoutPrepareResponse } from "@/lib/validations/stays.schema";
import { isSupportedDisplayCurrency } from "@/lib/currency/constants";
import { ApiRequestError } from "@/lib/http/api-client";
import {
  buildStripePaymentReturnUrl,
  clearStaysCheckoutSession,
  loadStaysCheckoutSession,
  readStripeRedirectParams,
  saveStaysCheckoutSession,
  stripStripeRedirectParamsFromPath,
} from "@/lib/payments/stripe-checkout-redirect";

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ?? "";

const BOOKING_STORAGE_KEY = "booking-details";

type CheckoutStep = "guest" | "pay";
type PaymentStage = "idle" | "preparing" | "booking";

type SessionBookingDetails = {
  type?: string;
  title?: string;
  price?: string;
  options?: { label: string; value: string }[];
  subtitle?: string;
};

function stayDatesFromQuoteSession(session: StaysQuoteSession | null) {
  if (session?.check_in && session?.check_out) {
    return { check_in_date: session.check_in, check_out_date: session.check_out };
  }
  return {};
}

function staysCheckoutErrorMessage(e: unknown, t: (key: string) => string): string {
  if (e instanceof ApiRequestError) {
    const code = e.details?.code;
    if (code === "STAYS_RATE_UNAVAILABLE" || code === "QUOTE_STALE" || code === "QUOTE_EXPIRED") {
      return `${e.message} ${t("errorRateUnavailableAction")}`;
    }
    if (/expired|unavailable|no longer available/i.test(e.message)) {
      return `${e.message} ${t("errorAppendNewQuote")}`;
    }
    return e.message;
  }
  const msg = e instanceof Error ? e.message : "";
  if (/expired|unavailable|no longer available/i.test(msg)) {
    return `${msg} ${t("errorAppendNewQuote")}`;
  }
  return msg || t("errorBookingFailed");
}

/** Hotel checkout: Stripe authorize → Duffel Balance book → capture. */
export function HotelCheckoutDuffel({ quoteId }: { quoteId: string }) {
  const t = useTranslations("Hotels.checkout");
  const locale = useLocale();
  const router = useRouter();
  const isRtl = isRtlLocale(locale);
  const { currencyCode, formatPrice } = useCurrency();
  const bookingIdempotencyRef = useRef(
    typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `bk-${Date.now()}`,
  );
  const prepareIdempotencyRef = useRef(
    typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `prep-${Date.now()}`,
  );

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [guests, setGuests] = useState<StaysCheckoutGuestFormRow[]>([]);
  const [specialRequests, setSpecialRequests] = useState("");
  const [loyaltyNumber, setLoyaltyNumber] = useState("");
  const [step, setStep] = useState<CheckoutStep>("guest");
  const [paymentStage, setPaymentStage] = useState<PaymentStage>("idle");
  const [fieldIssues, setFieldIssues] = useState<{ path: string; message: string }[]>([]);
  const [stepError, setStepError] = useState<string | null>(null);
  const [doneBooking, setDoneBooking] = useState<HotelBookingSuccessPayload | null>(null);
  const [bookingDetails, setBookingDetails] = useState<SessionBookingDetails | null>(null);
  const [staysQuoteSession, setStaysQuoteSession] = useState<StaysQuoteSession | null>(null);
  const [prepareResult, setPrepareResult] = useState<StaysCheckoutPrepareResponse | null>(null);
  const [mobileOrderSummaryOpen, setMobileOrderSummaryOpen] = useState(false);
  const [lgUp, setLgUp] = useState<boolean | null>(null);
  const [handlingRedirectReturn, setHandlingRedirectReturn] = useState(false);
  const redirectReturnHandledRef = useRef(false);

  const stripeReturnUrl = useMemo(
    () => (typeof window !== "undefined" ? buildStripePaymentReturnUrl(quoteId) : ""),
    [quoteId],
  );

  const guestPayload = useCallback(() => {
    const raw = {
      email: email.trim(),
      phone_number: phone.trim(),
      guests,
      accommodation_special_requests: specialRequests,
      loyalty_programme_account_number: loyaltyNumber,
    };
    return normalizeStaysCheckoutGuestPayload(raw, staysQuoteSession);
  }, [email, phone, guests, specialRequests, loyaltyNumber, staysQuoteSession]);

  const persistCheckoutSession = useCallback(
    (prepared: StaysCheckoutPrepareResponse, effectiveQuoteId: string) => {
      saveStaysCheckoutSession({
        guest: guestPayload(),
        prepareResult: prepared,
        quoteId: effectiveQuoteId,
        bookingIdempotencyKey: bookingIdempotencyRef.current,
      });
    },
    [guestPayload],
  );

  const syncQuoteSessionFromPrepare = useCallback(
    (prepared: StaysCheckoutPrepareResponse, prior: StaysQuoteSession | null) => {
      if (!prior?.rate_id || prepared.quote_id === prior.quote_id) return prior;
      const next: StaysQuoteSession = { ...prior, quote_id: prepared.quote_id };
      if (typeof window !== "undefined") {
        sessionStorage.setItem("ttu_stays_quote", JSON.stringify(next));
      }
      setStaysQuoteSession(next);
      return next;
    },
    [],
  );

  const ensureClientQuoteFresh = useCallback(async (): Promise<{
    quoteId: string;
    rateId: string | undefined;
    session: StaysQuoteSession | null;
  }> => {
    const session = readStaysQuoteSession();
    const rateId = session?.rate_id?.trim();
    if (!session || !rateId) {
      return { quoteId: quoteId.trim(), rateId: undefined, session };
    }
    if (!isStaysQuoteExpired(session.expires_at) && session.quote_id === quoteId.trim()) {
      return { quoteId: quoteId.trim(), rateId, session };
    }
    const fresh = await refreshStaysQuoteForCheckout(rateId);
    const next = writeStaysQuoteSession({
      quote: fresh,
      checkIn: session.check_in,
      checkOut: session.check_out,
      searchResultId: session.search_result_id,
    });
    setStaysQuoteSession(next);
    if (fresh.quote_id !== quoteId.trim()) {
      router.replace(`/hotels/payment?quote_id=${encodeURIComponent(fresh.quote_id)}`);
    }
    return { quoteId: fresh.quote_id, rateId, session: next };
  }, [quoteId, router]);

  const completeBookingWithSession = useCallback(
    async (
      prepared: StaysCheckoutPrepareResponse,
      guest: ReturnType<typeof guestPayload>,
      quoteSession: StaysQuoteSession | null,
    ) => {
      setStepError(null);
      setPaymentStage("booking");
      try {
        const { quoteId: effectiveQuoteId, rateId } = await ensureClientQuoteFresh();
        const body = staysBookingBodySchema.parse({
          ...guest,
          quote_id: effectiveQuoteId,
          rate_id: rateId,
          checkout_payment_id: prepared.checkout_payment_id,
          ...stayDatesFromQuoteSession(quoteSession),
        });
        const booked = await postStaysBooking(body, bookingIdempotencyRef.current);
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("ttu_stays_quote");
          clearStaysCheckoutSession();
        }
        setDoneBooking(booked as HotelBookingSuccessPayload);
      } catch (e) {
        setStepError(staysCheckoutErrorMessage(e, t));
      } finally {
        setPaymentStage("idle");
      }
    },
    [ensureClientQuoteFresh, t],
  );

  useEffect(() => {
    if (redirectReturnHandledRef.current || typeof window === "undefined") return;

    const { redirectStatus, paymentIntentClientSecret } = readStripeRedirectParams();
    if (!redirectStatus || !paymentIntentClientSecret) return;

    redirectReturnHandledRef.current = true;
    setHandlingRedirectReturn(true);
    setStep("pay");

    const cleanRedirectParams = () => {
      router.replace(stripStripeRedirectParamsFromPath());
    };

    void (async () => {
      try {
        if (redirectStatus !== "succeeded") {
          setStepError("Payment was not completed. Please try again.");
          return;
        }

        const session = loadStaysCheckoutSession();
        if (!session || session.quoteId !== quoteId.trim()) {
          setStepError("Checkout session expired. Please enter guest details and try again.");
          return;
        }

        setEmail(session.guest.email);
        setPhone(session.guest.phone_number);
        setGuests(
          session.guest.guests.length > 0
            ? session.guest.guests.map((g) => ({
                given_name: g.given_name,
                family_name: g.family_name,
                born_on: g.born_on ?? "",
              }))
            : emptyGuestRows(
                requiredGuestCount({
                  adults: staysQuoteSession?.adults,
                  children: staysQuoteSession?.children,
                  rooms: staysQuoteSession?.rooms,
                }),
                staysQuoteSession,
              ),
        );
        setSpecialRequests(session.guest.accommodation_special_requests ?? "");
        setLoyaltyNumber(session.guest.loyalty_programme_account_number ?? "");
        setPrepareResult(session.prepareResult);
        bookingIdempotencyRef.current = session.bookingIdempotencyKey;

        if (!stripePublishableKey) {
          setStepError("Stripe is not configured.");
          return;
        }

        const stripe = await loadStripe(stripePublishableKey);
        if (!stripe) {
          setStepError("Could not load Stripe.");
          return;
        }

        const { paymentIntent, error } = await stripe.retrievePaymentIntent(paymentIntentClientSecret);
        if (error) {
          setStepError(error.message ?? "Could not verify payment.");
          return;
        }
        if (
          paymentIntent?.status !== "requires_capture" &&
          paymentIntent?.status !== "succeeded"
        ) {
          setStepError(`Payment not ready (${paymentIntent?.status ?? "unknown"}).`);
          return;
        }

        await completeBookingWithSession(
          session.prepareResult,
          session.guest,
          readStaysQuoteSession() ?? staysQuoteSession,
        );
      } finally {
        cleanRedirectParams();
        setHandlingRedirectReturn(false);
      }
    })();
  }, [quoteId, router, completeBookingWithSession, staysQuoteSession]);

  useEffect(() => {
    if (doneBooking) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [doneBooking]);

  const handleBookingSuccessClose = useCallback(() => {
    setDoneBooking(null);
    router.push("/hotels");
  }, [router]);

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
      if (raw) setBookingDetails(JSON.parse(raw) as SessionBookingDetails);
    } catch {
      setBookingDetails(null);
    }
    const session = readStaysQuoteSession();
    setStaysQuoteSession(session);
    const count = requiredGuestCount({
      adults: session?.adults,
      children: session?.children,
      rooms: session?.rooms,
    });
    setGuests(emptyGuestRows(count, session));
  }, []);

  const summaryPrimaryPrice = useMemo(() => {
    const chargePricing = prepareResult?.pricing;
    if (chargePricing) {
      const n = Number.parseFloat(chargePricing.customer_total);
      if (Number.isFinite(n)) {
        return formatPrice(n, chargePricing.charge_currency, locale);
      }
    }
    if (staysQuoteSession?.currency && staysQuoteSession?.total_amount) {
      const n = Number.parseFloat(staysQuoteSession.total_amount);
      if (Number.isFinite(n)) {
        return formatPrice(n, staysQuoteSession.currency, locale);
      }
    }
    const parsed = parseIsoCurrencyAmountLine(bookingDetails?.price);
    if (parsed) return formatPrice(parsed.amount, parsed.currency, locale);
    return bookingDetails?.price ?? "—";
  }, [bookingDetails?.price, prepareResult?.pricing, staysQuoteSession, formatPrice, locale]);

  const isPaymentBusy = paymentStage !== "idle" || handlingRedirectReturn;
  const paymentStageLabel =
    paymentStage === "preparing"
      ? "Preparing checkout…"
      : paymentStage === "booking"
        ? t("bookingInProgress")
        : null;

  const successChargeDisplay = useMemo(() => {
    const cc = doneBooking?.guest_data?.customer_charge;
    if (cc?.amount && cc?.currency) {
      const n = Number.parseFloat(cc.amount);
      if (Number.isFinite(n)) return formatPrice(n, cc.currency, locale);
    }
    const chargePricing = prepareResult?.pricing;
    if (chargePricing) {
      const n = Number.parseFloat(chargePricing.customer_total);
      if (Number.isFinite(n)) return formatPrice(n, chargePricing.charge_currency, locale);
    }
    return null;
  }, [doneBooking, prepareResult?.pricing, formatPrice, locale]);

  const loyaltySupported = Boolean(staysQuoteSession?.supported_loyalty_programme);

  const continueToPayment = useCallback(async () => {
    setStepError(null);
    setFieldIssues([]);
    const issues = collectStaysCheckoutGuestIssues(
      {
        email,
        phone_number: phone,
        guests,
        accommodation_special_requests: specialRequests,
        loyalty_programme_account_number: loyaltyNumber,
      },
      staysQuoteSession,
    );
    if (issues.length > 0) {
      setFieldIssues(issues);
      setStepError(t("errorFillAllFields"));
      return;
    }
    setPaymentStage("preparing");
    try {
      const { quoteId: effectiveQuoteId, rateId, session } = await ensureClientQuoteFresh();
      const prepared = await postStaysCheckoutPrepare(
        {
          quote_id: effectiveQuoteId,
          rate_id: rateId,
          customer_currency: isSupportedDisplayCurrency(currencyCode)
            ? currencyCode
            : undefined,
        },
        prepareIdempotencyRef.current,
      );
      setPrepareResult(prepared);
      syncQuoteSessionFromPrepare(prepared, session);
      persistCheckoutSession(prepared, prepared.quote_id);
      setStep("pay");
    } catch (e) {
      setStepError(staysCheckoutErrorMessage(e, t));
    } finally {
      setPaymentStage("idle");
    }
  }, [
    email,
    phone,
    guests,
    specialRequests,
    loyaltyNumber,
    staysQuoteSession,
    guestPayload,
    currencyCode,
    t,
    persistCheckoutSession,
    ensureClientQuoteFresh,
    syncQuoteSessionFromPrepare,
  ]);

  const completeBookingAfterAuth = useCallback(async () => {
    if (!prepareResult) return;
    await completeBookingWithSession(
      prepareResult,
      guestPayload(),
      readStaysQuoteSession() ?? staysQuoteSession,
    );
  }, [prepareResult, guestPayload, completeBookingWithSession, staysQuoteSession]);

  const issueFor = (path: string) => fieldIssues.find((i) => i.path === path)?.message;

  const renderOrderSummaryCard = (sticky: boolean) => (
    <HotelCheckoutOrderSummary
      sticky={sticky}
      bookingDetails={bookingDetails}
      staysQuoteSession={staysQuoteSession}
      prepareResult={prepareResult}
      quoteId={quoteId}
      currencyCode={currencyCode}
    />
  );

  return (
    <>
      <div
        className={cn(
          "container mx-auto transition-opacity duration-300 sm:px-4",
          lgUp === false && "pb-[calc(5rem+env(safe-area-inset-bottom))]",
          doneBooking && "pointer-events-none select-none opacity-40",
        )}
        dir={isRtl ? "rtl" : "ltr"}
        aria-hidden={doneBooking ? true : undefined}
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
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
          <div className="space-y-6 lg:col-span-2">
            {step === "guest" ? (
              <section className="relative space-y-6 rounded-2xl border border-border bg-card/60 shadow-sm p-4 md:p-8">
                <h2 className="text-2xl font-bold text-foreground">{t("title")}</h2>
                {stepError ? (
                  <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{stepError}</div>
                ) : null}
                <HotelCheckoutRecap
                  session={staysQuoteSession}
                  fallbackTitle={bookingDetails?.title}
                />
                <HotelCheckoutGuestForm
                  session={staysQuoteSession}
                  guests={guests}
                  onChange={setGuests}
                  issueFor={issueFor}
                />
                <HotelCheckoutContactSection
                  email={email}
                  phone={phone}
                  onEmailChange={setEmail}
                  onPhoneChange={setPhone}
                  issueFor={issueFor}
                />
                <HotelCheckoutAdditionalInfo
                  specialRequests={specialRequests}
                  loyaltyNumber={loyaltyNumber}
                  loyaltySupported={loyaltySupported}
                  onSpecialRequestsChange={setSpecialRequests}
                  onLoyaltyChange={setLoyaltyNumber}
                />
                <HotelCheckoutCancellationPolicy session={staysQuoteSession} />
                <div className="flex justify-end pt-2">
                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    className="w-full sm:w-auto"
                    disabled={isPaymentBusy}
                    onClick={() => void continueToPayment()}
                  >
                    {paymentStage === "preparing" ? paymentStageLabel : t("continueToPayment")}
                  </Button>
                </div>
              </section>
            ) : null}

            {step === "pay" && prepareResult ? (
              <section className="relative rounded-2xl border border-border bg-card/60 p-6 shadow-sm md:p-8">
                {isPaymentBusy ? (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl bg-background/80 backdrop-blur-sm">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
                    <span className="text-sm font-medium">{paymentStageLabel}</span>
                  </div>
                ) : null}
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">Payment</h2>
                    <p className="text-sm text-muted-foreground">Pay securely with card via Stripe.</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={isPaymentBusy}
                    onClick={() => setStep("guest")}
                  >
                    Back
                  </Button>
                </div>
                {stepError ? <p className="mb-4 text-sm text-destructive">{stepError}</p> : null}
                <div className="mb-6 flex items-start gap-3 rounded-xl bg-primary/10 p-4 text-sm">
                  <Lock className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                  <p>Your card is authorized first; we only capture after the hotel confirms your booking.</p>
                </div>
                <StripePaymentForm
                  clientSecret={prepareResult.client_secret}
                  returnUrl={stripeReturnUrl}
                  disabled={isPaymentBusy}
                  submitLabel="Pay & book"
                  onError={(err) =>
                    setStepError(typeof err === "string" ? err : err.message ?? "Payment failed.")
                  }
                  onAuthorized={completeBookingAfterAuth}
                />
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
          <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 lg:hidden">
            <div className="mx-auto w-full max-w-6xl px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2.5">
              <button
                type="button"
                onClick={() => setMobileOrderSummaryOpen(true)}
                className="flex w-full items-center justify-between gap-2 py-1"
              >
                <div>
                  <p className="text-[11px] uppercase text-muted-foreground">{t("totalAmountLabel")}</p>
                  <p className="text-base font-bold text-primary">{summaryPrimaryPrice}</p>
                </div>
                <ChevronUp className="h-5 w-5 text-primary" aria-hidden />
              </button>
            </div>
          </div>
          <Sheet open={mobileOrderSummaryOpen} onOpenChange={setMobileOrderSummaryOpen}>
            <SheetContent side="bottom" className="rounded-t-2xl p-0">
              <SheetTitle className="sr-only">{t("sheetOrderSummaryTitle")}</SheetTitle>
              <div className="overflow-y-auto px-3 py-2">{renderOrderSummaryCard(false)}</div>
            </SheetContent>
          </Sheet>
        </>
      ) : null}

      {doneBooking?.booking_ref_no || doneBooking?.id ? (
        <HotelBookingSuccessDialog
          open={Boolean(doneBooking)}
          onClose={handleBookingSuccessClose}
          booking={doneBooking}
          bookingDetails={bookingDetails}
          chargeDisplay={successChargeDisplay}
          stayDatesFallback={staysQuoteSession}
          isRtl={isRtl}
          confirmationEmail={email.trim() || null}
          hotelsResultsHref="/hotels"
        />
      ) : null}
    </>
  );
}
