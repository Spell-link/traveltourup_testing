"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { FlightOrderJourneyTimeline } from "@/components/flights/FlightOrderJourneyTimeline";
import { useCurrency } from "@/components/providers/CurrencyProvider";
import { ApiRequestError } from "@/lib/http/api-client";
import {
  postFlightOrderChangeConfirm,
  postFlightOrderChangePaymentIntent,
  type FlightOrderChangeOffer,
} from "@/lib/http/flights.client";
import { parseChangeDelta } from "@/lib/flights/flight-change-session";

const DuffelPayments = dynamic(
  () => import("@duffel/components").then((m) => m.DuffelPayments),
  { ssr: false },
);

type Props = {
  bookingId: string;
  changeId: string;
  offer: FlightOrderChangeOffer;
  offerId: string;
  bookingRefNo: string;
  beforeAmount: string;
  beforeCurrency: string;
  itinerarySnapshot: unknown;
  selectedSliceIndex: number;
  onSuccess: () => void;
};

export function FlightChangeConfirmPay({
  bookingId,
  changeId,
  offer,
  offerId,
  bookingRefNo,
  beforeAmount,
  beforeCurrency,
  itinerarySnapshot,
  selectedSliceIndex,
  onSuccess,
}: Props) {
  const locale = useLocale();
  const t = useTranslations("Flights.change");
  const { formatPrice } = useCurrency();
  const router = useRouter();

  const [previousOpen, setPreviousOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientToken, setClientToken] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [payStep, setPayStep] = useState<"review" | "card">("review");

  const delta = parseChangeDelta(offer);
  const currency = offer.change_total_currency ?? beforeCurrency;
  const needsPayment = delta > 0;

  const beforeN = Number.parseFloat(beforeAmount);
  const afterN = offer.new_total_amount
    ? Number.parseFloat(offer.new_total_amount)
    : Number.isFinite(beforeN)
      ? beforeN + delta
      : null;

  const costDisplay = useMemo(() => {
    if (delta < 0) {
      return t("refundAmount", {
        amount: formatPrice(Math.abs(delta), currency, locale),
      });
    }
    if (delta === 0) return t("noExtraCharge");
    return formatPrice(delta, currency, locale);
  }, [delta, currency, formatPrice, locale, t]);

  const confirmFree = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await postFlightOrderChangeConfirm(bookingId, changeId, {
        order_change_offer_id: offerId,
      });
      onSuccess();
    } catch (e) {
      setError(
        e instanceof ApiRequestError
          ? e.message
          : e instanceof Error
            ? e.message
            : t("confirmFailed"),
      );
    } finally {
      setBusy(false);
    }
  }, [bookingId, changeId, offerId, onSuccess, t]);

  const startPaidFlow = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const pit = await postFlightOrderChangePaymentIntent(bookingId, changeId, {
        order_change_offer_id: offerId,
      });
      if (!pit.needs_payment || !pit.payment_intent) {
        await confirmFree();
        return;
      }
      setClientToken(pit.payment_intent.client_token);
      setPaymentIntentId(pit.payment_intent.payment_intent_id);
      setPayStep("card");
    } catch (e) {
      setError(
        e instanceof ApiRequestError
          ? e.message
          : e instanceof Error
            ? e.message
            : t("paymentStartFailed"),
      );
    } finally {
      setBusy(false);
    }
  }, [bookingId, changeId, offerId, confirmFree, t]);

  const onSuccessfulPayment = useCallback(async () => {
    if (!paymentIntentId) return;
    setBusy(true);
    setError(null);
    try {
      await postFlightOrderChangeConfirm(bookingId, changeId, {
        order_change_offer_id: offerId,
        payment_intent_id: paymentIntentId,
      });
      onSuccess();
    } catch (e) {
      setError(
        e instanceof ApiRequestError
          ? e.message
          : e instanceof Error
            ? e.message
            : t("confirmAfterPaymentFailed"),
      );
    } finally {
      setBusy(false);
    }
  }, [bookingId, changeId, offerId, paymentIntentId, onSuccess, t]);

  useEffect(() => {
    if (error?.includes("expired") || error?.includes("410")) {
      router.push(`/flights/change/${encodeURIComponent(bookingId)}`);
    }
  }, [error, bookingId, router]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {t("changeOrderLabel", { ref: bookingRefNo })}
          </p>
          {offer.itinerary_summary ? (
            <h2 className="text-xl font-bold text-foreground">{offer.itinerary_summary}</h2>
          ) : null}
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">{t("changeCost")}</p>
          <p className="text-2xl font-bold text-foreground">{costDisplay}</p>
        </div>
      </div>

      <section className="rounded-xl border border-border bg-card">
        <div className="border-b border-border/40 px-4 py-3">
          <h3 className="font-semibold text-foreground">{t("newFlightDetails")}</h3>
        </div>
        <div className="p-4">
          {offer.new_slice_summary ? (
            <p className="mb-3 text-sm text-muted-foreground">{offer.new_slice_summary}</p>
          ) : null}
          <p className="text-sm text-muted-foreground">{t("newItineraryAfterConfirm")}</p>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card">
        <button
          type="button"
          className="flex w-full items-center justify-between px-4 py-3 text-left"
          onClick={() => setPreviousOpen((o) => !o)}
        >
          <span className="font-semibold text-foreground">{t("previousFlightDetails")}</span>
          {previousOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" aria-hidden />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden />
          )}
        </button>
        {previousOpen ? (
          <div className="border-t border-border/40 p-4">
            <FlightOrderJourneyTimeline snapshot={itinerarySnapshot} sliceIndex={selectedSliceIndex} />
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-semibold text-foreground">{t("paymentSection")}</h3>
        <table className="mt-4 w-full text-sm">
          <tbody>
            <tr className="border-b border-border/40">
              <td className="py-2 text-muted-foreground">{t("beforeChangeAmount")}</td>
              <td className="py-2 text-right text-foreground">
                {Number.isFinite(beforeN)
                  ? formatPrice(beforeN, beforeCurrency, locale)
                  : `${beforeCurrency} ${beforeAmount}`}
              </td>
            </tr>
            {afterN != null && Number.isFinite(afterN) ? (
              <tr className="border-b border-border/40">
                <td className="py-2 text-muted-foreground">{t("afterChangeAmount")}</td>
                <td className="py-2 text-right text-foreground">
                  {formatPrice(afterN, offer.new_total_currency ?? currency, locale)}
                </td>
              </tr>
            ) : null}
            <tr>
              <td className="pt-3 font-semibold text-foreground">{t("changeCost")}</td>
              <td className="pt-3 text-right text-lg font-bold text-foreground">{costDisplay}</td>
            </tr>
          </tbody>
        </table>
        {offer.penalty_total_amount ? (
          <p className="mt-2 text-xs text-muted-foreground">
            {t("includesPenalty", {
              amount: formatPrice(
                Number.parseFloat(offer.penalty_total_amount),
                offer.penalty_total_currency ?? currency,
                locale,
              ),
            })}
          </p>
        ) : null}
        {delta < 0 && offer.refund_to ? (
          <p className="mt-2 text-xs text-muted-foreground">
            {t("refundToHint", { destination: offer.refund_to.replace(/_/g, " ") })}
          </p>
        ) : null}
      </section>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {payStep === "card" && clientToken ? (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 font-semibold text-foreground">{t("cardPayment")}</h3>
          <DuffelPayments
            paymentIntentClientToken={clientToken}
            onSuccessfulPayment={() => void onSuccessfulPayment()}
            onFailedPayment={(err) => setError(err?.message ?? t("paymentFailed"))}
          />
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => void (needsPayment ? startPaidFlow() : confirmFree())}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          {needsPayment ? t("confirmAndPay") : t("confirmChange")}
        </button>
      )}
    </div>
  );
}
