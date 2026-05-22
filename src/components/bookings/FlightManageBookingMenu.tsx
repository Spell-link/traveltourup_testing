"use client";

import { useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { ChevronDown, Info, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/Button";

type Props = {
  bookingId: string;
  canChange: boolean;
  /** Shown when change is disabled (Duffel policy). */
  changeBlockedReason?: string;
  canCancel: boolean;
  onRequestCancelQuote: () => void;
  cancelBusy?: boolean;
};

export function FlightManageBookingMenu({
  bookingId,
  canChange,
  changeBlockedReason,
  canCancel,
  onRequestCancelQuote,
  cancelBusy,
}: Props) {
  const [open, setOpen] = useState(false);
  const [awaitingQuote, setAwaitingQuote] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (cancelBusy) return;
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [cancelBusy]);

  useEffect(() => {
    if (awaitingQuote && !cancelBusy) {
      setAwaitingQuote(false);
      setOpen(false);
    }
  }, [awaitingQuote, cancelBusy]);

  if (!canChange && !canCancel) return null;

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
            Getting quote…
          </>
        ) : (
          <>
            Manage this order
            <ChevronDown className="h-4 w-4" aria-hidden />
          </>
        )}
      </Button>
      {open ? (
        <div className="absolute right-0 z-50 mt-2 min-w-[220px] rounded-lg border border-border bg-card py-1 shadow-lg">
          {canChange ? (
            <Link
              href={`/flights/change/${encodeURIComponent(bookingId)}`}
              className="block px-4 py-2.5 text-sm text-foreground hover:bg-muted"
              onClick={() => setOpen(false)}
            >
              Change flight(s)
            </Link>
          ) : (
            <div
              className="flex items-start gap-2 px-4 py-2.5 text-sm text-muted-foreground"
              title={changeBlockedReason}
            >
              <span>Change flight(s)</span>
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            </div>
          )}
          {canCancel ? (
            <button
              type="button"
              disabled={cancelBusy}
              aria-busy={cancelBusy}
              className="inline-flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-70"
              onClick={() => {
                if (cancelBusy) return;
                setAwaitingQuote(true);
                setOpen(true);
                onRequestCancelQuote();
              }}
            >
              {cancelBusy ? (
                <>
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                  Getting quote…
                </>
              ) : (
                "Cancellation quote"
              )}
            </button>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2.5 text-sm text-muted-foreground">
              <span>Cancellation quote</span>
              <Info className="h-3.5 w-3.5 shrink-0" aria-hidden />
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
