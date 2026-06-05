import { prisma } from "@/lib/prisma";
import { DEFAULT_CUSTOMER_ROLE_ID } from "@/lib/authz/registry";

type EnsureProfileInput = {
  id: string;
  first_name: string;
  last_name: string;
};

/**
 * Ensures the user has the default customer role when none is assigned.
 * Safe to call on every login: does not remove existing roles.
 */
export async function assignDefaultCustomerRole(userId: string) {
  const existing = await prisma.userRole.findFirst({ where: { user_id: userId } });
  if (existing) return;

  await prisma.userRole.create({
    data: {
      user_id: userId,
      role_id: DEFAULT_CUSTOMER_ROLE_ID,
      is_primary: true,
    },
  });
}

/**
 * Call after Supabase sign-up / first sign-in so public.users row exists for RBAC.
 * Assigns the **customer** role when the user has no roles yet (idempotent).
 *
 * If the profile already exists (e.g. created by admin), existing data is
 * preserved — only blank first/last names are back-filled from metadata.
 */
export async function ensureUserProfileForAuthUser(
  input: EnsureProfileInput,
): Promise<{ created: boolean }> {
  const existing = await prisma.user.findUnique({
    where: { id: input.id },
    select: { first_name: true, last_name: true },
  });

  if (!existing) {
    await prisma.user.create({
      data: {
        id: input.id,
        first_name: input.first_name,
        last_name: input.last_name,
      },
    });
    await assignDefaultCustomerRole(input.id);
    return { created: true };
  }

  const updates: Record<string, string> = {};
  if (!existing.first_name.trim() && input.first_name.trim()) {
    updates.first_name = input.first_name;
  }
  if (!existing.last_name.trim() && input.last_name.trim()) {
    updates.last_name = input.last_name;
  }
  if (Object.keys(updates).length > 0) {
    await prisma.user.update({
      where: { id: input.id },
      data: updates,
    });
  }

  await assignDefaultCustomerRole(input.id);
  return { created: false };
}
