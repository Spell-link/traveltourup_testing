/**
 * Seeds the fixed developer auth accounts into Supabase Auth + public.users + user_roles.
 * Run after `npm run db:seed` so the `super_admin` and `admin` roles exist.
 */

import "./ensure-env";

import { createClient } from "@supabase/supabase-js";

import { prisma } from "../../src/lib/prisma";
import { seedDeveloperUsers } from "./developer-users";

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceKey) {
    throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  }

  const superAdminRole = await prisma.role.findUnique({ where: { id: "super_admin" } });
  const adminRole = await prisma.role.findUnique({ where: { id: "admin" } });

  if (!superAdminRole || !adminRole) {
    throw new Error('Run "npm run db:seed" first to bootstrap roles and permissions.');
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  await seedDeveloperUsers(supabase);

  console.log(
    "Seeded developer auth users: developers.spelllink@gmail.com (super_admin), developers1.spelllink@gmail.com (admin).",
  );
}

async function run() {
  try {
    await main();
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect().catch(() => undefined);
  }

  if (process.exitCode) {
    process.exit(process.exitCode);
  }
}

void run();
