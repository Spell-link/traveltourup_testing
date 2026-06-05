/**
 * Bootstrap data for the permission catalog and default roles.
 * - Permissions are fully dynamic in DB; this registry is the **initial** catalog for `npm run db:seed`.
 * - Add new permissions here, run seed, then assign to roles via seed or admin UI / SQL.
 * - Runtime checks use **permission id strings** stored in the database (not this file).
 */

/** Sentinel: seed assigns every catalog permission to this role. */
export const ALL_PERMISSIONS = "*";

export const PERMISSION_REGISTRY = [
  {
    id: "profile:read",
    resource: "profile",
    action: "read",
    category: "account",
    description: "View own profile",
  },
  {
    id: "profile:update",
    resource: "profile",
    action: "update",
    category: "account",
    description: "Update own profile",
  },
  {
    id: "bookings:read_own",
    resource: "bookings",
    action: "read_own",
    category: "bookings",
    description: "View own bookings",
  },
  {
    id: "bookings:create",
    resource: "bookings",
    action: "create",
    category: "bookings",
    description: "Create bookings",
  },
  {
    id: "bookings:cancel_own",
    resource: "bookings",
    action: "cancel_own",
    category: "bookings",
    description: "Cancel own bookings",
  },
  {
    id: "bookings:read_all",
    resource: "bookings",
    action: "read_all",
    category: "bookings",
    description: "View all bookings",
  },
  {
    id: "bookings:manage",
    resource: "bookings",
    action: "manage",
    category: "bookings",
    description: "Full booking management",
  },
  {
    id: "admin.hotels:read",
    resource: "admin.hotels",
    action: "read",
    category: "admin",
    description: "View admin hotel catalog",
  },
  {
    id: "admin.hotels:write",
    resource: "admin.hotels",
    action: "write",
    category: "admin",
    description: "Manage hotels",
  },
  {
    id: "admin.hotels:delete",
    resource: "admin.hotels",
    action: "delete",
    category: "admin",
    description: "Delete hotels",
  },
  {
    id: "admin.cars:read",
    resource: "admin.cars",
    action: "read",
    category: "admin",
    description: "View admin car catalog",
  },
  {
    id: "admin.cars:write",
    resource: "admin.cars",
    action: "write",
    category: "admin",
    description: "Manage cars",
  },
  {
    id: "admin.cars:delete",
    resource: "admin.cars",
    action: "delete",
    category: "admin",
    description: "Delete cars",
  },
  {
    id: "admin.journey:read",
    resource: "admin.journey",
    action: "read",
    category: "admin",
    description: "View customer booking funnel and abandoned intents",
  },
  {
    id: "admin.blogs:read",
    resource: "admin.blogs",
    action: "read",
    category: "admin",
    description: "View blog posts and categories",
  },
  {
    id: "admin.blogs:write",
    resource: "admin.blogs",
    action: "write",
    category: "admin",
    description: "Create and update blog posts",
  },
  {
    id: "admin.blogs:delete",
    resource: "admin.blogs",
    action: "delete",
    category: "admin",
    description: "Delete blog posts",
  },
  {
    id: "admin.settings:read",
    resource: "admin.settings",
    action: "read",
    category: "admin",
    description: "View admin settings",
  },
  {
    id: "admin.settings:write",
    resource: "admin.settings",
    action: "write",
    category: "admin",
    description: "Change admin settings",
  },
  {
    id: "admin.rbac:manage",
    resource: "admin.rbac",
    action: "manage",
    category: "admin",
    description: "Manage roles and permission grants",
  },
  {
    id: "supplier.catalog:read",
    resource: "supplier.catalog",
    action: "read",
    category: "supplier",
    description: "View supplier catalog scope",
  },
  {
    id: "supplier.catalog:write",
    resource: "supplier.catalog",
    action: "write",
    category: "supplier",
    description: "Manage supplier offerings",
  },
  {
    id: "supplier.orders:read",
    resource: "supplier.orders",
    action: "read",
    category: "supplier",
    description: "View supplier-related orders",
  },
  {
    id: "agent.clients:read",
    resource: "agent.clients",
    action: "read",
    category: "agent",
    description: "View assigned clients",
  },
  {
    id: "agent.bookings:create",
    resource: "agent.bookings",
    action: "create",
    category: "agent",
    description: "Create bookings on behalf of clients",
  },
  {
    id: "agent.bookings:read",
    resource: "agent.bookings",
    action: "read",
    category: "agent",
    description: "View agent-scoped bookings",
  },
  {
    id: "admin.users:read",
    resource: "admin.users",
    action: "read",
    category: "admin",
    description: "View user profiles in admin",
  },
  {
    id: "admin.users:write",
    resource: "admin.users",
    action: "write",
    category: "admin",
    description: "Create and update users in admin",
  },
  {
    id: "admin.roles:read",
    resource: "admin.roles",
    action: "read",
    category: "admin",
    description: "View roles in admin",
  },
  {
    id: "admin.roles:write",
    resource: "admin.roles",
    action: "write",
    category: "admin",
    description: "Create and update roles in admin",
  },
  {
    id: "admin.roles:delete",
    resource: "admin.roles",
    action: "delete",
    category: "admin",
    description: "Delete roles in admin",
  },
  {
    id: "admin.permissions:read",
    resource: "admin.permissions",
    action: "read",
    category: "admin",
    description: "View permission catalog in admin",
  },
] as const;

export type PermissionId = (typeof PERMISSION_REGISTRY)[number]["id"];

const CATALOG_IDS = PERMISSION_REGISTRY.map((p) => p.id);

export type RoleBootstrap = {
  id: string;
  name: string;
  description: string;
  /** Lower sorts first in UIs */
  sortOrder: number;
  /** System roles are protected from accidental deletion in app logic */
  isSystem: boolean;
  /**
   * Permission ids from the catalog, or `ALL_PERMISSIONS` to grant every catalog permission at seed time.
   * Add new permissions to PERMISSION_REGISTRY and re-seed to update admin-like roles using `ALL_PERMISSIONS`.
   */
  permissionRefs: readonly string[] | typeof ALL_PERMISSIONS;
};

/** Default roles shipped with the product; more can be created in DB at runtime. */
export const ROLE_BOOTSTRAP: readonly RoleBootstrap[] = [
  {
    id: "super_admin",
    name: "Super Admin",
    description: "Full system control — users, roles, settings, all modules",
    sortOrder: -10,
    isSystem: true,
    permissionRefs: ALL_PERMISSIONS,
  },
  {
    id: "admin",
    name: "Admin",
    description: "Full platform administration",
    sortOrder: 0,
    isSystem: true,
    permissionRefs: ALL_PERMISSIONS,
  },
  {
    id: "supplier",
    name: "Supplier",
    description: "Inventory and supplier-side orders",
    sortOrder: 20,
    isSystem: true,
    permissionRefs: [
      "profile:read",
      "profile:update",
      "supplier.catalog:read",
      "supplier.catalog:write",
      "supplier.orders:read",
      "bookings:read_own",
    ],
  },
  {
    id: "agent",
    name: "Agent",
    description: "Travel agent / bookings on behalf of clients",
    sortOrder: 10,
    isSystem: true,
    permissionRefs: [
      "profile:read",
      "profile:update",
      "agent.clients:read",
      "agent.bookings:create",
      "agent.bookings:read",
      "bookings:read_own",
      "bookings:create",
    ],
  },
  {
    id: "customer",
    name: "Customer",
    description: "Standard traveler account",
    sortOrder: 30,
    isSystem: true,
    permissionRefs: [
      "profile:read",
      "profile:update",
      "bookings:read_own",
      "bookings:create",
      "bookings:cancel_own",
    ],
  },
];

/** Ids of bootstrap roles — useful for default assignment. */
export const DEFAULT_CUSTOMER_ROLE_ID = "customer" as const;

/** Roles that may access the admin panel. */
export const ADMIN_PANEL_ROLE_IDS = ["super_admin", "admin"] as const;

/** Roles whose name, description, and permissions cannot be changed or deleted via the API. */
export const PROTECTED_ROLE_IDS = ["super_admin", "admin"] as const;

export function expandRolePermissionRefs(refs: RoleBootstrap["permissionRefs"]): string[] {
  if (refs === ALL_PERMISSIONS) {
    return [...CATALOG_IDS];
  }
  return [...refs];
}
