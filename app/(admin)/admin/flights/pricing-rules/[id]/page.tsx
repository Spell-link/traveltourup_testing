import { notFound } from "next/navigation";
import PageHeader from "@/components/admin_ui/shared/page-header";
import { PricingRuleForm } from "@/components/admin/flights/pricing-rule-form";
import { getAdminFlightPricingRule } from "@/lib/services/admin/admin-flight-pricing-rules.service";

export const dynamic = "force-dynamic";

export default async function AdminFlightPricingRuleEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const rule = await getAdminFlightPricingRule(id).catch(() => null);
  if (!rule) {
    notFound();
  }
  return (
    <div className="space-y-4">
      <PageHeader
        title={`Edit: ${rule.name}`}
        subtitle="Adjust override values, caps, and matching criteria."
      />
      <PricingRuleForm
        mode="edit"
        id={rule.id}
        initial={{
          name: rule.name,
          enabled: rule.enabled,
          priority: rule.priority,
          origin_iata: rule.origin_iata,
          destination_iata: rule.destination_iata,
          carrier_iata: rule.carrier_iata,
          cabin_class:
            rule.cabin_class === "economy" ||
            rule.cabin_class === "premium_economy" ||
            rule.cabin_class === "business" ||
            rule.cabin_class === "first"
              ? rule.cabin_class
              : null,
          commission_percent_override:
            rule.commission_percent_override == null
              ? null
              : Number(rule.commission_percent_override),
          markup_fixed_override: rule.markup_fixed_override,
          max_commission_percent:
            rule.max_commission_percent == null ? null : Number(rule.max_commission_percent),
          max_markup_fixed: rule.max_markup_fixed,
          effective_from: rule.effective_from,
          effective_to: rule.effective_to,
          notes: rule.notes,
        }}
      />
    </div>
  );
}
