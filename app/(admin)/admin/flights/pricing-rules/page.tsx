import Link from "next/link";
import PageHeader from "@/components/admin_ui/shared/page-header";
import { listAdminFlightPricingRules } from "@/lib/services/admin/admin-flight-pricing-rules.service";
import { PricingRuleDeleteButton } from "@/components/admin/flights/pricing-rule-delete-button";

export const dynamic = "force-dynamic";

export default async function AdminFlightPricingRulesPage() {
  const rules = await listAdminFlightPricingRules();

  return (
    <div className="space-y-4">
      <PageHeader
        title="Flight pricing rules"
        subtitle="Per-route / cabin / carrier overrides on top of the env-driven defaults. Lower priority wins; hard caps are always enforced."
      />

      <div className="flex flex-wrap items-center gap-2">
        <Link
          className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
          href="/admin/flights"
        >
          ← back to flights
        </Link>
        <Link
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
          href="/admin/flights/pricing-rules/new"
        >
          New rule
        </Link>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-background">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Match</th>
              <th className="px-3 py-2">Override</th>
              <th className="px-3 py-2">Caps</th>
              <th className="px-3 py-2">Priority</th>
              <th className="px-3 py-2">Enabled</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rules.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                  No pricing rules — env defaults are in effect.
                </td>
              </tr>
            ) : (
              rules.map((r) => (
                <tr key={r.id} className="border-t border-border/60">
                  <td className="px-3 py-2 font-medium">
                    <Link className="text-primary hover:underline" href={`/admin/flights/pricing-rules/${r.id}`}>
                      {r.name}
                    </Link>
                    {r.notes ? <p className="text-xs text-muted-foreground">{r.notes}</p> : null}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {[r.origin_iata, r.destination_iata].filter(Boolean).join(" → ") || "any"}
                    {r.carrier_iata ? ` · ${r.carrier_iata}` : ""}
                    {r.cabin_class ? ` · ${r.cabin_class}` : ""}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {r.commission_percent_override != null
                      ? `commission ${r.commission_percent_override}%`
                      : "—"}
                    {r.markup_fixed_override
                      ? `, fixed ${r.markup_fixed_override}`
                      : ""}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {r.max_commission_percent != null ? `≤ ${r.max_commission_percent}%` : ""}
                    {r.max_markup_fixed ? `, ≤ ${r.max_markup_fixed}` : ""}
                    {r.max_commission_percent == null && !r.max_markup_fixed ? "—" : null}
                  </td>
                  <td className="px-3 py-2 text-xs">{r.priority}</td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        r.enabled
                          ? "inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700 ring-1 ring-emerald-200"
                          : "inline-flex rounded-full bg-slate-50 px-2 py-0.5 text-xs text-slate-700 ring-1 ring-slate-200"
                      }
                    >
                      {r.enabled ? "enabled" : "disabled"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <PricingRuleDeleteButton id={r.id} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
