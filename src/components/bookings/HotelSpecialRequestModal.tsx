"use client";

import { useCallback, useState } from "react";
import { Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import type { StaysBookingDisplay } from "@/lib/stays/stays-booking-display";
import { formatStayDateLong } from "@/lib/stays/stays-booking-display";

type Props = {
  open: boolean;
  onClose: () => void;
  display: StaysBookingDisplay;
  locale: string;
};

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function CopyRow({
  label,
  value,
  fieldKey,
  copiedKey,
  onCopy,
  copiedLabel,
}: {
  label: string;
  value: string;
  fieldKey: string;
  copiedKey: string | null;
  onCopy: (key: string, text: string) => void;
  copiedLabel: string;
}) {
  const isCopied = copiedKey === fieldKey;
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/40 bg-muted/20 px-3 py-2">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate font-medium text-foreground">{value}</p>
      </div>
      <button
        type="button"
        className="shrink-0 rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
        onClick={() => onCopy(fieldKey, value)}
        aria-label={isCopied ? copiedLabel : `Copy ${label}`}
      >
        {isCopied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
      </button>
    </div>
  );
}

export function HotelSpecialRequestModal({ open, onClose, display, locale }: Props) {
  const t = useTranslations("Hotels.bookingDetail");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = useCallback(async (fieldKey: string, text: string) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedKey(fieldKey);
      window.setTimeout(() => setCopiedKey(null), 2000);
    }
  }, []);

  const leadGuest = display.guests[0]?.fullName ?? "—";
  const checkIn = formatStayDateLong(display.checkInDate, locale);
  const hotelRef = display.bookingReference ?? "—";
  const hasHotelContact = Boolean(display.hotelPhone || display.hotelEmail);

  return (
    <Modal isOpen={open} onClose={onClose} title={t("specialRequestTitle")} className="max-w-lg">
      <div className="space-y-4 text-sm">
        <p className="text-muted-foreground">{t("specialRequestIntro")}</p>
        <p className="rounded-lg bg-amber-50 p-3 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          {t("specialRequestDisclaimer")}
        </p>

        {hasHotelContact ? (
          <div className="space-y-2">
            <p className="font-medium text-foreground">{t("specialRequestContactHotel")}</p>
            {display.hotelPhone ? (
              <CopyRow
                label={t("hotelPhoneLabel")}
                value={display.hotelPhone}
                fieldKey="phone"
                copiedKey={copiedKey}
                onCopy={handleCopy}
                copiedLabel={t("copied")}
              />
            ) : null}
            {display.hotelEmail ? (
              <CopyRow
                label={t("hotelEmailLabel")}
                value={display.hotelEmail}
                fieldKey="email"
                copiedKey={copiedKey}
                onCopy={handleCopy}
                copiedLabel={t("copied")}
              />
            ) : null}
          </div>
        ) : (
          <p className="text-muted-foreground">{t("specialRequestNoContact")}</p>
        )}

        <div className="space-y-2">
          <p className="font-medium text-foreground">{t("specialRequestEssentialInfo")}</p>
          <CopyRow
            label={t("guestNameLabel")}
            value={leadGuest}
            fieldKey="guest"
            copiedKey={copiedKey}
            onCopy={handleCopy}
            copiedLabel={t("copied")}
          />
          <CopyRow
            label={t("checkInLabel")}
            value={checkIn}
            fieldKey="checkin"
            copiedKey={copiedKey}
            onCopy={handleCopy}
            copiedLabel={t("copied")}
          />
          <CopyRow
            label={t("hotelConfirmationLabel")}
            value={hotelRef}
            fieldKey="ref"
            copiedKey={copiedKey}
            onCopy={handleCopy}
            copiedLabel={t("copied")}
          />
        </div>

        <div className="flex justify-end pt-2">
          <Button type="button" variant="primary" onClick={onClose}>
            {t("modalClose")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
