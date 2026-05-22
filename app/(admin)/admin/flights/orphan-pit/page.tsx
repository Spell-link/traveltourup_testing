import { listAdminFlightOrphanPits } from "@/lib/services/admin/admin-flights.service";
import {
  FlightOrphanPitView,
  type OrphanPitRow,
} from "@/components/admin/flights/flight-orphan-pit-view";

export const dynamic = "force-dynamic";

function isOrphanPitAutoRefundEnabled(): boolean {
  return process.env.FLIGHT_ORPHAN_PIT_AUTO_REFUND === "1";
}

type PitRecord = Awaited<ReturnType<typeof listAdminFlightOrphanPits>>["orphan"][number];

function mapOrphanRow(r: PitRecord): OrphanPitRow {
  return {
    id: r.id,
    duffelIntentId: r.duffel_intent_id,
    status: r.status,
    amount: `${r.charge_amount} ${r.charge_currency}`,
    offerId: r.offer_id,
    failureCode: r.order_failure_code ?? "—",
    refundInfo: r.order_failure_refund_id
      ? `${r.order_failure_refund_id} (${r.order_failure_refund_status ?? "?"})`
      : "none",
    updated: new Date(r.updated_at).toLocaleString(),
    showCompensation: true,
    compensationLabel: "Issue compensation refund",
  };
}

function mapTerminalRow(r: PitRecord): OrphanPitRow {
  const showCompensation =
    r.order_failure_code === "BOOKING_FAILED_AFTER_PAYMENT" ||
    Boolean(
      r.order_failure_refund_id &&
        r.order_failure_refund_status !== "succeeded" &&
        r.order_failure_refund_status !== "completed",
    );
  return {
    ...mapOrphanRow(r),
    showCompensation,
    compensationLabel: "Retry refund",
  };
}

export default async function AdminFlightOrphanPitPage() {
  const { orphan, post_capture_failed } = await listAdminFlightOrphanPits();

  return (
    <FlightOrphanPitView
      orphan={orphan.map(mapOrphanRow)}
      postCaptureFailed={post_capture_failed.map(mapTerminalRow)}
      autoRefundEnabled={isOrphanPitAutoRefundEnabled()}
    />
  );
}
