-- Drop wishlist feature
DROP TABLE IF EXISTS "wishlist_items";

-- Clean up orphaned RBAC permission (safe if already absent)
DELETE FROM "role_permissions" WHERE "permission_id" = 'admin.wishlists:read';
DELETE FROM "permissions" WHERE "id" = 'admin.wishlists:read';
