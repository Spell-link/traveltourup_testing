"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import GenericForm, { type SubFormConfig } from "@/components/admin_ui/shared/generic-form";
import { Alert, AlertDescription } from "@/components/admin_ui/ui/alert";
import {
  createFlightPricingRule,
  updateFlightPricingRule,
} from "@/lib/http/admin-flights.client";
import {
  flightPricingRuleBodySchema,
  type FlightPricingRuleBody,
} from "@/lib/validations/flight-pricing-rule.schema";

export type PricingRuleFormValues = {
  name: string;
  enabled: boolean;
  priority: number;
  origin_iata: string;
  destination_iata: string;
  carrier_iata: string;
  cabin_class: string;
  commission_percent_override: string;
  markup_fixed_override: string;
  max_commission_percent: string;
  max_markup_fixed: string;
  effective_from: string;
  effective_to: string;
  notes: string;
};

const CABIN_OPTIONS = [
  { value: "", label: "any" },
  { value: "economy", label: "economy" },
  { value: "premium_economy", label: "premium_economy" },
  { value: "business", label: "business" },
  { value: "first", label: "first" },
];

function buildDefaults(initial?: Partial<PricingRuleFormValues>): PricingRuleFormValues {
  return {
    name: initial?.name ?? "",
    enabled: initial?.enabled ?? true,
    priority: initial?.priority ?? 100,
    origin_iata: initial?.origin_iata ?? "",
    destination_iata: initial?.destination_iata ?? "",
    carrier_iata: initial?.carrier_iata ?? "",
    cabin_class: initial?.cabin_class ?? "",
    commission_percent_override:
      initial?.commission_percent_override != null
        ? String(initial.commission_percent_override)
        : "",
    markup_fixed_override: initial?.markup_fixed_override ?? "",
    max_commission_percent:
      initial?.max_commission_percent != null ? String(initial.max_commission_percent) : "",
    max_markup_fixed: initial?.max_markup_fixed ?? "",
    effective_from: initial?.effective_from ?? "",
    effective_to: initial?.effective_to ?? "",
    notes: initial?.notes ?? "",
  };
}

function toApiBody(data: PricingRuleFormValues): FlightPricingRuleBody {
  const cabin = data.cabin_class.trim();
  const raw = {
    name: data.name.trim(),
    enabled: data.enabled,
    priority: Number(data.priority) || 100,
    origin_iata: data.origin_iata.trim() || null,
    destination_iata: data.destination_iata.trim() || null,
    carrier_iata: data.carrier_iata.trim() || null,
    cabin_class: cabin ? (cabin as FlightPricingRuleBody["cabin_class"]) : null,
    commission_percent_override:
      data.commission_percent_override.trim() === ""
        ? null
        : Number(data.commission_percent_override),
    markup_fixed_override: data.markup_fixed_override.trim() || null,
    max_commission_percent:
      data.max_commission_percent.trim() === "" ? null : Number(data.max_commission_percent),
    max_markup_fixed: data.max_markup_fixed.trim() || null,
    effective_from: data.effective_from.trim() || null,
    effective_to: data.effective_to.trim() || null,
    notes: data.notes.trim() || null,
  };
  return flightPricingRuleBodySchema.parse(raw);
}

type Props = {
  mode: "create" | "edit";
  id?: string;
  initial?: Partial<PricingRuleFormValues>;
};

export function PricingRuleForm({ mode, id, initial }: Props) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<PricingRuleFormValues>({
    defaultValues: buildDefaults(initial),
  });

  const formFields: SubFormConfig[] = useMemo(
    () => [
      {
        subform_title: "Rule",
        fields: [
          { name: "name", label: "Name", type: "text", required: true, cols: 12, mdCols: 8 },
          { name: "priority", label: "Priority (lower wins)", type: "number", required: true, cols: 12, mdCols: 4 },
          { name: "enabled", label: "Enable this rule", type: "switch", cols: 12, mdCols: 6 },
        ],
      },
      {
        subform_title: "Match criteria",
        fields: [
          {
            name: "origin_iata",
            label: "Origin IATA",
            type: "text",
            placeholder: "LHR",
            cols: 12,
            mdCols: 4,
          },
          {
            name: "destination_iata",
            label: "Destination IATA",
            type: "text",
            placeholder: "JFK",
            cols: 12,
            mdCols: 4,
          },
          {
            name: "carrier_iata",
            label: "Carrier IATA",
            type: "text",
            cols: 12,
            mdCols: 4,
          },
          {
            name: "cabin_class",
            label: "Cabin class",
            type: "select",
            options: CABIN_OPTIONS,
            cols: 12,
            mdCols: 6,
          },
        ],
      },
      {
        subform_title: "Overrides",
        fields: [
          {
            name: "commission_percent_override",
            label: "Commission % override",
            type: "number",
            cols: 12,
            mdCols: 6,
          },
          {
            name: "markup_fixed_override",
            label: "Markup fixed override",
            type: "text",
            placeholder: "e.g. 5.00",
            cols: 12,
            mdCols: 6,
          },
        ],
      },
      {
        subform_title: "Caps & schedule",
        fields: [
          {
            name: "max_commission_percent",
            label: "Hard cap: commission %",
            type: "number",
            cols: 12,
            mdCols: 6,
          },
          {
            name: "max_markup_fixed",
            label: "Hard cap: fixed markup",
            type: "text",
            placeholder: "e.g. 10.00",
            cols: 12,
            mdCols: 6,
          },
          {
            name: "effective_from",
            label: "Effective from",
            type: "datetime",
            cols: 12,
            mdCols: 6,
          },
          {
            name: "effective_to",
            label: "Effective to",
            type: "datetime",
            cols: 12,
            mdCols: 6,
          },
          {
            name: "notes",
            label: "Notes (admin-only)",
            type: "textarea",
            cols: 12,
            mdCols: 12,
          },
        ],
      },
    ],
    [],
  );

  const onSubmit = async (data: PricingRuleFormValues) => {
    setSubmitError(null);
    try {
      const body = toApiBody(data);
      if (mode === "create") {
        await createFlightPricingRule(body);
      } else if (id) {
        await updateFlightPricingRule(id, body);
      }
      router.push("/admin/flights/pricing-rules");
      router.refresh();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Could not save rule.");
    }
  };

  return (
    <div className="space-y-4">
      {submitError ? (
        <Alert variant="destructive">
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      ) : null}
      <GenericForm
        form={form}
        fields={formFields}
        onSubmit={onSubmit}
        submitText={mode === "create" ? "Create rule" : "Save changes"}
        submittingText={mode === "create" ? "Creating…" : "Saving…"}
        showCancel
        cancelText="Cancel"
        onCancel={() => router.push("/admin/flights/pricing-rules")}
        className="rounded-2xl border border-border bg-background p-4 sm:p-6"
      />
    </div>
  );
}
