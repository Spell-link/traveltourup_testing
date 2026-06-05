/**
 * One-time repair for flight bookings whose totals were inflated by repeated
 * reconcile on booking detail loads. Syncs totals from Duffel for confirmed
 * flights that have a confirmed order change.
 *
 * Usage: dotenv -e .env.local -- tsx scripts/repair-flight-booking-totals.ts
 */
import { loadSeedEnv } from "../prisma/seed/load-env";
import { repairInflatedFlightBookingTotals } from "@/lib/services/flights/flight-order-change.service";

loadSeedEnv();

async function main() {
  const result = await repairInflatedFlightBookingTotals();
  console.log(
    `Repair complete: scanned=${result.scanned} updated=${result.updated}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
