import type {
  FlightPricingRuleListRow,
  SerializedPricingRule,
} from "@/lib/admin/flight-pricing-rule.types";

export function mapPricingRulesToRows(rules: SerializedPricingRule[]): FlightPricingRuleListRow[] {
  return rules.map((r) => {
    const match =
      [r.origin_iata, r.destination_iata].filter(Boolean).join(" → ") || "any";
    const matchExtra = [
      r.carrier_iata ? `· ${r.carrier_iata}` : "",
      r.cabin_class ? `· ${r.cabin_class}` : "",
    ]
      .filter(Boolean)
      .join("");
    const override =
      r.commission_percent_override != null
        ? `commission ${r.commission_percent_override}%`
        : "—";
    const overrideExtra = r.markup_fixed_override ? `, fixed ${r.markup_fixed_override}` : "";
    const caps =
      [
        r.max_commission_percent != null ? `≤ ${r.max_commission_percent}%` : "",
        r.max_markup_fixed ? `≤ ${r.max_markup_fixed}` : "",
      ]
        .filter(Boolean)
        .join(", ") || "—";
    return {
      id: r.id,
      name: r.name,
      match: match + matchExtra,
      override: override + overrideExtra,
      caps,
      priority: String(r.priority),
      enabled: r.enabled,
      notes: r.notes ?? "",
    };
  });
}
