export type FlightPricingRuleListRow = {
  id: string;
  name: string;
  match: string;
  override: string;
  caps: string;
  priority: string;
  enabled: boolean;
  notes: string;
};

export type SerializedPricingRule = {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  origin_iata: string | null;
  destination_iata: string | null;
  carrier_iata: string | null;
  cabin_class: string | null;
  commission_percent_override: string | null;
  markup_fixed_override: string | null;
  max_commission_percent: string | null;
  max_markup_fixed: string | null;
  effective_from: string | null;
  effective_to: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};
