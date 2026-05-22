import { Link } from "@/i18n/navigation";
import { Card, type FlightCardData } from "@/components/ui/Card";

type FeaturedFlightsGridProps = {
  cards: FlightCardData[];
};

/**
 * Featured flight offer tiles or empty state (Duffel unavailable / no results).
 */
export function FeaturedFlightsGrid({ cards }: FeaturedFlightsGridProps) {
  if (cards.length === 0) {
    return (
      <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-muted-foreground">
        <div>
          <p className="font-medium text-foreground mb-2">Live deals unavailable</p>
          <p className="text-sm mb-4">
            Configure Duffel and try again, or search manually to see current offers.
          </p>
          <Link
            href="/flights#flight-search"
            className="text-primary font-semibold hover:underline"
          >
            Open flight search
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {cards.slice(0, 6).map((flight, index) => (
        <Card
          key={String(
            flight.id ?? `${flight.departureCity ?? "?"}-${flight.arrivalCity ?? "?"}-${index}`,
          )}
          variant="flight"
          data={flight}
          actionHref={
            flight.id != null ? `/flights/${encodeURIComponent(String(flight.id))}` : "/flights"
          }
        />
      ))}
    </div>
  );
}
