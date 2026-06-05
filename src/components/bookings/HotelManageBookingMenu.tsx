"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/Button";

type Props = {
  canSpecialRequest: boolean;
  canChangeDates: boolean;
  canCancel: boolean;
  onSpecialRequest: () => void;
  onChangeDates: () => void;
  onRequestCancel: () => void;
  cancelBusy?: boolean;
};

export function HotelManageBookingMenu({
  canSpecialRequest,
  canChangeDates,
  canCancel,
  onSpecialRequest,
  onChangeDates,
  onRequestCancel,
  cancelBusy,
}: Props) {
  const t = useTranslations("Hotels.bookingDetail");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (cancelBusy) return;
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [cancelBusy]);

  if (!canSpecialRequest && !canChangeDates && !canCancel) return null;

  return (
    <div ref={rootRef} className="relative inline-block">
      <Button
        type="button"
        variant="outline"
        disabled={cancelBusy}
        aria-busy={cancelBusy}
        aria-expanded={open}
        onClick={() => {
          if (!cancelBusy) setOpen((o) => !o);
        }}
        className="gap-2"
      >
        {cancelBusy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            {t("manageLoadingPreview")}
          </>
        ) : (
          <>
            {t("manageButton")}
            <ChevronDown className="h-4 w-4" aria-hidden />
          </>
        )}
      </Button>
      {open ? (
        <div className="absolute right-0 z-50 mt-2 min-w-[240px] rounded-lg border border-border bg-card py-1 shadow-lg">
          {canSpecialRequest ? (
            <button
              type="button"
              className="block w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-muted"
              onClick={() => {
                setOpen(false);
                onSpecialRequest();
              }}
            >
              {t("manageSpecialRequest")}
            </button>
          ) : null}
          {canChangeDates ? (
            <button
              type="button"
              className="block w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-muted"
              onClick={() => {
                setOpen(false);
                onChangeDates();
              }}
            >
              {t("manageChangeDates")}
            </button>
          ) : null}
          {canCancel ? (
            <button
              type="button"
              disabled={cancelBusy}
              className="block w-full px-4 py-2.5 text-left text-sm text-destructive hover:bg-muted disabled:cursor-not-allowed disabled:opacity-70"
              onClick={() => {
                if (cancelBusy) return;
                setOpen(false);
                onRequestCancel();
              }}
            >
              {t("manageCancel")}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
