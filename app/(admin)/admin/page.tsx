import { getServerAuthz } from "@/lib/authz/session";
import { getAdminDashboardSnapshot } from "@/lib/services/admin/admin-dashboard.service";
import { adminDashboardQuerySchema } from "@/lib/validations/admin-dashboard.schema";
import { firstSearchParam } from "@/lib/admin/search-params";
import { AdminDashboard } from "@/components/admin/dashboard/admin-dashboard";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminIndexPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const query = adminDashboardQuerySchema.parse({
    range: firstSearchParam(sp.range) || undefined,
    granularity: firstSearchParam(sp.granularity) || undefined,
  });

  const { authz } = await getServerAuthz();
  const snapshot = await getAdminDashboardSnapshot(authz, query);

  return <AdminDashboard snapshot={snapshot} />;
}
