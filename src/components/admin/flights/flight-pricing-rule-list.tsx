"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteFlightPricingRule } from "@/lib/http/admin-flights.client";
import PageHeader from "@/components/admin_ui/shared/page-header";
import DataTable, { type ColumnDef, type ActionMenuItem } from "@/components/admin_ui/shared/data-table";
import { EnabledBadge } from "@/components/admin/flights/flight-admin-badges";
import { FlightNavLinks } from "@/components/admin/flights/flight-nav-links";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/admin_ui/ui/alert-dialog";
import { Button } from "@/components/admin_ui/ui/button";

import type { FlightPricingRuleListRow } from "@/lib/admin/flight-pricing-rule.types";

export type { FlightPricingRuleListRow };

export type FlightPricingRuleListProps = {
  rows: FlightPricingRuleListRow[];
};

export function FlightPricingRuleList({ rows }: FlightPricingRuleListProps) {
  const router = useRouter();
  const [isRefreshPending, startRefreshTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<FlightPricingRuleListRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const onRefresh = useCallback(() => {
    startRefreshTransition(() => {
      router.refresh();
    });
  }, [router, startRefreshTransition]);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteFlightPricingRule(deleteTarget.id);
      toast({ title: "Rule deleted", description: `"${deleteTarget.name}" was removed.` });
      setDeleteTarget(null);
      startRefreshTransition(() => {
        router.refresh();
      });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: e instanceof Error ? e.message : "Could not delete pricing rule.",
      });
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTarget, router, startRefreshTransition]);

  const columns: ColumnDef<FlightPricingRuleListRow>[] = useMemo(
    () => [
      {
        key: "name",
        label: "Name",
        sortable: false,
        className: "font-medium",
        render: (_v, row) => (
          <div>
            <Link className="text-primary hover:underline" href={`/admin/flights/pricing-rules/${row.id}`}>
              {row.name}
            </Link>
            {row.notes ? <p className="text-xs text-muted-foreground">{row.notes}</p> : null}
          </div>
        ),
      },
      { key: "match", label: "Match", sortable: false, className: "text-xs" },
      { key: "override", label: "Override", sortable: false, className: "text-xs" },
      { key: "caps", label: "Caps", sortable: false, className: "text-xs" },
      { key: "priority", label: "Priority", sortable: false, className: "text-xs" },
      {
        key: "enabled",
        label: "Enabled",
        sortable: false,
        render: (_v, row) => <EnabledBadge enabled={row.enabled} />,
      },
    ],
    [],
  );

  const deleteAction: ActionMenuItem<FlightPricingRuleListRow> = {
    label: "Delete",
    icon: <Trash2 className="h-4 w-4" />,
    variant: "destructive",
    onClick: (row) => setDeleteTarget(row),
  };

  return (
    <div className="space-y-4">
      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && !isDeleting && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this pricing rule?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `"${deleteTarget.name}" will be permanently removed. Env defaults apply for unmatched routes.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={() => void confirmDelete()}
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PageHeader
        title="Flight pricing rules"
        subtitle="Per-route / cabin / carrier overrides on top of env-driven defaults. Lower priority wins."
        showAddButton
        addButtonText="New rule"
        onAddClick={() => router.push("/admin/flights/pricing-rules/new")}
        showFilterButton={false}
        showRefreshButton
        onRefresh={onRefresh}
        isRefreshing={isRefreshPending}
      />

      <FlightNavLinks current="pricing" />

      <DataTable<FlightPricingRuleListRow>
        data={rows}
        columns={columns}
        loading={isRefreshPending}
        totalCount={rows.length}
        currentPage={1}
        pageSize={Math.max(rows.length, 1)}
        NoOfCards={0}
        showViewToggle={false}
        enablePermissionChecking={false}
        emptyMessage="No pricing rules — env defaults are in effect."
        actions={{
          view: { enabled: false },
          delete: { enabled: false },
          edit: {
            onClick: (row) => router.push(`/admin/flights/pricing-rules/${row.id}`),
          },
        }}
        customActions={[deleteAction]}
      />
    </div>
  );
}
