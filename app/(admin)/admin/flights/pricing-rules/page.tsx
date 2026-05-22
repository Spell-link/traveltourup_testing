import { listAdminFlightPricingRules } from "@/lib/services/admin/admin-flight-pricing-rules.service";
import { mapPricingRulesToRows } from "@/lib/admin/flight-pricing-rule-rows";
import { FlightPricingRuleList } from "@/components/admin/flights/flight-pricing-rule-list";

export const dynamic = "force-dynamic";

export default async function AdminFlightPricingRulesPage() {
  const rules = await listAdminFlightPricingRules();
  const rows = mapPricingRulesToRows(rules);
  return <FlightPricingRuleList rows={rows} />;
}
