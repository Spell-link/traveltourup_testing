"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import dynamic from "next/dynamic";
import type { StripeError } from "@stripe/stripe-js";
import { Loader2, Lock, Plane, Shield, ChevronUp } from "lucide-react";
import type { FlightOfferDTO } from "@/lib/duffel/dto/flight-offer.dto";
import type { FlightCheckoutBookingBody } from "@/lib/validations/flight-checkout.schema";
import { mergeFlightOrderServiceLines, type FlightOrderServiceLine } from "@/lib/validations/flight-ancillaries.schema";
import { isFlightHoldOrderBackendEnabled } from "@/config/flight-hold.config";
import { getFlightOffer, postFlightBooking, postFlightPaymentIntent } from "@/lib/http/flights.client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { NativeSelect } from "@/components/ui/NativeSelect";
import {
  flightAncillariesStorageKey,
  type StoredFlightAncillaries,
} from "@/lib/flights/flight-detail-session";
import { CheckoutLoadingSkeleton } from "@/components/flights/FlightCheckoutLoadingSkeleton";
import { useLocale, useTranslations } from "next-intl";
import { isRtlLocale } from "@/lib/i18n/rtl";
import { parseIsoCurrencyAmountLine } from "@/lib/currency/format-display";
import { useCurrency } from "@/components/providers/CurrencyProvider";
import { Sheet, SheetContent, SheetTitle } from "@/components/admin_ui/ui/sheet";
import { cn } from "@/lib/utils";

const BOOKING_STORAGE_KEY = "booking-details";
const ORDER_MODE_STORAGE_KEY = "flight-checkout-order-mode";

const DuffelPayments = dynamic(
  () => import("@duffel/components").then((m) => m.DuffelPayments),
  { ssr: false },
);

type SessionBookingDetails = {
  type?: string;
  title?: string;
  price?: string;
  options?: { label: string; value: string }[];
  subtitle?: string;
};

type PassengerFormRow = {
  passenger_id: string;
  title: "mr" | "mrs" | "ms" | "miss" | "dr";
  given_name: string;
  family_name: string;
  born_on: string;
  gender: "m" | "f";
  email: string;
  phone_number: string;
  /** Required for infant passengers: adult `pas_` id (lap infant). */
  infant_passenger_id?: string;
};

type CheckoutStep = "passengers" | "pay";
type CheckoutOrderMode = "pay_now" | "hold";

function emptyRow(pid: string): PassengerFormRow {
  return {
    passenger_id: pid,
    title: "mr",
    given_name: "",
    family_name: "",
    born_on: "",
    gender: "m",
    email: "",
    phone_number: "",
  };
}

export function FlightCheckoutDuffel({ offerId }: { offerId: string }) {
  const t = useTranslations("Flights.checkout");
  const locale = useLocale();
  const isRtl = isRtlLocale(locale);
  const { currencyCode, formatPrice } = useCurrency();
  const holdBackend = isFlightHoldOrderBackendEnabled();

  const passengerTypeLabel = useCallback((type: string | null | undefined): string => {
    if (!type) return t("passengerTypeGeneric");
    const x = type.toLowerCase();
    if (x === "adult") return t("passengerTypeAdult");
    if (x === "child") return t("passengerTypeChild");
    if (x === "infant") return t("passengerTypeInfant");
    return type.charAt(0).toUpperCase() + type.slice(1);
  }, [t]);
  const bookingIdempotencyRef = useRef(
    typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `bk-${Date.now()}`,
  );
  const paymentIntentIdempotencyRef = useRef(
    typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `fpit-${Date.now()}`,
  );

  const [offer, setOffer] = useState<FlightOfferDTO | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [passengers, setPassengers] = useState<PassengerFormRow[]>([]);
  const [step, setStep] = useState<CheckoutStep>("passengers");
  const [bagQuantities, setBagQuantities] = useState<Record<string, number>>({});
  const [seatSelections, setSeatSelections] = useState<Record<string, string>>({});
  const [pricingError, setPricingError] = useState<string | null>(null);
  const [clientToken, setClientToken] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  /**
   * Final amount the customer's card will be charged in the offer/charge currency.
   * Populated after `POST /payment-intents` returns so the order summary shows the
   * real charge (offer + extras + commission + Duffel fee gross-up) rather than the
   * stale offer total or marketing line from sessionStorage.
   */
  const [chargePricing, setChargePricing] = useState<{
    amount: string;
    currency: string;
  } | null>(null);
  const [payBusy, setPayBusy] = useState(false);
  const [confirmingBooking, setConfirmingBooking] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);
  const [doneBooking, setDoneBooking] = useState<unknown | null>(null);
  const [bookingDetails, setBookingDetails] = useState<SessionBookingDetails | null>(null);
  const [orderMode, setOrderMode] = useState<CheckoutOrderMode>("pay_now");
  const [mobileOrderSummaryOpen, setMobileOrderSummaryOpen] = useState(false);
  const [lgUp, setLgUp] = useState<boolean | null>(null);

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
        const parsed = JSON.parse(raw) as SessionBookingDetails;
        setBookingDetails(parsed);
      }
    } catch {
      setBookingDetails(null);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = sessionStorage.getItem(`${ORDER_MODE_STORAGE_KEY}:${offerId}`);
      if (raw === "hold" || raw === "pay_now") setOrderMode(raw);
    } catch {
      /* ignore */
    }
  }, [offerId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      sessionStorage.setItem(`${ORDER_MODE_STORAGE_KEY}:${offerId}`, orderMode);
    } catch {
      /* ignore */
    }
  }, [offerId, orderMode]);

  useEffect(() => {
    if (!holdBackend && orderMode === "hold") setOrderMode("pay_now");
  }, [holdBackend, orderMode]);

  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    setOffer(null);
    getFlightOffer(offerId)
      .then((res) => {
        if (cancelled) return;
        const o = res.offer;
        setOffer(o);
        setPassengers(o.passengers.map((p) => emptyRow(p.id)));
      })
      .catch((e: Error) => {
        if (!cancelled) setLoadError(e?.message ?? t("errorCouldNotLoadOffer"));
      });
    return () => {
      cancelled = true;
    };
  }, [offerId, t]);

  useEffect(() => {
    if (!offer) return;
    try {
      const raw = sessionStorage.getItem(flightAncillariesStorageKey(offer.id));
      if (!raw) return;
      const s = JSON.parse(raw) as StoredFlightAncillaries;
      if (s.bagQuantities && typeof s.bagQuantities === "object") setBagQuantities(s.bagQuantities);
      if (s.seatSelections && typeof s.seatSelections === "object") setSeatSelections(s.seatSelections);
    } catch {
      /* ignore */
    }
  }, [offer?.id]);

  useEffect(() => {
    if (!offer) return;
    setBagQuantities((prev) => {
      const next = { ...prev };
      for (const s of offer.available_services) {
        if (next[s.id] === undefined) next[s.id] = 0;
      }
      return next;
    });
  }, [offer]);

  const adultPassengerIds = useMemo(() => {
    if (!offer) return [];
    return offer.passengers.filter((p) => p.type?.toLowerCase() === "adult").map((p) => p.id);
  }, [offer]);

  const canPreparePay = useMemo(() => {
    if (!offer || passengers.length === 0) return false;
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(passengers[0]?.email?.trim() ?? "");
    const identityOk = passengers.every((p, idx) => {
      const base =
        p.given_name.trim() &&
        p.family_name.trim() &&
        /^\d{4}-\d{2}-\d{2}$/.test(p.born_on);
      if (!base) return false;
      if (idx > 0) return true;
      return emailOk;
    });
    const infantsOk = passengers.every((p, idx) => {
      const pt = offer.passengers[idx]?.type?.toLowerCase();
      if (pt !== "infant") return true;
      return Boolean(p.infant_passenger_id?.trim());
    });
    return identityOk && infantsOk;
  }, [offer, passengers]);

  const summaryBookingLine = useMemo(() => {
    const st = (bookingDetails?.type ?? "Flight").toLowerCase();
    const cat =
      st === "hotel" ? t("summaryTypeHotel") : st === "car" ? t("summaryTypeCar") : t("summaryTypeFlight");
    return `${cat} ${t("summaryBookingWord")}`;
  }, [bookingDetails?.type, t]);

  const compiledServiceLines = useCallback((): FlightOrderServiceLine[] => {
    if (!offer) return [];
    const lines: FlightOrderServiceLine[] = [];
    for (const s of offer.available_services) {
      const q = bagQuantities[s.id] ?? 0;
      const max = s.maximum_quantity ?? 99;
      if (q > 0) lines.push({ id: s.id, quantity: Math.min(q, max) });
    }
    for (const svcId of Object.values(seatSelections)) {
      if (svcId) lines.push({ id: svcId, quantity: 1 });
    }
    return mergeFlightOrderServiceLines(lines);
  }, [offer, bagQuantities, seatSelections]);

  const preparePaymentIntent = async () => {
    setPricingError(null);
    setStepError(null);
    setPayBusy(true);
    try {
      const pit = await postFlightPaymentIntent(
        { offer_id: offerId, services: compiledServiceLines() },
        paymentIntentIdempotencyRef.current,
      );
      setClientToken(pit.client_token);
      setPaymentIntentId(pit.payment_intent_id);
      setChargePricing({
        amount: pit.pricing.customer_charge_amount,
        currency: pit.pricing.customer_charge_currency,
      });
      setStep("pay");
    } catch (e) {
      setPricingError(e instanceof Error ? e.message : t("errorCouldNotStartPayment"));
    } finally {
      setPayBusy(false);
    }
  };

  const passengerPayload = useCallback((): FlightCheckoutBookingBody["passengers"] => {
    return passengers.map((p) => ({
      passenger_id: p.passenger_id,
      title: p.title,
      given_name: p.given_name.trim(),
      family_name: p.family_name.trim(),
      born_on: p.born_on,
      gender: p.gender,
      ...(p.passenger_id === passengers[0]?.passenger_id && p.email.trim()
        ? { email: p.email.trim() }
        : {}),
      ...(p.passenger_id === passengers[0]?.passenger_id && p.phone_number.trim()
        ? { phone_number: p.phone_number.trim() }
        : {}),
      ...(p.infant_passenger_id?.trim() ? { infant_passenger_id: p.infant_passenger_id.trim() } : {}),
    }));
  }, [passengers]);

  const buildCheckoutBody = useCallback((): FlightCheckoutBookingBody | null => {
    if (!offer || !paymentIntentId) return null;
    return {
      offer_id: offer.id,
      order_mode: "pay_now",
      payment_intent_id: paymentIntentId,
      passengers: passengerPayload(),
      services: compiledServiceLines(),
    };
  }, [offer, passengerPayload, paymentIntentId, compiledServiceLines]);

  const buildHoldCheckoutBody = useCallback((): FlightCheckoutBookingBody | null => {
    if (!offer) return null;
    return {
      offer_id: offer.id,
      order_mode: "hold",
      passengers: passengerPayload(),
      services: compiledServiceLines(),
    };
  }, [offer, passengerPayload, compiledServiceLines]);

  const placeHoldOrder = async () => {
    setStepError(null);
    setPricingError(null);
    setPayBusy(true);
    try {
      const body = buildHoldCheckoutBody();
      if (!body) {
        setStepError(t("errorMissingCheckoutData"));
        return;
      }
      const booked = await postFlightBooking(body, bookingIdempotencyRef.current);
      setDoneBooking(booked);
    } catch (e) {
      setStepError(e instanceof Error ? e.message : t("errorCouldNotPlaceHold"));
    } finally {
      setPayBusy(false);
    }
  };

  const onSuccessfulCardPayment = async () => {
    setStepError(null);
    if (!paymentIntentId) return;
    setConfirmingBooking(true);
    try {
      const body = buildCheckoutBody();
      if (!body) {
        setStepError(t("errorMissingCheckoutData"));
        return;
      }
      /** Confirm + `POST /air/orders` run server-side in one saga (`POST /flights/bookings`). */
      const booked = await postFlightBooking(body, bookingIdempotencyRef.current);
      setDoneBooking(booked);
    } catch (e) {
      setStepError(e instanceof Error ? e.message : t("errorBookingFailedAfterPayment"));
    } finally {
      setConfirmingBooking(false);
    }
  };

  const onFailedCardPayment = (err: StripeError) => {
    setStepError(err?.message || t("errorCardPaymentFailed"));
  };

  const summaryTitle = bookingDetails?.title ?? t("defaultSummaryTitle");
  /**
   * Prefer the live `customer_charge_amount` from the Duffel PaymentIntent
   * (offer + extras + markup + Duffel Payments fee). Falls back to offer total
   * before the intent is created, and finally to the marketing summary copy
   * persisted on the flight detail page.
   */
  const summaryPrimaryPrice = useMemo(() => {
    if (chargePricing) {
      const n = Number.parseFloat(chargePricing.amount);
      if (Number.isFinite(n)) {
        return formatPrice(n, chargePricing.currency, locale);
      }
    }
    if (offer) {
      const n = Number.parseFloat(offer.total_amount);
      if (Number.isFinite(n)) {
        return formatPrice(n, offer.total_currency, locale);
      }
    }
    const parsedBooking = parseIsoCurrencyAmountLine(bookingDetails?.price);
    if (parsedBooking) {
      return formatPrice(parsedBooking.amount, parsedBooking.currency, locale);
    }
    return bookingDetails?.price ?? "—";
  }, [chargePricing, bookingDetails?.price, offer, formatPrice, locale]);

  const offerTotalDisplay = useMemo(() => {
    if (!offer) return "—";
    const n = Number.parseFloat(offer.total_amount);
    if (!Number.isFinite(n)) return `${offer.total_currency} ${offer.total_amount}`;
    return formatPrice(n, offer.total_currency, locale);
  }, [offer, formatPrice, locale]);

  const chargedInDuffelFlight =
    offer && typeof offer.total_amount === "string"
      ? `${offer.total_currency} ${offer.total_amount}`
      : null;
  const showFlightChargeBasis =
    Boolean(offer) &&
    chargedInDuffelFlight != null &&
    offer!.total_currency.toUpperCase() !== currencyCode.toUpperCase();

  const summaryOptions = bookingDetails?.options ?? [];

  const renderOrderSummaryCard = (sticky: boolean) => (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-card shadow-sm",
        sticky && "sticky top-24",
      )}
    >
      <div className="flex items-center gap-3 border-b border-border bg-muted px-6 py-4">
        <Plane className="text-xl text-primary" aria-hidden />
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
            <span className="text-start text-muted-foreground">{t("offerTotalLabel")}</span>
            <span className="text-end font-medium text-foreground">{offerTotalDisplay}</span>
          </div>
        </div>
        <hr className="my-4 border-border border-dashed" />
        <div className="mb-2 flex items-end justify-between gap-2">
          <span className="font-medium text-muted-foreground">{t("totalAmountLabel")}</span>
          <span className="text-3xl font-bold text-primary">{summaryPrimaryPrice}</span>
        </div>
        {showFlightChargeBasis ? (
          <p className="text-end text-xs text-muted-foreground">{`Charged in ${chargedInDuffelFlight}`}</p>
        ) : null}
        <p className="text-end text-xs text-muted-foreground">{t("includesFareExtras")}</p>
      </div>
      <div className="flex items-center justify-center gap-2 bg-muted px-6 py-4 text-xs text-muted-foreground">
        <Shield className="h-4 w-4 shrink-0" aria-hidden />
        <span>{t("secureCheckout")}</span>
      </div>
    </div>
  );

  if (loadError) {
    return (
      <div
        className="mx-auto max-w-xl rounded-xl border border-destructive/40 bg-card p-6 text-center"
        dir={isRtl ? "rtl" : "ltr"}
      >
        <p className="mb-4 font-medium text-destructive">{loadError}</p>
        <Link href="/flights" className="font-semibold text-primary hover:underline">
          {t("backToFlights")}
        </Link>
      </div>
    );
  }

  if (!offer) {
    return (
      <div dir={isRtl ? "rtl" : "ltr"}>
        <CheckoutLoadingSkeleton />
      </div>
    );
  }

  if (doneBooking && typeof doneBooking === "object" && doneBooking !== null && "booking_ref_no" in doneBooking) {
    const b = doneBooking as {
      booking_ref_no?: string;
      id?: string;
      status?: string;
      payment_status?: string;
      flight_booking?: { booking_reference?: string | null };
    };
    const holdPlaced = b.status === "pending" && b.payment_status === "unpaid";
    return (
      <div
        className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-8 text-center shadow-lg"
        dir={isRtl ? "rtl" : "ltr"}
      >
        <h1 className="mb-2 text-2xl font-bold text-foreground">
          {holdPlaced ? t("successHoldPlaced") : t("successBookingConfirmed")}
        </h1>
        <p className="mb-4 text-muted-foreground">
          {holdPlaced ? (
            <span>
              {t("successHoldBodyPrefix")}{" "}
              <strong className="text-foreground">{b.booking_ref_no ?? b.id}</strong>
            </span>
          ) : (
            <span>
              {t("successReferencePrefix")}{" "}
              <strong className="text-foreground">{b.booking_ref_no ?? b.id}</strong>
              {b.flight_booking?.booking_reference ? (
                <>
                  {" "}
                  · {t("successAirlinePnr")}{" "}
                  <strong className="text-foreground">{b.flight_booking.booking_reference}</strong>
                </>
              ) : null}
            </span>
          )}
        </p>
        <Link
          href={
            typeof b.id === "string" && b.id
              ? `/profile/bookings/${encodeURIComponent(b.id)}`
              : "/profile/bookings"
          }
          className="font-semibold text-primary hover:underline"
        >
          {t("viewYourBooking")}
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
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("offerSubtitle", {
              offerId: offer.id,
              currency: offer.total_currency,
              amount: offer.total_amount,
            })}
            {step === "pay" ? <span className="mt-1 block text-xs">{t("stepPayment")}</span> : null}
          </p>
        </div>
      
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6 ">
        <div className="space-y-6 lg:col-span-2">
          {step === "passengers" ? (
            <section className="relative sm:rounded-2xl sm:border sm:border-border bg-card/60  shadow-sm md:p-8 px-4">
              {payBusy ? (
                <div
                  className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl bg-background/70 backdrop-blur-sm"
                  role="status"
                  aria-live="polite"
                  aria-busy
                >
                  <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
                  <span className="text-sm font-medium text-foreground">
                    {orderMode === "hold" && holdBackend ? t("placingHold") : t("preparingPayment")}
                  </span>
                </div>
              ) : null}
              <h2 className="mb-2 text-2xl font-bold text-foreground">{t("payNowOrHoldTitle")}</h2>
              <p className="mb-4 text-sm text-muted-foreground">{t("payNowOrHoldIntro")}</p>
              <div className="mb-8 space-y-3">
                <label className="flex cursor-pointer gap-3 rounded-xl border border-border bg-card/80 p-4 has-[:checked]:border-primary has-[:checked]:ring-2 has-[:checked]:ring-primary/20">
                  <input
                    type="radio"
                    name="checkout-order-mode"
                    className="mt-1"
                    checked={orderMode === "pay_now"}
                    onChange={() => setOrderMode("pay_now")}
                  />
                  <div>
                    <p className="font-semibold text-foreground">{t("payNowTitle")}</p>
                    <p className="text-sm text-muted-foreground">{t("payNowDescription")}</p>
                  </div>
                </label>
                <label
                  className={`flex gap-3 rounded-xl border border-border bg-card/80 p-4 has-[:checked]:border-primary has-[:checked]:ring-2 has-[:checked]:ring-primary/20 ${
                    holdBackend ? "cursor-pointer" : "cursor-not-allowed opacity-60"
                  }`}
                >
                  <input
                    type="radio"
                    name="checkout-order-mode"
                    className="mt-1"
                    disabled={!holdBackend}
                    checked={orderMode === "hold"}
                    onChange={() => holdBackend && setOrderMode("hold")}
                  />
                  <div>
                    <p className="font-semibold text-foreground">{t("holdOrderTitle")}</p>
                    <p className="text-sm text-muted-foreground">{t("holdOrderDescription")}</p>
                    {!holdBackend ? (
                      <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">{t("holdDisabledHint")}</p>
                    ) : null}
                  </div>
                </label>
              </div>
              <h2 className="mb-6 text-2xl font-bold text-foreground">{t("passengerDetailsTitle")}</h2>
              {pricingError ? <p className="mb-4 text-sm text-destructive">{pricingError}</p> : null}
              {stepError ? <p className="mb-4 text-sm text-destructive">{stepError}</p> : null}
              <div className="space-y-6">
                {passengers.map((p, idx) => {
                  const offerPax = offer.passengers[idx];
                  const typeLabel = passengerTypeLabel(offerPax?.type);
                  const isInfant = offerPax?.type?.toLowerCase() === "infant";
                  const isLead = idx === 0;

                  return (
                    <div
                      key={p.passenger_id}
                      className="space-y-3 rounded-xl border border-border bg-card/80 p-4 md:p-5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/80 pb-3">
                        <div>
                          <p className="text-base font-semibold text-foreground">
                            {t("passengerIndex", { current: idx + 1, total: passengers.length })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t("referenceLabel")} <span className="font-mono">{p.passenger_id}</span>
                          </p>
                        </div>
                        <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
                          {typeLabel}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <NativeSelect
                          id={`${p.passenger_id}-title`}
                          label={t("titleFieldLabel")}
                          value={p.title}
                          onChange={(e) => {
                            const v = e.target.value as PassengerFormRow["title"];
                            setPassengers((rows) => rows.map((r, i) => (i === idx ? { ...r, title: v } : r)));
                          }}
                        >
                          <option value="mr">{t("titleMr")}</option>
                          <option value="mrs">{t("titleMrs")}</option>
                          <option value="ms">{t("titleMs")}</option>
                          <option value="miss">{t("titleMiss")}</option>
                          <option value="dr">{t("titleDr")}</option>
                        </NativeSelect>
                        <NativeSelect
                          id={`${p.passenger_id}-gender`}
                          label={t("genderFieldLabel")}
                          value={p.gender}
                          onChange={(e) => {
                            const v = e.target.value as PassengerFormRow["gender"];
                            setPassengers((rows) => rows.map((r, i) => (i === idx ? { ...r, gender: v } : r)));
                          }}
                        >
                          <option value="m">{t("genderMale")}</option>
                          <option value="f">{t("genderFemale")}</option>
                        </NativeSelect>
                        <Input
                          id={`${p.passenger_id}-given`}
                          label={t("givenNameLabel")}
                          value={p.given_name}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            const v = e.target.value;
                            setPassengers((rows) => rows.map((r, i) => (i === idx ? { ...r, given_name: v } : r)));
                          }}
                        />
                        <Input
                          id={`${p.passenger_id}-family`}
                          label={t("familyNameLabel")}
                          value={p.family_name}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            const v = e.target.value;
                            setPassengers((rows) => rows.map((r, i) => (i === idx ? { ...r, family_name: v } : r)));
                          }}
                        />
                        <Input
                          id={`${p.passenger_id}-dob`}
                          label={t("dobLabel")}
                          type="date"
                          value={p.born_on}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            const v = e.target.value;
                            setPassengers((rows) => rows.map((r, i) => (i === idx ? { ...r, born_on: v } : r)));
                          }}
                        />
                        {isInfant && adultPassengerIds.length > 0 ? (
                          <NativeSelect
                            id={`${p.passenger_id}-infant-adult`}
                            label={t("infantAdultLabel")}
                            value={p.infant_passenger_id ?? ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              setPassengers((rows) =>
                                rows.map((r, i) => (i === idx ? { ...r, infant_passenger_id: v } : r)),
                              );
                            }}
                          >
                            <option value="">{t("selectAdultPassenger")}</option>
                            {adultPassengerIds.map((aid) => (
                              <option key={aid} value={aid}>
                                {aid}
                              </option>
                            ))}
                          </NativeSelect>
                        ) : null}
                        {isLead ? (
                          <div className="sm:col-span-2 space-y-3 border-t border-border/60 pt-4">
                            <h3 className="text-sm font-semibold text-foreground">{t("contactDetailsTitle")}</h3>
                            <p className="text-xs text-muted-foreground">{t("contactDetailsHint")}</p>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                              <Input
                                id={`${p.passenger_id}-email`}
                                label={t("emailLabel")}
                                type="email"
                                autoComplete="email"
                                value={p.email}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                  const v = e.target.value;
                                  setPassengers((rows) =>
                                    rows.map((r, i) => (i === idx ? { ...r, email: v } : r)),
                                  );
                                }}
                              />
                              <Input
                                id={`${p.passenger_id}-phone`}
                                label={t("phoneOptionalLabel")}
                                type="tel"
                                autoComplete="tel"
                                value={p.phone_number}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                  const v = e.target.value;
                                  setPassengers((rows) =>
                                    rows.map((r, i) => (i === idx ? { ...r, phone_number: v } : r)),
                                  );
                                }}
                              />
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-8">
                <Button
                  type="button"
                  className="inline-flex w-full items-center justify-center gap-2 py-4 text-base font-bold shadow-lg sm:w-auto"
                  disabled={!canPreparePay || payBusy || (orderMode === "hold" && !holdBackend)}
                  onClick={() => {
                    if (orderMode === "hold" && holdBackend) void placeHoldOrder();
                    else void preparePaymentIntent();
                  }}
                >
                  {payBusy ? (
                    <>
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                      {orderMode === "hold" && holdBackend ? t("placingHold") : t("preparingPayment")}
                    </>
                  ) : orderMode === "hold" && holdBackend ? (
                    t("placeHold")
                  ) : (
                    t("continueToPayment")
                  )}
                </Button>
                {!canPreparePay ? (
                  <p className="mt-2 text-xs text-muted-foreground">{t("hintIncompleteForm")}</p>
                ) : orderMode === "hold" && holdBackend ? (
                  <p className="mt-2 text-xs text-muted-foreground">{t("hintHoldNoCharge")}</p>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">{t("hintPayExtrasOnOffer")}</p>
                )}
              </div>
            </section>
          ) : null}

          {step === "pay" && clientToken ? (
            <div className="relative rounded-2xl border border-border bg-card/60 p-6 shadow-sm md:p-8">
              {confirmingBooking ? (
                <div
                  className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl bg-background/80 backdrop-blur-sm"
                  role="status"
                  aria-live="polite"
                  aria-busy
                >
                  <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
                  <span className="text-sm font-medium text-foreground">{t("confirmingBooking")}</span>
                </div>
              ) : null}
              <h2 className="mb-2 text-2xl font-bold text-foreground">{t("paymentSectionTitle")}</h2>
              {/* <p className="mb-4 text-sm text-muted-foreground">
                Fare and any add-ons selected on the offer page are included in this payment. If the airline price
                moved, you may need to restart checkout.
              </p> */}
              {stepError ? <p className="mb-4 text-sm text-destructive">{stepError}</p> : null}
              <div className="mb-6 flex items-start gap-3 rounded-xl bg-primary/10 p-4 text-sm text-foreground">
                <Lock className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                <p>{t("pciNotice")}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/50 p-4">
                <h3 className="mb-3 text-lg font-semibold text-foreground">{t("cardDetailsTitle")}</h3>
                <DuffelPayments
                  paymentIntentClientToken={clientToken}
                  onSuccessfulPayment={() => void onSuccessfulCardPayment()}
                  onFailedPayment={onFailedCardPayment}
                />
                <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{t("duffelPaymentsStripeHint")}</p>
              </div>
            </div>
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
