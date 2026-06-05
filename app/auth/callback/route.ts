import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureUserProfileForAuthUser } from "@/lib/authz/profile";
import {
  isPhoneVerificationPending,
  markPhoneVerificationRequired,
  PHONE_VERIFY_METADATA,
} from "@/lib/auth/phone-verification";
import { safeInternalPath } from "@/lib/auth/redirect";
import { defaultLocale } from "@/i18n/routing";
import { firstNameFromUserMetadata, lastNameFromUserMetadata } from "@/lib/auth/user-metadata";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeInternalPath(searchParams.get("next") ?? undefined);

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const meta = user.user_metadata as Record<string, unknown> | undefined;
        const { created } = await ensureUserProfileForAuthUser({
          id: user.id,
          first_name: firstNameFromUserMetadata(meta),
          last_name: lastNameFromUserMetadata(meta),
        });

        if (created && !user.phone_confirmed_at) {
          await markPhoneVerificationRequired(user.id);
          await supabase.auth.updateUser({
            data: {
              [PHONE_VERIFY_METADATA.required]: true,
              [PHONE_VERIFY_METADATA.verified]: false,
            },
          });
        }

        if (isPhoneVerificationPending(user)) {
          const verifyUrl = new URL(`/${defaultLocale}/verify-phone`, origin);
          verifyUrl.searchParams.set("next", next);
          return NextResponse.redirect(verifyUrl.toString());
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/${defaultLocale}/login?error=auth`);
}
