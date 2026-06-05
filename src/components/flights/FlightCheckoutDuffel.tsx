"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import dynamic from "next/dynamic";
import type { StripeError } from "@stripe/stripe-js";
import { Loader2, Lock, Plane, Shield, ChevronUp } from "lucide-react";
import type { FlightOfferDTO } from "@/lib/duffel/dto/flight-offer.dto";
import type { FlightCheckoutBookingBody } from "@/lib/validations/flight-checkout.schema";
import {
  collectFlightPassengerBookingIssues,
  getMaxPassengerBornOnYmdForOffer,
  type FlightPassengerIssue,
} from "@/lib/flights/flight-passenger-booking-validation";
import {
  buildFlightCheckoutContact,
  buildFlightCheckoutPassengerPayload,
  buildFlightCheckoutValidateBody,
} from "@/lib/flights/flight-checkout-payload";
import type { SearchPassengerAgeContext } from "@/lib/flights/passenger-age-rules";
import { mergeFlightOrderServiceLines, type FlightOrderServiceLine } from "@/lib/validations/flight-ancillaries.schema";
import { isFlightHoldOrderBackendEnabled } from "@/config/flight-hold.config";
import { readFlightOfferSnapshot, clearFlightOfferSnapshot } from "@/lib/flights/flight-offer-snapshot";
import {
  getFlightOfferDeduped,
  getFlightSearchSessionParams,
  getFlightSeatMapsDeduped,
  postFlightBooking,
  postFlightBookingValidate,
  postFlightPaymentIntent,
} from "@/lib/http/flights.client";
import { ApiRequestError } from "@/lib/http/api-client";
import { Button } from "@/components/ui/Button";
import { FlightCheckoutContactSection } from "@/components/flights/checkout/FlightCheckoutContactSection";
import { FlightCheckoutPassengerCard } from "@/components/flights/checkout/FlightCheckoutPassengerCard";
import {
  isInfantPassengerType,
  getOfferAdultPassengerIds,
} from "@/lib/flights/infant-passenger-linking";
import {
  emptyContactState,
  emptyPassengerRow,
  type CheckoutContactState,
  type PassengerFormRow,
} from "@/components/flights/checkout/checkout-types";
import { getRegionSelectOptions } from "@/lib/region-select-options";
import {
  flightAncillariesStorageKey,
  type StoredFlightAncillaries,
} from "@/lib/flights/flight-detail-session";
import { CheckoutLoadingSkeleton } from "@/components/flights/FlightSkeletons";
import {
  FlightBookingFailureDialog,
} from "@/components/flights/FlightBookingFailureDialog";
import {
  FlightBookingSuccessDialog,
  type FlightBookingSuccessPayload,
} from "@/components/flights/FlightBookingSuccessDialog";
import { useLocale, useTranslations } from "next-intl";
import { isRtlLocale } from "@/lib/i18n/rtl";
import { useCurrency } from "@/components/providers/CurrencyProvider";
import { resolveFlightCheckoutDisplayPricing } from "@/lib/flights/flight-checkout-display-pricing";
import type { SeatMapDTO } from "@/lib/duffel/dto/seat-map.dto";
import { Sheet, SheetContent, SheetTitle } from "@/components/admin_ui/ui/sheet";
import { cn } from "@/lib/utils";
import { readFlightSearchPath } from "@/lib/flights/flight-search-url-session";

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

type CheckoutStep = "passengers" | "pay";
type CheckoutOrderMode = "pay_now" | "hold";

export type FlightCheckoutContactPrefill = {
  email?: string | null;
  phone_number?: string | null;
};

export function FlightCheckoutDuffel({
  offerId,
  searchSessionId = null,
  contactPrefill = null,
}: {
  offerId: string;
  searchSessionId?: string | null;
  contactPrefill?: FlightCheckoutContactPrefill | null;
}) {
  const t = useTranslations("Flights.checkout");
  const tb = useTranslations("Booking.sidebar");
  const router = useRouter();
  const locale = useLocale();
  const isRtl = isRtlLocale(locale);
  const { currencyCode, formatPrice } = useCurrency();
  const holdBackend = isFlightHoldOrderBackendEnabled();

  const passengerTypeLabel = useCallback((type: string | null | undefined): string => {
    if (!type) return t("passengerTypeGeneric");
    const x = type.toLowerCase();
    if (x === "adult") return t("passengerTypeAdult");
    if (x === "child") return t("passengerTypeChild");
    if (x === "infant" || x === "infant_without_seat") return t("passengerTypeInfant");
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
  const [contact, setContact] = useState<CheckoutContactState>(() =>
    emptyContactState({
      email: contactPrefill?.email ?? "",
      phone_number: contactPrefill?.phone_number ?? "",
    }),
  );
  const [searchPassengers, setSearchPassengers] = useState<SearchPassengerAgeContext[] | null>(null);
  const passengersSectionRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<CheckoutStep>("passengers");
  const [bagQuantities, setBagQuantities] = useState<Record<string, number>>({});
  const [seatSelections, setSeatSelections] = useState<Record<string, string>>({});
  const [seatMaps, setSeatMaps] = useState<SeatMapDTO[] | null>(null);
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
  const [doneBooking, setDoneBooking] = useState<FlightBookingSuccessPayload | null>(null);
  const [bookingFailureError, setBookingFailureError] = useState<ApiRequestError | null>(null);
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
    if (doneBooking) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [doneBooking]);

  const handleBookingSuccessClose = useCallback(() => {
    setDoneBooking(null);
    router.push(readFlightSearchPath() ?? "/flights");
  }, [router]);

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
    const snapshot = readFlightOfferSnapshot(offerId);
    if (snapshot) {
      const o = snapshot;
      setOffer(o);
      const adultIds = getOfferAdultPassengerIds(o);
      let infantIdx = 0;
      setPassengers(
        o.passengers.map((p) => {
          if (isInfantPassengerType(p.type) && adultIds.length > 0) {
            return emptyPassengerRow(p.id, adultIds[infantIdx++ % adultIds.length]);
          }
          return emptyPassengerRow(p.id);
        }),
      );
      return () => {
        cancelled = true;
      };
    }
    getFlightOfferDeduped(offerId)
      .then((res) => {
        if (cancelled) return;
        const o = res.offer;
        setOffer(o);
        const adultIds = getOfferAdultPassengerIds(o);
        let infantIdx = 0;
        setPassengers(
          o.passengers.map((p) => {
            if (isInfantPassengerType(p.type) && adultIds.length > 0) {
              return emptyPassengerRow(p.id, adultIds[infantIdx++ % adultIds.length]);
            }
            return emptyPassengerRow(p.id);
          }),
        );
      })
      .catch((e: Error) => {
        if (!cancelled) setLoadError(e?.message ?? t("errorCouldNotLoadOffer"));
      });
    return () => {
      cancelled = true;
    };
  }, [offerId, t]);

  useEffect(() => {
    if (!searchSessionId?.trim()) return;
    let cancelled = false;
    getFlightSearchSessionParams(searchSessionId.trim())
      .then((res) => {
        if (!cancelled) setSearchPassengers(res.passengers);
      })
      .catch(() => {
        if (!cancelled) setSearchPassengers(null);
      });
    return () => {
      cancelled = true;
    };
  }, [searchSessionId]);

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

  useEffect(() => {
    if (!offer) return;
    const hasSeatSelection = Object.values(seatSelections).some(Boolean);
    const needsSeatMaps =
      offer.available_services.length > 0 || hasSeatSelection;
    if (!needsSeatMaps) {
      setSeatMaps([]);
      return;
    }
    let cancelled = false;
    getFlightSeatMapsDeduped(offer.id)
      .then((r) => {
        if (!cancelled) setSeatMaps(r.seat_maps);
      })
      .catch(() => {
        if (!cancelled) setSeatMaps(null);
      });
    return () => {
      cancelled = true;
    };
  }, [offer?.id, offer?.available_services.length, seatSelections]);

  // useEffect(() => {
  //   if (!offer || typeof window === "undefined") return;
  //   try {
  //     const payload: StoredFlightAncillaries = {
  //       bagQuantities,
  //       seatSelections,
  //     };
  //     sessionStorage.setItem(
  //       flightAncillariesStorageKey(offer.id),
  //       JSON.stringify(payload),
  //     );
  //   } catch {
  //     /* ignore */
  //   }
  // }, [offer, bagQuantities, seatSelections]);

  const adultOptions = useMemo(() => {
    if (!offer) return [];
    let adultOrdinal = 0;
    return offer.passengers
      .filter((p) => p.type?.toLowerCase() === "adult")
      .map((p) => {
        adultOrdinal += 1;
        const row = passengers.find((r) => r.passenger_id === p.id);
        const name = [row?.given_name, row?.family_name].filter(Boolean).join(" ").trim();
        return {
          id: p.id,
          label: name
            ? `${t("passengerTypeAdult")} ${adultOrdinal} — ${name}`
            : `${t("passengerTypeAdult")} ${adultOrdinal}`,
        };
      });
  }, [offer, passengers, t]);

  const contactPayload = useMemo(() => buildFlightCheckoutContact(contact), [contact]);

  const passengerPayload = useCallback((): FlightCheckoutBookingBody["passengers"] => {
    return buildFlightCheckoutPassengerPayload(passengers);
  }, [passengers]);

  const validationContext = useMemo(
    () => ({ searchPassengers, contact: contactPayload }),
    [searchPassengers, contactPayload],
  );

  const countryOptions = useMemo(() => getRegionSelectOptions(locale), [locale]);

  const showPassportSection = Boolean(offer?.passenger_identity_documents_required);

  const canProceedPassengers = useMemo(() => {
    if (!offer || passengers.length === 0) return false;
    return (
      collectFlightPassengerBookingIssues(offer, passengerPayload(), validationContext).length ===
      0
    );
  }, [offer, passengers, passengerPayload, validationContext]);

  const passengerIssues = useMemo((): FlightPassengerIssue[] => {
    if (!offer) return [];
    return collectFlightPassengerBookingIssues(offer, passengerPayload(), validationContext);
  }, [offer, passengerPayload, validationContext]);

  const maxBornOnYmd = useMemo(() => (offer ? getMaxPassengerBornOnYmdForOffer(offer) : null), [offer]);

  const translatePassengerIssue = useCallback(
    (iss: FlightPassengerIssue): string => {
      switch (iss.code) {
        case "given_name_required":
          return t("validationGivenNameRequired");
        case "family_name_required":
          return t("validationFamilyNameRequired");
        case "born_on_format":
          return t("validationBornOnFormat");
        case "born_on_after_itinerary_max":
          return t("validationBornOnBefore", { date: iss.values?.maxBornOn ?? "—" });
        case "lead_email_invalid":
          return t("validationLeadEmail");
        case "lead_phone_required":
          return t("validationLeadPhone");
        case "lead_phone_e164":
          return t("validationLeadPhoneE164");
        case "infant_adult_required":
          return t("validationInfantAdult");
        case "infant_adult_invalid":
          return t("validationInfantAdultInvalid");
        case "infant_adult_duplicate":
          return t("validationInfantAdultDuplicate");
        case "passport_required":
          return t("validationPassportRequired");
        case "passport_number_required":
          return t("validationPassportNumberRequired");
        case "passport_country_required":
          return t("validationPassportCountryRequired");
        case "passport_expires_on_format":
          return t("validationPassportExpiresFormat");
        case "passport_expires_before_travel_end":
          return t("validationPassportExpiresBeforeTravel", {
            date: iss.values?.minExpiresOn ?? "—",
          });
        case "child_age_mismatch_return":
          return t("validationChildAgeMismatch", {
            age: iss.values?.expectedAge ?? "—",
          });
        case "infant_age_invalid":
          return t("validationInfantAgeInvalid");
        case "adult_age_invalid":
          return t("validationAdultAgeInvalid");
        default:
          return t("validationGeneric");
      }
    },
    [t],
  );

  const fieldError = useCallback(
    (idx: number, field: string): string | undefined => {
      const iss = passengerIssues.find((i) => i.path[1] === idx && i.path[2] === field);
      return iss ? translatePassengerIssue(iss) : undefined;
    },
    [passengerIssues, translatePassengerIssue],
  );

  const contactEmailError = useMemo(() => {
    const iss = passengerIssues.find((i) => i.code === "lead_email_invalid");
    return iss ? translatePassengerIssue(iss) : undefined;
  }, [passengerIssues, translatePassengerIssue]);

  const contactPhoneError = useMemo(() => {
    const iss = passengerIssues.find(
      (i) => i.code === "lead_phone_required" || i.code === "lead_phone_e164",
    );
    return iss ? translatePassengerIssue(iss) : undefined;
  }, [passengerIssues, translatePassengerIssue]);

  const passportFieldError = useCallback(
    (idx: number, field: string): string | undefined => {
      const iss = passengerIssues.find((i) => {
        if (i.path[1] !== idx) return false;
        if (field === "identity_documents") {
          return i.path.length === 3 && i.path[2] === "identity_documents";
        }
        return (
          i.path.length >= 5 &&
          i.path[2] === "identity_documents" &&
          i.path[4] === field
        );
      });
      return iss ? translatePassengerIssue(iss) : undefined;
    },
    [passengerIssues, translatePassengerIssue],
  );

  const scrollToFirstIssue = useCallback(() => {
    passengersSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

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
    setBookingFailureError(null);
    if (!offer || !canProceedPassengers) {
      scrollToFirstIssue();
      return;
    }
    setPayBusy(true);
    try {
      const body = buildFlightCheckoutValidateBody({
        offer_id: offerId,
        contact,
        passengers,
        services: compiledServiceLines(),
        search_session_id: searchSessionId,
      });
      const validation = await postFlightBookingValidate(body);
      if (!validation.valid) {
        setStepError(t("hintIncompleteForm"));
        scrollToFirstIssue();
        return;
      }
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

  const buildCheckoutBody = useCallback((): FlightCheckoutBookingBody | null => {
    if (!offer || !paymentIntentId) return null;
    return {
      offer_id: offer.id,
      contact: contactPayload,
      order_mode: "pay_now",
      payment_intent_id: paymentIntentId,
      passengers: passengerPayload(),
      services: compiledServiceLines(),
      ...(searchSessionId?.trim() ? { search_session_id: searchSessionId.trim() } : {}),
    };
  }, [offer, contactPayload, passengerPayload, paymentIntentId, compiledServiceLines, searchSessionId]);

  const buildHoldCheckoutBody = useCallback((): FlightCheckoutBookingBody | null => {
    if (!offer) return null;
    return {
      offer_id: offer.id,
      contact: contactPayload,
      order_mode: "hold",
      passengers: passengerPayload(),
      services: compiledServiceLines(),
      ...(searchSessionId?.trim() ? { search_session_id: searchSessionId.trim() } : {}),
    };
  }, [offer, contactPayload, passengerPayload, compiledServiceLines, searchSessionId]);

  const placeHoldOrder = async () => {
    setStepError(null);
    setPricingError(null);
    setBookingFailureError(null);
    if (!offer || !canProceedPassengers) {
      scrollToFirstIssue();
      return;
    }
    setPayBusy(true);
    try {
      const body = buildHoldCheckoutBody();
      if (!body) {
        setStepError(t("errorMissingCheckoutData"));
        return;
      }
      const booked = await postFlightBooking(body, bookingIdempotencyRef.current);
      clearFlightOfferSnapshot(offerId);
      setDoneBooking(booked as FlightBookingSuccessPayload);
    } catch (e) {
      if (e instanceof ApiRequestError) {
        setBookingFailureError(e);
      } else {
        setStepError(e instanceof Error ? e.message : t("errorCouldNotPlaceHold"));
      }
    } finally {
      setPayBusy(false);
    }
  };

  const onSuccessfulCardPayment = async () => {
    setStepError(null);
    setBookingFailureError(null);
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
      clearFlightOfferSnapshot(offerId);
      setDoneBooking(booked as FlightBookingSuccessPayload);
    } catch (e) {
      if (e instanceof ApiRequestError) {
        setBookingFailureError(e);
      } else {
        setStepError(e instanceof Error ? e.message : t("errorBookingFailedAfterPayment"));
      }
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
  const successChargeDisplay = useMemo(() => {
    const cc = doneBooking?.guest_data?.customer_charge;
    if (cc?.amount && cc?.currency) {
      const n = Number.parseFloat(cc.amount);
      if (Number.isFinite(n)) return formatPrice(n, cc.currency, locale);
    }
    if (chargePricing) {
      const n = Number.parseFloat(chargePricing.amount);
      if (Number.isFinite(n)) return formatPrice(n, chargePricing.currency, locale);
    }
    return null;
  }, [doneBooking, chargePricing, formatPrice, locale]);

  const isSuccessHold =
    doneBooking?.status === "pending" && doneBooking?.payment_status === "unpaid";

  const displayPricing = useMemo(
    () =>
      resolveFlightCheckoutDisplayPricing({
        offer,
        bagQuantities,
        seatSelections,
        seatMaps,
        bookingDetailsPriceLine: bookingDetails?.price,
        chargePricing,
      }),
    [offer, bagQuantities, seatSelections, seatMaps, bookingDetails?.price, chargePricing],
  );

  const summaryPrimaryPrice = useMemo(() => {
    if (!displayPricing) return bookingDetails?.price ?? "—";
    return formatPrice(displayPricing.primaryAmount, displayPricing.currency, locale);
  }, [displayPricing, bookingDetails?.price, formatPrice, locale]);

  const offerTotalDisplay = useMemo(() => {
    if (displayPricing) {
      return formatPrice(displayPricing.base, displayPricing.currency, locale);
    }
    if (!offer) return "—";
    const n = Number.parseFloat(offer.total_amount);
    if (!Number.isFinite(n)) return `${offer.total_currency} ${offer.total_amount}`;
    return formatPrice(n, offer.total_currency, locale);
  }, [displayPricing, offer, formatPrice, locale]);

  const extrasSubtotalDisplay = useMemo(() => {
    if (!displayPricing || displayPricing.extrasSubtotal <= 0) return null;
    return formatPrice(
      displayPricing.extrasSubtotal,
      displayPricing.currency,
      locale,
    );
  }, [displayPricing, formatPrice, locale]);

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
        "overflow-auto rounded-2xl border border-border bg-card shadow-sm dropdown-scrollbar max-h-[calc(100vh-6rem)]",
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
        <div className="mb-4 space-y-2">
          {summaryOptions.map((opt, i) => (
            <div key={`${opt.label}-${i}`} className="flex justify-between gap-2 text-sm">
              <span className="text-start text-muted-foreground">{opt.label}</span>
              <span className="max-w-[55%] text-end font-medium text-foreground">{opt.value}</span>
            </div>
          ))}
          <div className="flex justify-between gap-2 text-sm">
            <span className="text-start text-muted-foreground">{tb("fare")}</span>
            <span className="text-end font-medium text-foreground">{offerTotalDisplay}</span>
          </div>
          {extrasSubtotalDisplay ? (
            <div className="flex justify-between gap-2 text-sm">
              <span className="text-start text-muted-foreground">{tb("selectedExtrasEst")}</span>
              <span className="text-end font-medium text-foreground">{extrasSubtotalDisplay}</span>
            </div>
          ) : null}
        </div>
        <hr className="my-2 border-border border-dashed" />
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
        className="mx-auto max-w-xl rounded-xl border border-destructive/40 bg-card p-4 text-center"
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

  return (
    <>
      <div
        className={cn(
          "container mx-auto sm:px-4 transition-opacity duration-300",
          lgUp === false && "pb-[calc(5rem+env(safe-area-inset-bottom))]",
          doneBooking && "pointer-events-none select-none opacity-40",
        )}
        dir={isRtl ? "rtl" : "ltr"}
        aria-hidden={doneBooking ? true : undefined}
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
                <div className="mb-8 space-y-3 grid grid-cols-1 gap-2 md:grid-cols-2">
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
                    className={`flex gap-3 rounded-xl border border-border bg-card/80 p-4 has-[:checked]:border-primary has-[:checked]:ring-2 has-[:checked]:ring-primary/20 ${holdBackend ? "cursor-pointer" : "cursor-not-allowed opacity-60"
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
                <FlightCheckoutContactSection
                  contact={contact}
                  onChange={setContact}
                  emailError={contactEmailError}
                  phoneError={contactPhoneError}
                  labels={{
                    title: t("contactDetailsTitle"),
                    hint: t("contactDetailsHint"),
                    email: t("emailLabel"),
                    phone: t("phoneRequiredLabel"),
                    phonePlaceholder: t("phonePlaceholder"),
                  }}
                />
                <h2 className="mb-4 mt-8 text-2xl font-bold text-foreground">{t("passengerDetailsTitle")}</h2>
                {pricingError ? <p className="mb-4 text-sm text-destructive">{pricingError}</p> : null}
                {stepError ? <p className="mb-4 text-sm text-destructive">{stepError}</p> : null}
                {!canProceedPassengers && passengerIssues.length > 0 ? (
                  <div
                    className="mb-4 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"
                    role="alert"
                  >
                    <p className="font-medium">{t("validationSummaryTitle")}</p>
                    <ul className="mt-2 list-inside list-disc space-y-1 text-xs">
                      {passengerIssues.slice(0, 5).map((iss, i) => (
                        <li key={`${iss.code}-${i}`}>{translatePassengerIssue(iss)}</li>
                      ))}
                      {passengerIssues.length > 5 ? (
                        <li>{t("validationSummaryMore", { count: passengerIssues.length - 5 })}</li>
                      ) : null}
                    </ul>
                  </div>
                ) : null}
                <div ref={passengersSectionRef} className="space-y-6">
                  {passengers.map((p, idx) => {
                    const offerPax = offer.passengers[idx];
                    const typeLabel = passengerTypeLabel(offerPax?.type);

                    return (
                      <FlightCheckoutPassengerCard
                        key={p.passenger_id}
                        index={idx}
                        total={passengers.length}
                        row={p}
                        offerPassenger={offerPax}
                        typeLabel={typeLabel}
                        maxBornOnYmd={maxBornOnYmd}
                        showPassport={showPassportSection}
                        adultOptions={adultOptions}
                        countryOptions={countryOptions}
                        fieldError={(field) => fieldError(idx, field)}
                        passportFieldError={(field) => passportFieldError(idx, field)}
                        onChange={(next) =>
                          setPassengers((rows) => rows.map((r, i) => (i === idx ? next : r)))
                        }
                        labels={{
                          passengerIndex: t("passengerIndex", { current: idx + 1, total: passengers.length }),
                          referenceLabel: t("referenceLabel"),
                          personalDetailsTitle: t("personalDetailsTitle"),
                          titleField: t("titleFieldLabel"),
                          genderField: t("genderFieldLabel"),
                          titleMr: t("titleMr"),
                          titleMrs: t("titleMrs"),
                          titleMs: t("titleMs"),
                          titleMiss: t("titleMiss"),
                          titleDr: t("titleDr"),
                          genderMale: t("genderMale"),
                          genderFemale: t("genderFemale"),
                          givenName: t("givenNameLabel"),
                          familyName: t("familyNameLabel"),
                          dob: t("dobLabel"),
                          infantAdult: t("infantAdultLabel"),
                          selectAdult: t("selectAdultPassenger"),
                          passportTitle: t("passportDetailsTitle"),
                          passportNumber: t("passportNumberLabel"),
                          passportCountry: t("passportCountryLabel"),
                          passportCountryPlaceholder: t("passportCountryPlaceholder"),
                          passportExpires: t("passportExpiresLabel"),
                        }}
                      />
                    );
                  })}
                </div>
                <div className="mt-6">
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      className="inline-flex w-full items-center justify-center gap-2 py-4 text-base font-bold shadow-lg sm:w-auto"
                      disabled={!canProceedPassengers || payBusy || (orderMode === "hold" && !holdBackend)}
                      onClick={() => {
                        if (!canProceedPassengers) {
                          scrollToFirstIssue();
                          return;
                        }
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
                  </div>

                  {!canProceedPassengers ? (
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
            className="fixed bottom-14 left-0 right-0 z-40 border-t border-border bg-card/95 shadow-[0_-4px_24px_rgba(0,0,0,0.1)] backdrop-blur supports-[backdrop-filter]:bg-card/90 lg:hidden dark:shadow-[0_-4px_24px_rgba(0,0,0,0.35)]"
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

      {doneBooking?.booking_ref_no || doneBooking?.id ? (
        <FlightBookingSuccessDialog
          open={Boolean(doneBooking)}
          onClose={handleBookingSuccessClose}
          booking={doneBooking}
          offer={offer}
          bookingDetails={bookingDetails}
          chargeDisplay={successChargeDisplay}
          isHold={isSuccessHold}
          isRtl={isRtl}
          confirmationEmail={contact.email.trim() || null}
          flightsResultsHref={readFlightSearchPath() ?? "/flights"}
        />
      ) : null}

      <FlightBookingFailureDialog
        open={Boolean(bookingFailureError)}
        onClose={() => setBookingFailureError(null)}
        error={bookingFailureError}
        isRtl={isRtl}
        onRetrySearch={() => router.push("/flights")}
      />
    </>
  );
}
