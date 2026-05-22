"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureUserProfileForAuthUser } from "@/lib/authz/profile";
import { forgotPasswordSchema, signInFormSchema, signUpFormSchema } from "@/lib/validations/auth.schema";
import { safeInternalPath } from "@/lib/auth/redirect";
import { defaultLocale } from "@/i18n/routing";
import { firstNameFromUserMetadata, lastNameFromUserMetadata } from "@/lib/auth/user-metadata";

/** Auth emails (confirm, reset, magic link) are sent through SMTP when the Supabase Send Email Hook targets `POST /api/auth/supabase-email-hook`. Avoid sending a separate welcome email here on signup to prevent duplicates. */

export type AuthActionState = {
  error?: string;
  success?: string;
} | null;

async function syncProfileFromAuthUser(user: {
  id: string;
  user_metadata?: Record<string, unknown>;
}) {
  await ensureUserProfileForAuthUser({
    id: user.id,
    first_name: firstNameFromUserMetadata(user.user_metadata),
    last_name: lastNameFromUserMetadata(user.user_metadata),
  });
}

export async function signInAction(_prev: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = signInFormSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { error: first?.message ?? "Invalid input" };
  }

  const next = safeInternalPath(String(formData.get("next") ?? ""));

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: error.message };
  }

  if (data.user) {
    await syncProfileFromAuthUser({
      id: data.user.id,
      user_metadata: data.user.user_metadata as Record<string, unknown> | undefined,
    });
  }

  revalidatePath("/", "layout");
  redirect(next);
}

export async function signUpAction(_prev: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = signUpFormSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    first_name: formData.get("first_name"),
    last_name: formData.get("last_name"),
  });
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { error: first?.message ?? "Invalid input" };
  }

  const next = safeInternalPath(String(formData.get("next") ?? "/"));

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  if (!baseUrl) {
    return {
      error: "Server misconfiguration: set NEXT_PUBLIC_APP_URL in .env.local for signup email links.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        first_name: parsed.data.first_name,
        last_name: parsed.data.last_name,
      },
      emailRedirectTo: `${baseUrl}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.user) {
    await ensureUserProfileForAuthUser({
      id: data.user.id,
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name,
    });
  }

  revalidatePath("/", "layout");

  if (!data.session) {
    return {
      success:
        "Check your email to confirm your account. After confirming, you can sign in.",
    };
  }

  redirect(next);
}

export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect(`/${defaultLocale}/login`);
}

export async function requestPasswordResetAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { error: "Enter a valid email address." };
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL;
  if (!origin) {
    return { error: "App URL is not configured. Set NEXT_PUBLIC_APP_URL in .env.local." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin.replace(/\/$/, "")}/auth/update-password`,
  });

  if (error) {
    return { error: error.message };
  }

  return {
    success: "If an account exists for that email, you will receive a reset link shortly.",
  };
}
