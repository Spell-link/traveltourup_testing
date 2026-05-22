"use client";

import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export type MobileFullscreenSearchOverlayProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  headerSlot?: React.ReactNode;
  footerSlot?: React.ReactNode;
  zIndexClassName?: string;
  closeAriaLabel?: string;
};

export function MobileFullscreenSearchOverlay({
  open,
  onClose,
  title,
  children,
  headerSlot,
  footerSlot,
  zIndexClassName = "z-[200]",
  closeAriaLabel = "Close",
}: MobileFullscreenSearchOverlayProps) {
  const reduceMotion = useReducedMotion();
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);

    const focusTimer = window.setTimeout(() => {
      const root = contentRef.current;
      if (!root) return;
      const focusable = root.querySelector<HTMLElement>(
        'input:not([disabled]), button:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      focusable?.focus();
    }, 50);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown, true);
      window.clearTimeout(focusTimer);
    };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="mobile-fullscreen-search-overlay"
          className={cn(
            "lg:hidden fixed inset-0 flex flex-col bg-background",
            zIndexClassName,
          )}
          role="dialog"
          aria-modal="true"
          aria-labelledby="mobile-fullscreen-search-title"
          initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
          transition={{
            duration: reduceMotion ? 0.01 : 0.22,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <header className="flex shrink-0 flex-col border-b border-border bg-background">
            <motion.div
              className="flex items-center gap-3 px-4 pb-3 pt-[max(0.625rem,env(safe-area-inset-top))]"
              initial={false}
            >
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted"
                aria-label={closeAriaLabel}
              >
                <X className="h-5 w-5" strokeWidth={2} />
              </button>
              <h2
                id="mobile-fullscreen-search-title"
                className="min-w-0 flex-1 text-lg font-bold text-foreground"
              >
                {title}
              </h2>
            </motion.div>
            {headerSlot ? (
              <motion.div className="px-4 pb-3" initial={false}>
                {headerSlot}
              </motion.div>
            ) : null}
          </header>

          <div
            ref={contentRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 dropdown-scrollbar"
          >
            {children}
          </div>

          {footerSlot ? (
            <footer className="shrink-0 border-t border-border bg-background px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {footerSlot}
            </footer>
          ) : null}
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
