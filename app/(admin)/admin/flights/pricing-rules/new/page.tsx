import PageHeader from "@/components/admin_ui/shared/page-header";
import { PricingRuleForm } from "@/components/admin/flights/pricing-rule-form";

export const dynamic = "force-dynamic";

export default function AdminFlightPricingRuleNewPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="New pricing rule" subtitle="Match a route, cabin, or carrier and override commission / fixed markup." />
      <PricingRuleForm mode="create" />
    </div>
  );
}
