/**
 * Prisma seed entry. Loads env, runs RBAC bootstrap in one transaction, then blog demo content.
 *
 * Prisma ORM 7: seed is not auto-run after migrate — use `npm run db:seed` explicitly.
 * Re-run seed after adding permissions to PERMISSION_REGISTRY so `role_permissions` for
 * `admin` / `super_admin` includes new catalog entries (e.g. admin.journey:read).
 *
 * @see https://www.prisma.io/docs/orm/prisma-migrate/workflows/seeding
 */
import "./ensure-env";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "../../src/lib/prisma";
import { getBootstrapSummary, runBootstrapSeed } from "./bootstrap";
import { seedDeveloperUsers } from "./developer-users";
import { seedBlogContent } from "./blog-content";

async function main() {
  const summary = getBootstrapSummary();

  await prisma.$transaction(
    async (tx) => {
      await runBootstrapSeed(tx);
    },
    {
      maxWait: 15_000,
      timeout: 120_000,
    },
  );

  await seedBlogContent(prisma);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before seeding developer users.");
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  await seedDeveloperUsers(supabase);

  console.log(
    `Seed OK: ${summary.permissionCount} catalog permissions, ${summary.roleCount} bootstrap roles; grants refreshed for: ${summary.bootstrapRoleIds.join(", ")}. Blog categories & posts upserted.`,
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
