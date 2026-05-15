import type { SupabaseClient } from "@supabase/supabase-js";

import { prisma } from "../../src/lib/prisma";
import { findAuthUserIdByEmail } from "./supabase-auth-helpers";

export const DEVELOPER_USER_SEEDS = [
  {
    email: "developers.spelllink@gmail.com",
    password: "SpellLink@123",
    roleId: "super_admin",
    firstName: "Developer",
    lastName: "Spelllink",
  },
  {
    email: "developers1.spelllink@gmail.com",
    password: "SpellLink@123",
    roleId: "admin",
    firstName: "Developer",
    lastName: "Spelllink (1)",
  },
] as const;

export async function seedDeveloperUsers(supabase: SupabaseClient): Promise<void> {
  for (const seed of DEVELOPER_USER_SEEDS) {
    const role = await prisma.role.findUnique({ where: { id: seed.roleId } });
    if (!role) {
      throw new Error(`Role "${seed.roleId}" not found. Run "npm run db:seed" first.`);
    }

    await ensureDeveloperUser(supabase, seed);
  }
}

async function ensureDeveloperUser(
  supabase: SupabaseClient,
  seed: (typeof DEVELOPER_USER_SEEDS)[number],
): Promise<void> {
  const { email, password, roleId, firstName, lastName } = seed;

  let authId = await findAuthUserIdByEmail(supabase, email);

  if (authId) {
    console.log(`Auth user already exists: ${email} → ${authId}`);
    const { error: updErr } = await supabase.auth.admin.updateUserById(authId, {
      password,
      email_confirm: true,
    });
    if (updErr) {
      throw new Error(`Failed to update auth user password (${email}): ${updErr.message}`);
    }
  } else {
    const { data: created, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name: firstName, last_name: lastName },
    });
    if (error || !created?.user?.id) {
      throw new Error(`Failed to create auth user (${email}): ${error?.message ?? "unknown error"}`);
    }

    authId = created.user.id;
    console.log(`Created auth user: ${email} → ${authId}`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.upsert({
      where: { id: authId },
      create: {
        id: authId,
        first_name: firstName,
        last_name: lastName,
      },
      update: {
        first_name: firstName,
        last_name: lastName,
      },
    });

    await tx.userRole.upsert({
      where: { user_id_role_id: { user_id: authId, role_id: roleId } },
      create: {
        user_id: authId,
        role_id: roleId,
        is_primary: true,
      },
      update: { is_primary: true },
    });

    await tx.userRole.deleteMany({
      where: { user_id: authId, role_id: { not: roleId } },
    });
  });

  console.log(`Seed user ready: ${email} (${authId}), role=${roleId}`);
}
