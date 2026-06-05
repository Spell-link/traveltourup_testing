"use client";

import type { ReactNode } from "react";

export function formatSidebarDate(ymd: string, locale: string): string {
  if (!ymd?.trim()) return "—";
  try {
    return new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(`${ymd.trim()}T12:00:00`));
  } catch {
    return ymd;
  }
}

export function BookingSidebarSummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="max-w-[58%] text-end font-medium text-foreground">{value}</span>
    </div>
  );
}

export function BookingSidebarSummarySection({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <span className="text-primary [&>svg]:h-4 [&>svg]:w-4" aria-hidden>
          {icon}
        </span>
        {title}
      </div>
      <div className="space-y-2.5 rounded-lg border border-border/60 bg-muted/25 px-3 py-3">
        {children}
      </div>
    </div>
  );
}
