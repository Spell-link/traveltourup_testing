"use client";

import type { ChangeEvent } from "react";
import { Link } from "@/i18n/navigation";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Camera, ChevronLeft, Loader2, Trash2 } from "lucide-react";
import { signOutAction } from "@/lib/auth/actions";
import { useStorageUpload } from "@/components/storage/use-storage-upload";
import { consumeFirstFileFromInput, type StorageUploadResponse } from "@/lib/http/storage.client";
import { cn } from "@/lib/utils";
import { updateMyProfile } from "@/lib/http/user.client";
import { Input } from "@/components/ui/Input";
import { MyBookingsList } from "@/components/bookings/MyBookingsList";
import { WishlistPanel } from "@/components/wishlist/WishlistPanel";

const PROFILE_AVATAR_API = "/api/v1/users/me/avatar";
const SIDEBAR_ITEMS = [
  "My Profile",
  "My Orders",
  // "My Reviews",
  "Wishlist",
  // "Gift Cards",
] as const;

type SidebarKey = (typeof SIDEBAR_ITEMS)[number];

export type ProfileDashboardProfile = {
  first_name: string;
  last_name: string;
  phone: string | null;
  phone_country_code: string | null;
  country_code: string | null;
  currency_id: string;
  avatar_path: string | null;
  updated_at: string;
};

export function ProfileDashboard({
  email,
  profile,
  oauthAvatarUrl = null,
}: {
  email: string | null;
  profile: ProfileDashboardProfile | null;
  /** Google/OAuth profile picture when user has not uploaded an avatar */
  oauthAvatarUrl?: string | null;
}) {
  const searchParams = useSearchParams();
  const highlightOrders = searchParams.get("highlight")?.trim() ?? null;

  const [active, setActive] = useState<SidebarKey>("My Profile");
  /** Below md: true = show content pane only; false = sidebar menu only. Ignored from md upward via CSS. */
  const [mobileShowsContent, setMobileShowsContent] = useState(false);

  useEffect(() => {
    const tab = searchParams.get("tab")?.trim();
    const hl = searchParams.get("highlight")?.trim() ?? "";
    if (tab === "wishlist") {
      setActive("Wishlist");
      setMobileShowsContent(true);
    } else if (tab === "orders" || hl.length > 0) {
      setActive("My Orders");
      setMobileShowsContent(true);
    }
  }, [searchParams]);

  const selectSidebarItem = useCallback((item: SidebarKey) => {
    setActive(item);
    setMobileShowsContent(true);
  }, []);

  return (
    <div className="bg-muted/40 sm:py-8 md:py-12">
      <div className="container mx-auto sm:px-8">
        <div className="flex flex-col overflow-hidden sm:rounded-2xl sm:border border-border bg-card shadow-lg lg:flex-row">
          <aside
            className={cn(
              "w-full shrink-0 border-border bg-muted/50 p-4 lg:w-[280px] lg:border-r",
              mobileShowsContent && "hidden md:block",
            )}
          >
            <h2 className="font-heading text-lg font-semibold text-foreground">Your account</h2>

            <div className="mt-4 md:mt-6 flex sm:flex-col sm:items-center ">
              <SidebarAvatar
                displayName={displayNameFrom(profile, email)}
                profile={profile}
                oauthAvatarUrl={oauthAvatarUrl}
              />
              <div className="flex flex-col px-4 md:px-6 sm:text-center">

              <p className="mt-3 font-semibold text-foreground">{displayNameFrom(profile, email)}</p>
              <p className="text-xs text-muted-foreground break-all">{email ?? "—"}</p>
              </div>
            </div>

            <nav className="mt-4 md:mt-6 space-y-2" aria-label="Account sections">
              {SIDEBAR_ITEMS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => selectSidebarItem(item)}
                  className={cn(
                    "w-full rounded-xl px-4 py-2.5 text-left text-sm font-medium transition",
                    "border border-border bg-background text-foreground hover:bg-muted",
                    active === item &&
                      mobileShowsContent &&
                      "bg-primary text-primary-foreground shadow-sm border-transparent hover:bg-primary hover:text-primary-foreground",
                    active === item &&
                      "md:bg-primary md:text-primary-foreground md:shadow-sm md:border-transparent md:hover:bg-primary md:hover:text-primary-foreground",
                  )}
                >
                  {item}
                </button>
              ))}
              <Link
                href="/profile/flight-activity"
                className={cn(
                  "block w-full rounded-xl px-4 py-2.5 text-left text-sm font-medium transition",
                  "border border-border bg-background text-foreground hover:bg-muted",
                )}
              >
                Flight payments & refunds
              </Link>
            </nav>

            <form action={signOutAction} className="mt-2 md:mt-4">
              <button
                type="submit"
                className="w-full rounded-xl border border-border bg-background py-2.5 text-sm font-medium text-foreground transition hover:bg-muted"
              >
                Logout
              </button>
            </form>
          </aside>

          <div
            className={cn(
              "min-h-[420px] flex-1 bg-muted p-4 sm:p-6 md:p-8",
              !mobileShowsContent && "hidden md:block",
            )}
          >
            {mobileShowsContent ? (
              <div className="mb-4 md:hidden">
                <button
                  type="button"
                  onClick={() => setMobileShowsContent(false)}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
                  Back
                </button>
              </div>
            ) : null}
            {active === "My Profile" ? (
              <ProfilePanel
                key={profile?.updated_at ?? "no-profile"}
                email={email}
                profile={profile}
              />
            ) : active === "My Orders" ? (
              <MyBookingsList highlightRef={highlightOrders} />
            ) : active === "Wishlist" ? (
              <WishlistPanel />
            ) : (
              <PlaceholderPanel title={active} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function displayNameFrom(profile: ProfileDashboardProfile | null, email: string | null) {
  if (profile) {
    const n = `${profile.first_name} ${profile.last_name}`.trim();
    if (n) return n;
  }
  if (email) return email.split("@")[0] ?? email;
  return "Account";
}

function SidebarAvatar({
  displayName,
  profile,
  oauthAvatarUrl,
}: {
  displayName: string;
  profile: ProfileDashboardProfile | null;
  oauthAvatarUrl: string | null;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const { upload, remove, uploadPending, deletePending, busy, error } =
    useStorageUpload({
      variantId: "user-avatar",
      onUploadSuccess: useCallback(
        async (result: StorageUploadResponse) => {
          try {
            await updateMyProfile({ avatar_path: result.path });
          } catch { /* profile patch is best-effort */ }
          router.refresh();
        },
        [router],
      ),
      onDeleteSuccess: useCallback(async () => {
        try {
          await updateMyProfile({ avatar_path: null });
        } catch { /* best-effort */ }
        router.refresh();
      }, [router]),
    });

  const hasAvatar = !!profile?.avatar_path;
  const cacheKey = profile?.updated_at ?? "";
  const canManage = !!profile;

  const initials = useMemo(() => {
    const parts = displayName.split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0];
    const b = parts[1]?.[0];
    return (a && b ? `${a}${b}` : a ?? "?").toUpperCase();
  }, [displayName]);

  const src =
    hasAvatar && cacheKey
      ? `${PROFILE_AVATAR_API}?v=${encodeURIComponent(cacheKey)}`
      : oauthAvatarUrl && oauthAvatarUrl.length > 0
        ? oauthAvatarUrl
        : null;

  const onFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      consumeFirstFileFromInput(e, upload);
    },
    [upload],
  );

  const removeAvatar = useCallback(() => {
    if (profile?.avatar_path) {
      remove(profile.avatar_path);
    }
  }, [remove, profile?.avatar_path]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative sm:h-24 sm:w-24 h-16 w-16 shrink-0">
        <div className="group relative h-full w-full overflow-hidden rounded-full border-2 border-primary/25 bg-muted text-sm font-semibold text-primary">
          {src ? (
            <img
              src={src}
              alt=""
              width={80}
              height={80}
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center" aria-hidden>
              {initials}
            </span>
          )}

          {canManage && hasAvatar ? (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-foreground/55 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
              <button
                type="button"
                disabled={busy}
                onClick={(e) => {
                  e.stopPropagation();
                  removeAvatar();
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-md transition hover:opacity-95 disabled:opacity-50"
                aria-label="Remove profile photo"
              >
                {deletePending ? (
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
                ) : (
                  <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
                )}
              </button>
            </div>
          ) : null}
        </div>

        {canManage ? (
          <>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              onChange={onFileChange}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              className="absolute -right-0.5 -bottom-0.5 z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground shadow-md transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              aria-label={hasAvatar ? "Replace profile photo" : "Upload profile photo"}
            >
              {uploadPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" aria-hidden />
              ) : (
                <Camera className="h-3.5 w-3.5 shrink-0" aria-hidden />
              )}
            </button>
          </>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="max-w-[220px] text-center text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function PlaceholderPanel({ title }: { title: string }) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
      <p className="font-heading text-xl font-semibold text-foreground">{title}</p>
      <p className="mt-2 max-w-sm text-muted-foreground">
        This section is coming soon. Check back later for {title.toLowerCase()}.
      </p>
    </div>
  );
}

function ProfilePanel({
  email,
  profile,
}: {
  email: string | null;
  profile: ProfileDashboardProfile | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);

  const [firstName, setFirstName] = useState(profile?.first_name ?? "");
  const [lastName, setLastName] = useState(profile?.last_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [countryCode, setCountryCode] = useState(profile?.country_code ?? "");
  const [currencyId, setCurrencyId] = useState(profile?.currency_id ?? "");
  const [phoneCountryCode, setPhoneCountryCode] = useState(profile?.phone_country_code ?? "");

  const [dob, setDob] = useState("");


  if (!profile) {
    return (
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">My profile</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your profile record is not ready yet.{" "}
          <Link href="/login" className="text-primary underline">
            Sign in again
          </Link>{" "}
          to finish setup.
        </p>
      </div>
    );
  }

  const onSave = () => {
    setSaveError(null);
    setSaveOk(false);
    const trimmedCountry = countryCode.trim();
    if (trimmedCountry.length > 0 && trimmedCountry.length !== 3) {
      setSaveError("Country / region must be a 3-letter ISO code (e.g. USA) or left empty.");
      return;
    }

    startTransition(async () => {
      const cc = countryCode.trim().toUpperCase();
      const cur = currencyId.trim().toUpperCase();
      const body: Record<string, unknown> = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim() === "" ? null : phone.trim(),
        phone_country_code: phoneCountryCode.trim() === "" ? null : phoneCountryCode.trim(),
      };
      if (cc.length === 3) body.country_code = cc;
      else if (countryCode.trim() === "") body.country_code = null;
      if (cur.length === 3) body.currency_id = cur;

      const res = await fetch("/api/v1/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        setSaveError(typeof json.message === "string" ? json.message : "Could not save profile.");
        return;
      }
      setSaveOk(true);
      router.refresh();
    });
  };

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">My profile</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Manage your personal information and preferences.
      </p>

      <div>
       

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="First name"
            name="firstName"
            value={firstName}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setFirstName(e.target.value)}
          />
          <Input
            label="Last name"
            name="lastName"
            value={lastName}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setLastName(e.target.value)}
          />
          <Input
            label="Email"
            name="email"
            type="email"
            value={email ?? ""}
            readOnly
            className="cursor-not-allowed opacity-80"
          />
          <Input
            label="Contact number"
            name="phone"
            value={phone}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)}
          />
       
      
        
          <div className="col-span-2"> 
          <Input
            label="Date of birth"
            name="dob"
            placeholder="mm/dd/yyyy"
            value={dob}
            type="date"
            onChange={(e: ChangeEvent<HTMLInputElement>) => setDob(e.target.value)}
          />
          </div>
          
      
      
        </div>

        {saveError ? (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {saveError}
          </p>
        ) : null}
        {saveOk ? (
          <p className="mt-4 text-sm text-success" role="status">
            Profile saved.
          </p>
        ) : null}

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onSave}
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}
