import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { localizedCustomerPath } from "@/i18n/locale-path";
import type { AppLocale } from "@/i18n/routing";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getServerAuthz } from "@/lib/authz/session";
import { prisma } from "@/lib/prisma";
import { metadataForLocalizedRoute } from "@/config/metadata.config";
import {
  ProfileDashboard,
  type ProfileDashboardProfile,
} from "@/components/profile/ProfileDashboard";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return metadataForLocalizedRoute(locale, "/profile", {
    robots: { index: false, follow: true },
  });
}

function serializeProfile(row: NonNullable<Awaited<ReturnType<typeof prisma.user.findUnique>>>): ProfileDashboardProfile {
  return {
    first_name: row.first_name,
    last_name: row.last_name,
    phone: row.phone,
    phone_country_code: row.phone_country_code,
    country_code: row.country_code,
    currency_id: row.currency_id,
    avatar_path: row.avatar_path,
    updated_at: row.updated_at.toISOString(),
  };
}

export default async function ProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const { userId } = await getServerAuthz();
  if (!userId) {
    const nextTarget = localizedCustomerPath(locale as AppLocale, "/profile");
    redirect(`/${locale}/login?next=${encodeURIComponent(nextTarget)}`);
  }

  const [supabase, profileRow] = await Promise.all([
    createSupabaseServerClient(),
    prisma.user.findUnique({ where: { id: userId } }),
  ]);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profile = profileRow ? serializeProfile(profileRow) : null;

  const meta = user?.user_metadata as Record<string, unknown> | undefined;
  const oauthAvatarUrl =
    typeof meta?.avatar_url === "string" && meta.avatar_url.length > 0
      ? meta.avatar_url
      : typeof meta?.picture === "string" && meta.picture.length > 0
        ? meta.picture
        : null;

  return (
    <main>
      <Suspense
        fallback={
          <div className="flex min-h-[420px] items-center justify-center bg-muted/40 py-12 text-muted-foreground">
            Loading account…
          </div>
        }
      >
        <ProfileDashboard email={user?.email ?? null} profile={profile} oauthAvatarUrl={oauthAvatarUrl} />
      </Suspense>
    </main>
  );
}


