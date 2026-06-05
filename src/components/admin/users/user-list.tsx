"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import type { z } from "zod";
import { userAdminListQuerySchema } from "@/lib/validations/user.schema";
import { deleteUser } from "@/lib/http/user.client";
import PageHeader from "@/components/admin_ui/shared/page-header";
import DataTable, { type ColumnDef, type ActionMenuItem } from "@/components/admin_ui/shared/data-table";
import GenericFilter, { type FilterConfig } from "@/components/admin_ui/shared/generic-filter";
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

export type UserListRow = {
  id: string;
  name: string;
  email: string;
  roles: string;
  created: string;
};

type ListQuery = z.infer<typeof userAdminListQuerySchema>;

export type UserListProps = {
  rows: UserListRow[];
  total: number;
  query: ListQuery;
  roles: { id: string; name: string }[];
};

export function UserList({ rows, total, query, roles }: UserListProps) {
  const router = useRouter();
  const [isListPending, startListTransition] = useTransition();
  const [isRefreshPending, startRefreshTransition] = useTransition();
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserListRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const navigate = useCallback(
    (href: string) => {
      startListTransition(() => {
        router.push(href);
      });
    },
    [router, startListTransition],
  );

  const buildQs = useCallback(
    (overrides: Partial<ListQuery>) => {
      const q = { ...query, ...overrides };
      const u = new URLSearchParams();
      u.set("page", String(q.page));
      u.set("limit", String(q.limit));
      if (q.q) u.set("q", q.q);
      if (q.role_id) u.set("role_id", q.role_id);
      if (q.sort) {
        u.set("sort", q.sort);
        u.set("order", q.order);
      }
      return u.toString();
    },
    [query],
  );

  const onRefresh = useCallback(() => {
    startRefreshTransition(() => {
      router.refresh();
    });
  }, [router, startRefreshTransition]);

  const filterConfig: FilterConfig = useMemo(
    () => ({
      fields: [
        {
          key: "q",
          label: "Search",
          type: "text",
          placeholder: "Name…",
          cols: 12,
          mdCols: 6,
        },
        {
          key: "role_id",
          label: "Role",
          type: "select",
          cols: 12,
          mdCols: 6,
          options: [
            { value: "all", label: "All" },
            ...roles.map((r) => ({ value: r.id, label: r.name })),
          ],
        },
      ],
      defaultValues: { q: "", role_id: "all" },
    }),
    [roles],
  );

  const appliedFilters = useMemo(
    () => ({
      q: query.q ?? "",
      role_id: query.role_id ?? "all",
    }),
    [query],
  );

  const onFilterChange = useCallback(
    (filters: Record<string, unknown>) => {
      const u = new URLSearchParams();
      u.set("page", "1");
      u.set("limit", String(query.limit));
      const qq = String(filters.q ?? "").trim();
      if (qq) u.set("q", qq);
      const rid = String(filters.role_id ?? "all");
      if (rid && rid !== "all") u.set("role_id", rid);
      if (query.sort) {
        u.set("sort", query.sort);
        u.set("order", query.order);
      }
      navigate(`/admin/users?${u.toString()}`);
    },
    [navigate, query.limit, query.order, query.sort],
  );

  const hasActiveFilters = useMemo(() => {
    return Boolean((appliedFilters.q ?? "").trim()) || appliedFilters.role_id !== "all";
  }, [appliedFilters]);

  const activeFiltersCount = useMemo(() => {
    let n = 0;
    if ((appliedFilters.q ?? "").trim()) n += 1;
    if (appliedFilters.role_id !== "all") n += 1;
    return n;
  }, [appliedFilters]);

  const columns: ColumnDef<UserListRow>[] = useMemo(
    () => [
      { key: "name", label: "Name", sortable: true, className: "font-medium" },
      { key: "email", label: "Email", sortable: false, className: "text-muted-foreground" },
      { key: "roles", label: "Roles", sortable: false },
      { key: "created", label: "Created", sortable: true, className: "text-muted-foreground whitespace-nowrap" },
    ],
    [],
  );

  const sortColumn = (query.sort === "first_name" ? "name" : "created") as keyof UserListRow;
  const sortDirection = query.order;

  const onSort = useCallback(
    (column: keyof UserListRow, direction: "asc" | "desc") => {
      const sortField = column === "name" ? "first_name" : "created_at";
      navigate(
        `/admin/users?${buildQs({ page: 1, sort: sortField as ListQuery["sort"], order: direction })}`,
      );
    },
    [buildQs, navigate],
  );

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteUser(deleteTarget.id);
      toast({ title: "User deleted", description: `"${deleteTarget.name}" was removed.` });
      setDeleteTarget(null);
      startListTransition(() => {
        router.refresh();
      });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: e instanceof Error ? e.message : "Could not delete user.",
      });
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTarget, router, startListTransition]);

  const deleteAction: ActionMenuItem<UserListRow> = {
    label: "Delete",
    icon: <Trash2 className="h-4 w-4" />,
    variant: "destructive",
    onClick: (row) => {
      setDeleteTarget(row);
    },
  };

  return (
    <div className="space-y-6">
      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && !isDeleting && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this user?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `"${deleteTarget.name}" will be permanently removed from the system. This cannot be undone.`
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
        title="Users"
        subtitle="Manage user accounts, roles, and access."
        showAddButton
        addButtonText="New user"
        onAddClick={() => router.push("/admin/users/new")}
        showFilterButton
        hasActiveFilters={hasActiveFilters}
        isFilterExpanded={isFilterExpanded}
        onFilterToggle={() => setIsFilterExpanded((v) => !v)}
        activeFiltersCount={activeFiltersCount}
        filterText="Filter users"
        clearFiltersText="Clear filters"
        showRefreshButton
        onRefresh={onRefresh}
        isRefreshing={isRefreshPending}
      >
        {isFilterExpanded && (
          <GenericFilter
            config={filterConfig}
            values={appliedFilters}
            onFilterChange={onFilterChange}
            collapsible={false}
            presentation="inline"
            title="Filters"
            clearText="Reset"
          />
        )}
      </PageHeader>

      <DataTable<UserListRow>
        data={rows}
        columns={columns}
        loading={isListPending || isRefreshPending}
        totalCount={total}
        currentPage={query.page}
        pageSize={query.limit}
        NoOfCards={0}
        onPageChange={(page) => navigate(`/admin/users?${buildQs({ page })}`)}
        onPageSizeChange={(limit) => navigate(`/admin/users?${buildQs({ page: 1, limit })}`)}
        onSort={onSort}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        showViewToggle={true}
        enablePermissionChecking={false}
        emptyMessage="No users match your filters."
        actions={{
          view: { enabled: false },
          delete: { enabled: false },
          edit: {
            onClick: (row) => router.push(`/admin/users/${row.id}`),
          },
        }}
        customActions={[deleteAction]}
      />
    </div>
  );
}
