"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type PricingRuleFormValues = {
  name: string;
  enabled: boolean;
  priority: number;
  origin_iata: string | null;
  destination_iata: string | null;
  carrier_iata: string | null;
  cabin_class: "economy" | "premium_economy" | "business" | "first" | null;
  commission_percent_override: number | null;
  markup_fixed_override: string | null;
  max_commission_percent: number | null;
  max_markup_fixed: string | null;
  effective_from: string | null;
  effective_to: string | null;
  notes: string | null;
};

const DEFAULTS: PricingRuleFormValues = {
  name: "",
  enabled: true,
  priority: 100,
  origin_iata: null,
  destination_iata: null,
  carrier_iata: null,
  cabin_class: null,
  commission_percent_override: null,
  markup_fixed_override: null,
  max_commission_percent: null,
  max_markup_fixed: null,
  effective_from: null,
  effective_to: null,
  notes: null,
};

type Props = {
  mode: "create" | "edit";
  id?: string;
  initial?: Partial<PricingRuleFormValues>;
};

export function PricingRuleForm({ mode, id, initial }: Props) {
  const router = useRouter();
  const [values, setValues] = useState<PricingRuleFormValues>({
    ...DEFAULTS,
    ...initial,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = <K extends keyof PricingRuleFormValues>(key: K, value: PricingRuleFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        name: values.name.trim(),
        enabled: values.enabled,
        priority: values.priority,
        origin_iata: values.origin_iata || null,
        destination_iata: values.destination_iata || null,
        carrier_iata: values.carrier_iata || null,
        cabin_class: values.cabin_class || null,
        commission_percent_override:
          values.commission_percent_override == null
            ? null
            : Number(values.commission_percent_override),
        markup_fixed_override: values.markup_fixed_override || null,
        max_commission_percent:
          values.max_commission_percent == null
            ? null
            : Number(values.max_commission_percent),
        max_markup_fixed: values.max_markup_fixed || null,
        effective_from: values.effective_from || null,
        effective_to: values.effective_to || null,
        notes: values.notes || null,
      };
      const url =
        mode === "create"
          ? "/api/v1/admin/flights/pricing-rules"
          : `/api/v1/admin/flights/pricing-rules/${encodeURIComponent(id!)}`;
      const res = await fetch(url, {
        method: mode === "create" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as
        | { success: true; data: { id: string } }
        | { success: false; message?: string };
      if (!res.ok || data.success === false) {
        throw new Error(("message" in data && data.message) || `HTTP ${res.status}`);
      }
      router.push(`/admin/flights/pricing-rules`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save rule.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5 rounded-2xl border border-border bg-background p-4 sm:p-6">
      <FormRow label="Name">
        <input
          required
          value={values.name}
          onChange={(e) => update("name", e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
        />
      </FormRow>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FormRow label="Origin IATA">
          <input
            value={values.origin_iata ?? ""}
            onChange={(e) => update("origin_iata", e.target.value.toUpperCase() || null)}
            maxLength={8}
            className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm uppercase"
          />
        </FormRow>
        <FormRow label="Destination IATA">
          <input
            value={values.destination_iata ?? ""}
            onChange={(e) => update("destination_iata", e.target.value.toUpperCase() || null)}
            maxLength={8}
            className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm uppercase"
          />
        </FormRow>
        <FormRow label="Carrier IATA">
          <input
            value={values.carrier_iata ?? ""}
            onChange={(e) => update("carrier_iata", e.target.value.toUpperCase() || null)}
            maxLength={8}
            className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm uppercase"
          />
        </FormRow>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FormRow label="Cabin class">
          <select
            value={values.cabin_class ?? ""}
            onChange={(e) =>
              update(
                "cabin_class",
                (e.target.value || null) as PricingRuleFormValues["cabin_class"],
              )
            }
            className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          >
            <option value="">any</option>
            <option value="economy">economy</option>
            <option value="premium_economy">premium_economy</option>
            <option value="business">business</option>
            <option value="first">first</option>
          </select>
        </FormRow>
        <FormRow label="Priority (lower wins)">
          <input
            type="number"
            min={0}
            max={10000}
            value={values.priority}
            onChange={(e) => update("priority", Number(e.target.value || 100))}
            className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          />
        </FormRow>
        <FormRow label="Enabled">
          <label className="inline-flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              checked={values.enabled}
              onChange={(e) => update("enabled", e.target.checked)}
            />
            <span className="text-sm">Enable this rule</span>
          </label>
        </FormRow>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormRow label="Commission % override">
          <input
            type="number"
            step="0.01"
            min={0}
            max={100}
            value={values.commission_percent_override ?? ""}
            onChange={(e) =>
              update(
                "commission_percent_override",
                e.target.value === "" ? null : Number(e.target.value),
              )
            }
            className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          />
        </FormRow>
        <FormRow label="Markup fixed override">
          <input
            value={values.markup_fixed_override ?? ""}
            onChange={(e) =>
              update("markup_fixed_override", e.target.value === "" ? null : e.target.value)
            }
            placeholder="e.g. 5.00"
            className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          />
        </FormRow>
        <FormRow label="Hard cap: commission %">
          <input
            type="number"
            step="0.01"
            min={0}
            max={100}
            value={values.max_commission_percent ?? ""}
            onChange={(e) =>
              update(
                "max_commission_percent",
                e.target.value === "" ? null : Number(e.target.value),
              )
            }
            className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          />
        </FormRow>
        <FormRow label="Hard cap: fixed markup">
          <input
            value={values.max_markup_fixed ?? ""}
            onChange={(e) =>
              update("max_markup_fixed", e.target.value === "" ? null : e.target.value)
            }
            placeholder="e.g. 10.00"
            className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          />
        </FormRow>
      </div>

      <FormRow label="Notes (admin-only)">
        <textarea
          value={values.notes ?? ""}
          onChange={(e) => update("notes", e.target.value || null)}
          rows={3}
          className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
        />
      </FormRow>

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy || values.name.trim().length === 0}
          className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Saving…" : mode === "create" ? "Create rule" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
