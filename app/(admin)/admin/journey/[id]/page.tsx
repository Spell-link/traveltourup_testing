import { getAdminJourneyInterestDetail } from "@/lib/services/journey/admin-journey.service";
import { getServerAuthz } from "@/lib/authz/session";
import { JourneyIntentDetailView } from "@/components/admin/journey/journey-intent-detail-view";

export const dynamic = "force-dynamic";

export default async function AdminJourneyIntentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { authz } = await getServerAuthz();
  const data = await getAdminJourneyInterestDetail({ authz, interestId: id });

  return (
    <main className="rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8">
      <JourneyIntentDetailView data={data} />
    </main>
  );
}
