import { notFound } from "next/navigation";
import { getAdminFlightSagaDetail } from "@/lib/services/admin/admin-flights.service";
import { FlightSagaDetailView } from "@/components/admin/flights/flight-saga-detail-view";

export const dynamic = "force-dynamic";

export default async function AdminFlightDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getAdminFlightSagaDetail(id);
  if (!detail) notFound();
  return <FlightSagaDetailView detail={detail} />;
}
