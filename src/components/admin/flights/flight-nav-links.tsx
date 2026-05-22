import Link from "next/link";

/** Secondary navigation between flight admin sub-routes. */
export function FlightNavLinks({
  current,
}: {
  current?: "bookings" | "revenue" | "ledger" | "webhooks" | "pricing" | "orphan";
}) {
  const links = [
    { key: "bookings" as const, href: "/admin/flights", label: "Bookings" },
    { key: "revenue" as const, href: "/admin/flights/revenue", label: "Revenue" },
    { key: "ledger" as const, href: "/admin/flights/ledger", label: "Ledger" },
    { key: "pricing" as const, href: "/admin/flights/pricing-rules", label: "Pricing rules" },
    { key: "orphan" as const, href: "/admin/flights/orphan-pit", label: "Orphan PIT" },
    { key: "webhooks" as const, href: "/admin/flights/webhooks", label: "Webhooks" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      {links.map((l) => (
        <Link
          key={l.key}
          href={l.href}
          className={
            current === l.key
              ? "rounded-md bg-primary/10 px-3 py-1.5 font-medium text-primary"
              : "rounded-md border border-border px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          }
        >
          {l.label}
        </Link>
      ))}
    </div>
  );
}
