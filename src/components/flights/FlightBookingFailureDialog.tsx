"use client";

import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, X } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/admin_ui/ui/dialog";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { ApiRequestError } from "@/lib/http/api-client";

export function FlightBookingFailureDialog({
  open,
  onClose,
  error,
  isRtl,
  onRetrySearch,
}: {
  open: boolean;
  onClose: () => void;
  error: ApiRequestError | null;
  isRtl: boolean;
  onRetrySearch?: () => void;
}) {
  const t = useTranslations("Flights.checkout");

  if (!open || !error) return null;

  const code = error.details.code ?? "";
  const pit = error.details.payment_intent_id?.trim();
  const refundId = error.details.refund_id?.trim();
  const refundStatus = error.details.refund_status?.trim();
  const upstreamMessage =
    typeof error.details.upstream_message === "string"
      ? error.details.upstream_message.trim()
      : typeof error.details.message === "string"
        ? error.details.message.trim()
        : "";

  const variant =
    code === "BOOKING_FAILED_REFUNDED"
      ? "refunded"
      : code === "BOOKING_FAILED_REFUND_PENDING"
        ? "pending"
        : "support";

  const Icon =
    variant === "refunded" ? CheckCircle2 : variant === "pending" ? Loader2 : AlertTriangle;
  const iconClass =
    variant === "refunded"
      ? "text-emerald-600 dark:text-emerald-400"
      : variant === "pending"
        ? "text-amber-600 dark:text-amber-400"
        : "text-destructive";

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        dir={isRtl ? "rtl" : "ltr"}
        className={cn(
          "gap-0 border-border/80 bg-background p-0 shadow-xl sm:max-w-md",
          "[&>button.absolute.rounded-sm]:hidden",
        )}
        onPointerDownOutside={onClose}
        onEscapeKeyDown={onClose}
      >
        <DialogClose
          className={cn(
            "absolute end-4 top-4 z-50 flex h-9 w-9 items-center justify-center rounded-full",
            "border border-border bg-background text-foreground shadow-md hover:bg-muted",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          )}
          aria-label={t("bookingFailureClose")}
        >
          <X className="h-4 w-4" strokeWidth={2.25} aria-hidden />
        </DialogClose>

        <div className="px-6 pb-6 pt-10">
          <div className="flex flex-col items-center text-center">
            <div
              className={cn(
                "mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted",
                variant === "pending" && "ring-2 ring-amber-500/30",
              )}
            >
              <Icon
                className={cn("h-8 w-8", iconClass, variant === "pending" && "animate-spin")}
                strokeWidth={2}
                aria-hidden
              />
            </div>
            <DialogTitle className="text-lg font-bold text-foreground sm:text-xl">
              {variant === "refunded"
                ? t("bookingFailureRefundedTitle")
                : variant === "pending"
                  ? t("bookingFailureRefundPendingTitle")
                  : t("bookingFailureAfterPaymentTitle")}
            </DialogTitle>
            <DialogDescription className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {variant === "refunded"
                ? t("bookingFailureRefundedBody")
                : variant === "pending"
                  ? t("bookingFailureRefundPendingBody")
                  : t("bookingFailureAfterPaymentBody")}
            </DialogDescription>
            {variant === "support" && upstreamMessage && !upstreamMessage.includes("contact support") ? (
              <p className="mt-3 text-start text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{t("bookingFailureUpstreamHint")}</span>{" "}
                {upstreamMessage}
              </p>
            ) : null}
          </div>

          {(pit || refundId) && (
            <div className="mt-4 rounded-xl border border-border/70 bg-muted/50 px-4 py-3 text-start text-xs text-muted-foreground">
              {pit ? (
                <p className="font-mono">
                  <span className="font-sans font-medium text-foreground">{t("bookingFailurePitLabel")}</span>{" "}
                  {pit}
                </p>
              ) : null}
              {refundId ? (
                <p className="mt-1 font-mono">
                  <span className="font-sans font-medium text-foreground">{t("bookingFailureRefundLabel")}</span>{" "}
                  {refundId}
                  {refundStatus ? ` · ${refundStatus}` : ""}
                </p>
              ) : null}
            </div>
          )}

          <p className="mt-4 text-xs text-muted-foreground">{t("bookingFailureEmailNotice")}</p>

          <div className="mt-6 flex flex-col gap-2">
            {onRetrySearch ? (
              <Button
                type="button"
                variant="primary-cta"
                size="md"
                className="w-full justify-center gap-2"
                onClick={() => {
                  onClose();
                  onRetrySearch();
                }}
              >
                <RefreshCw className="h-4 w-4" aria-hidden />
                {t("bookingFailureSearchAgain")}
              </Button>
            ) : null}
            <Button type="button" variant="outline" size="md" className="w-full" onClick={onClose}>
              {t("bookingFailureClose")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
