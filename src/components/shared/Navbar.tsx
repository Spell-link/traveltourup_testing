"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import type { User } from "@supabase/supabase-js";
import type { ThemeVariant } from "@/types";
import Image from "next/image";
import NextLink from "next/link";
import { Link, usePathname } from "@/i18n/navigation";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Moon,
  Sun,
  Palette,
  ChevronDown,
  Phone,
  Mail,
  X,
  LogOut,
  User as UserIcon,
  Shield,
  Plane,
  Car,
  Building2,
  LayoutGrid,
} from "lucide-react";

import { useTheme } from "@/components/ThemeProvider";
import { ThemeSelector } from "@/components/ThemeSelector";
import { THEME_VARIANTS } from "@/config/theme.config";
import { VARIANT_LOGOS, DEFAULT_LOGO } from "@/config/logos";
import {
  NAV_LINKS,
  LANGUAGES,
  CURRENCIES,
  getFlagUrl,
} from "@/config/navbar.config";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/components/providers/AuthProvider";
import { signOutAction } from "@/lib/auth/actions";
import { useCurrency } from "@/components/providers/CurrencyProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/admin_ui/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/admin_ui/ui/avatar";
import {
  type MeProfile,
  displayNameForUserMenu,
  initialsFromDisplayName,
  oauthPictureFromMetadata,
} from "@/lib/auth/user-menu-helpers";
import { isRtlLocale } from "@/lib/i18n/rtl";
import { cn } from "@/lib/utils";

const DropdownArrow = ({ className = "w-4 h-4" }) => (
  <ChevronDown className={className} strokeWidth={2} />
);

const DROPDOWN_TYPES = {
  lang: "lang",
  curr: "curr",
  theme: "theme",
  account: "account",
} as const;

type DropdownType = (typeof DROPDOWN_TYPES)[keyof typeof DROPDOWN_TYPES];

const VARIANT_COLORS = {
  ocean: "#0e90c7",
  sapphire: "#1d4ed8",
  crimson: "#be123c",
  aurora: "#7c3aed",
  sunset: "#b45309",
};

const isNavActive = (href: string, pathname: string): boolean =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

const dropdownPanelClass =
  "absolute right-0 top-full mt-1 w-44 bg-muted rounded-xl shadow-xl border border-border py-1 z-[60]";
const accountMenuLinkClass =
  "block w-full px-4 py-3 text-sm font-medium text-foreground hover:bg-primary/10 hover:text-primary transition-colors";
const dropdownItemClass = (isSelected: boolean): string =>
  `flex items-center gap-3 w-full text-left px-4 py-2.5 text-sm transition-colors ${
    isSelected
      ? "bg-primary/10 text-primary font-medium"
      : "text-foreground hover:bg-muted"
  }`;

type MeApiResponse = MeProfile & {
  user_roles?: Array<{ role: { id: string } }>;
};

/** Map NAV_LINKS href → Nav.* message keys */
const NAV_MAIN_KEYS: Record<string, string> = {
  "/": "home",
  "/about": "about",
  "/flights": "flights",
  "/cars": "cars",
  "/hotels": "hotels",
  "/contact": "contact",
};

const ADMIN_ROLE_IDS: ReadonlySet<string> = new Set(["super_admin", "admin"]);

const MOBILE_BOTTOM_TABS = [
  { href: "/flights" as const, labelKey: "flights" as const, Icon: Plane },
  { href: "/hotels" as const, labelKey: "hotels" as const, Icon: Building2 },
  { href: "/cars" as const, labelKey: "cars" as const, Icon: Car },
] as const;

const mobileBottomTabClass = (active: boolean) =>
  cn(
    "flex flex-col items-center justify-center gap-px rounded-xl  px-1 py-1.5 transition-colors duration-200",
    active
      ? "bg-primary/10 text-primary"
      : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
  );

function useMarketingUserMenu(user: User | null) {
  const userId = user?.id ?? null;
  const [meProfile, setMeProfile] = useState<MeProfile | null>(null);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    const fetchedFor = userId;

    void (async () => {
      const res = await fetch("/api/v1/users/me");
      if (!res.ok || cancelled) return;
      const json = (await res.json()) as { data?: MeApiResponse };
      const d = json.data;
      if (!d || cancelled) return;
      const updated = typeof d.updated_at === "string" ? d.updated_at : "";
      setMeProfile({
        first_name: d.first_name,
        last_name: d.last_name,
        avatar_path: d.avatar_path ?? null,
        updated_at: updated,
      });
      setProfileUserId(fetchedFor);
      if (Array.isArray(d.user_roles)) {
        setIsAdmin(d.user_roles.some((ur) => ADMIN_ROLE_IDS.has(ur.role?.id)));
      } else {
        setIsAdmin(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const profileMatchesUser = userId !== null && profileUserId === userId;
  const coherentProfile = profileMatchesUser ? meProfile : null;
  const coherentIsAdmin = profileMatchesUser ? isAdmin : false;

  const displayName = useMemo(() => displayNameForUserMenu(user, coherentProfile), [user, coherentProfile]);
  const email = user?.email ?? "";
  const meta = user?.user_metadata as Record<string, unknown> | undefined;
  const avatarSrc = useMemo(() => {
    if (coherentProfile?.avatar_path && coherentProfile.updated_at) {
      return `/api/v1/users/me/avatar?v=${encodeURIComponent(coherentProfile.updated_at)}`;
    }
    return oauthPictureFromMetadata(meta);
  }, [coherentProfile, meta]);
  const initials = useMemo(() => initialsFromDisplayName(displayName), [displayName]);

  return { displayName, email, avatarSrc, initials, isAdmin: coherentIsAdmin };
}

export default function Navbar() {
  const tNav = useTranslations("Nav");
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const urlLocale = typeof params?.locale === "string" ? params.locale : "en";
  const navMainRtl = isRtlLocale(urlLocale);

  const { user, loading: authLoading } = useAuth();
  const isSignedIn = !authLoading && !!user;
  const userMenu = useMarketingUserMenu(isSignedIn ? user : null);
  const { theme, setTheme, themeVariant, setThemeVariant } = useTheme();
  const { currencyCode, setCurrencyCode } = useCurrency();
  const logo = VARIANT_LOGOS[themeVariant] || DEFAULT_LOGO;
  const language = useMemo(
    () => LANGUAGES.find((l) => l.locale === urlLocale) ?? LANGUAGES[0]!,
    [urlLocale],
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const [openDropdown, setOpenDropdown] = useState<DropdownType | null>(null);

  const closeAll = useCallback(() => {
    setOpenDropdown(null);
    setMobileOpen(false);
  }, [setOpenDropdown, setMobileOpen]);

  const toggleDropdown = useCallback((type: DropdownType) => {
    setOpenDropdown((prev) => (prev === type ? null : type));
  }, [setOpenDropdown]);

  // Close dropdowns on Escape
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAll();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeAll]);

  // Lock body scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const handler = () => {
      if (mq.matches) setMobileOpen(false);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return (
    <>
      {/* Top utility bar */}
      <div className="w-full bg-background border-b border-border">
        <div className="container mx-auto px-4 md:px-10">
          <div className="flex justify-between items-center h-10 text-sm">
            <div className="hidden md:flex items-center gap-6 text-muted-foreground">
              <a href="tel:+92 321 9400142" className="flex items-center gap-2 hover:text-primary transition-colors">
                <Phone className="w-4 h-4" strokeWidth={2} />
                <span>{tNav("phoneDisplay")}</span>
              </a>
              <a href="mailto:info@traveltourup.com" className="flex items-center gap-2 hover:text-primary transition-colors">
                <Mail className="w-4 h-4" strokeWidth={2} />
                <span>{tNav("emailDisplay")}</span>
              </a>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              {/* Language */}
              <div className="relative">
                <button
                  onClick={() => toggleDropdown(DROPDOWN_TYPES.lang)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-muted transition-colors text-foreground"
                  aria-expanded={openDropdown === DROPDOWN_TYPES.lang}
                  aria-haspopup="listbox"
                >
                  <FlagImg code={language.code} className="w-5 h-3.5" />
                  <span className="font-medium">{language.name}</span>
                  <DropdownArrow className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                {openDropdown === DROPDOWN_TYPES.lang && (
                  <>
                    <div className="fixed inset-0 z-[55]" onClick={closeAll} aria-hidden />
                    <div className={`${dropdownPanelClass} w-44`} role="listbox">
                    {LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        role="option"
                        aria-selected={language.code === lang.code}
                        onClick={() => {
                          setOpenDropdown(null);
                          const qs =
                            typeof window !== "undefined" ? window.location.search ?? "" : "";
                          const pathSuffix = pathname === "/" ? "" : pathname;
                          const href = `/${lang.locale}${pathSuffix}${qs}`;
                          router.replace(href, { scroll: false });
                        }}
                        className={dropdownItemClass(language.code === lang.code)}
                      >
                        <FlagImg code={lang.code} className="w-5 h-3.5" />
                        {lang.name}
                      </button>
                    ))}
                    </div>
                  </>
                )}
              </div>

              {/* Currency */}
              <div className="relative">
                <button
                  onClick={() => toggleDropdown(DROPDOWN_TYPES.curr)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-muted transition-colors text-foreground"
                  aria-expanded={openDropdown === DROPDOWN_TYPES.curr}
                  aria-haspopup="listbox"
                >
                  <span className="font-medium">{currencyCode}</span>
                  <DropdownArrow className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                {openDropdown === DROPDOWN_TYPES.curr && (
                  <>
                    <div className="fixed inset-0 z-[55]" onClick={closeAll} aria-hidden />
                    <div className={`${dropdownPanelClass} w-36`} role="listbox">
                      {CURRENCIES.map((cur) => (
                        <button
                          key={cur.code}
                          role="option"
                          aria-selected={currencyCode === cur.name}
                          onClick={() => {
                            setCurrencyCode(cur.name);
                            setOpenDropdown(null);
                          }}
                          className={dropdownItemClass(currencyCode === cur.name)}
                        >
                          {cur.name}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main navigation bar */}
      <nav className="w-full bg-muted shadow-sm border-b border-border static sm:sticky sm:none top-0 z-50">
        <div className="container mx-auto px-4 md:px-10">
          <div className="flex justify-between items-center h-14 lg:h-[80px]">
            <Link href="/" className="flex-shrink-0">
              <Image
                src={logo}
                alt="TravelTourUp"
                width={160}
                height={80}
                className="h-12 lg:h-14 w-auto transition-transform duration-300 hover:scale-[1.05]"
                priority
              />
            </Link>

            <div
              className={cn(
                "hidden lg:flex items-center gap-1",
                navMainRtl && "flex-row-reverse",
              )}
            >
              {NAV_LINKS.map(({ href }) => {
                const active = isNavActive(href, pathname);
                const labelKey = NAV_MAIN_KEYS[href] ?? "home";
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`relative py-2 px-4 text-sm font-medium transition-colors duration-200 group ${
                      active
                        ? "text-primary font-semibold"
                        : "text-muted-foreground hover:text-primary"
                    }`}
                  >
                    {tNav(labelKey)}
                    <span
                      className={cn(
                        "absolute bottom-0 left-4 right-4 h-0.5 bg-primary transition-transform",
                        navMainRtl ? "origin-right" : "origin-left",
                        active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
                      )}
                    />
                  </Link>
                );
              })}
            </div>

            <div className="flex items-center gap-3">
              {/* Theme variant dropdown */}
              <div className="relative">
                <Button
                  variant="icon"
                  size="icon"
                  onClick={() => toggleDropdown(DROPDOWN_TYPES.theme)}
                  className="relative"
                  aria-expanded={openDropdown === DROPDOWN_TYPES.theme}
                  aria-haspopup="menu"
                  aria-label={tNav("themeSettingsAria")}
                >
                  <Palette className="w-5 h-5" />
                  <span
                    className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full border border-background shadow-sm"
                    style={{ backgroundColor: VARIANT_COLORS[themeVariant] || "#0e90c7" }}
                  />
                </Button>
                {openDropdown === DROPDOWN_TYPES.theme && (
                  <>
                    <div className="fixed inset-0 z-[55]" onClick={closeAll} aria-hidden />
                    <div className="absolute right-0 top-full mt-1 w-56 bg-muted rounded-xl shadow-xl border border-border p-3 z-[60]">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {tNav("theme")}
                        </span>
                        <button
                          type="button"
                          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                          className="w-8 h-8 rounded-lg flex items-center justify-center bg-muted hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                          aria-label={theme === "dark" ? tNav("lightModeAria") : tNav("darkModeAria")}
                        >
                          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(THEME_VARIANTS).map(([id, { name }]) => (
                          <button
                            key={id}
                            type="button"
                            onClick={() => {
                              setThemeVariant(id as ThemeVariant);
                              setOpenDropdown(null);
                            }}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              themeVariant === id
                                ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                                : "text-foreground hover:bg-muted"
                            }`}
                            title={name}
                          >
                            <span
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: VARIANT_COLORS[id as keyof typeof VARIANT_COLORS] }}
                            />
                            {name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div className="hidden lg:block relative">
                {isSignedIn && user ? (
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <Avatar className="h-10 w-10 cursor-pointer ring-2 ring-primary/15 transition hover:ring-primary/35">
                        {userMenu.avatarSrc ? (
                          <AvatarImage
                            src={userMenu.avatarSrc}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="object-cover"
                          />
                        ) : null}
                        <AvatarFallback className="text-xs font-semibold">{userMenu.initials}</AvatarFallback>
                      </Avatar>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none truncate">{userMenu.displayName}</p>
                          <p className="text-xs leading-none text-muted-foreground truncate">{userMenu.email || "—"}</p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/profile" className="flex cursor-pointer items-center">
                          <UserIcon className="mr-2 h-4 w-4" />
                          <span>{tNav("profile")}</span>
                        </Link>
                      </DropdownMenuItem>
                      {/* {userMenu.isAdmin && (
                        <DropdownMenuItem asChild>
                          <NextLink href="/admin" className="flex cursor-pointer items-center">
                            <Shield className="mr-2 h-4 w-4" />
                            <span>{tNav("adminPanel")}</span>
                          </NextLink>
                        </DropdownMenuItem>
                      )} */}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={async () => {
                          await signOutAction();
                        }}
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>{tNav("logout")}</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <>
                    <Button
                      variant="primary-cta"
                      size="md"
                      onClick={() => toggleDropdown(DROPDOWN_TYPES.account)}
                      className="px-5 py-2.5"
                      aria-expanded={openDropdown === DROPDOWN_TYPES.account}
                      aria-haspopup="menu"
                    >
                      {tNav("account")}
                      <DropdownArrow className="w-4 h-4 text-primary-foreground/90" />
                    </Button>
                    {openDropdown === DROPDOWN_TYPES.account && (
                      <>
                        <div className="fixed inset-0 z-[55]" onClick={closeAll} aria-hidden />
                        <div className={`${dropdownPanelClass} mt-2 min-w-[12.5rem] max-w-[min(18rem,calc(100vw-2rem))]`} role="menu">
                          <Link href="/login" onClick={closeAll} role="menuitem" className={accountMenuLinkClass}>
                            {tNav("login")}
                          </Link>
                          <Link href="/signup" onClick={closeAll} role="menuitem" className={accountMenuLinkClass}>
                            Sign Up
                          </Link>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>

              <Link
                href={isSignedIn ? "/profile" : "/login"}
                className="lg:hidden shrink-0 rounded-xl p-1 transition-colors hover:bg-muted/80"
                aria-label={isSignedIn ? tNav("profile") : tNav("login")}
              >
                {isSignedIn ? (
                  <Avatar className="h-10 w-10 ring-2 ring-primary/15 transition hover:ring-primary/35">
                    {userMenu.avatarSrc ? (
                      <AvatarImage
                        src={userMenu.avatarSrc}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="object-cover"
                      />
                    ) : null}
                    <AvatarFallback className="text-xs font-semibold">{userMenu.initials}</AvatarFallback>
                  </Avatar>
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-foreground">
                    <UserIcon className="h-5 w-5" strokeWidth={2} />
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile menu — full-screen overlay, links centered, motion enter/exit */}
      <AnimatePresence>
        {mobileOpen ? (
          <motion.div
            key="mobile-nav"
            className="lg:hidden fixed inset-0 z-[60] flex flex-col bg-background"
            role="dialog"
            aria-modal="true"
            aria-label={tNav("navigationSection")}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: reduceMotion ? 0.01 : 0.22,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <motion.div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/[0.08] via-transparent to-muted/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0.01 : 0.35 }}
            />
            <div className="relative flex min-h-0 flex-1 flex-col">
              <header className="flex shrink-0 items-center justify-between px-4 pt-[max(0.625rem,env(safe-area-inset-top))] pb-1">
                <Image
                  src={logo}
                  alt="TravelTourUp"
                  width={120}
                  height={48}
                  className="h-12 w-auto"
                />
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted"
                  aria-label={tNav("closeMenu")}
                >
                  <X className="h-5 w-5" strokeWidth={2} />
                </button>
              </header>

              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
             
                <nav className="flex flex-1 flex-col items-center justify-center gap-1 px-6 pb-2 pt-2">
                  {NAV_LINKS.map(({ href }, index) => {
                    const active = isNavActive(href, pathname);
                    const labelKey = NAV_MAIN_KEYS[href] ?? "home";
                    return (
                      <motion.div
                        key={href}
                        className="w-full max-w-xs"
                        initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          delay: reduceMotion ? 0 : 0.06 + index * 0.055,
                          duration: reduceMotion ? 0 : 0.34,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                      >
                        <Link
                          href={href}
                          onClick={() => setMobileOpen(false)}
                          className={`block w-full py-2.5 text-center text-lg font-semibold tracking-tight outline-none ring-0 ring-offset-0 transition-colors focus-visible:underline focus-visible:decoration-2 focus-visible:underline-offset-[10px] focus-visible:decoration-primary ${
                            active ? "text-primary" : "text-foreground hover:text-primary"
                          }`}
                        >
                          {tNav(labelKey)}
                        </Link>
                      </motion.div>
                    );
                  })}
                </nav>

                <motion.footer
                  className="mx-auto w-full max-w-sm shrink-0 space-y-5 border-t border-border px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-6"
                  initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: reduceMotion ? 0 : 0.12,
                    duration: reduceMotion ? 0 : 0.32,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  <div>
                  
                    <div className="flex  gap-3 sm:flex-row sm:gap-2">
                      <label className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="text-xs text-muted-foreground">{tNav("language")}</span>
                        <select
                          className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-medium text-foreground"
                          value={language.locale}
                          onChange={(e) => {
                            const lang = LANGUAGES.find((l) => l.locale === e.target.value);
                            if (!lang) return;
                            const qs =
                              typeof window !== "undefined" ? window.location.search ?? "" : "";
                            const pathSuffix = pathname === "/" ? "" : pathname;
                            router.replace(`/${lang.locale}${pathSuffix}${qs}`, { scroll: false });
                          }}
                        >
                          {LANGUAGES.map((lang) => (
                            <option key={lang.code} value={lang.locale}>
                              {lang.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="text-xs text-muted-foreground">{tNav("currency")}</span>
                        <select
                          className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-medium text-foreground"
                          value={currencyCode}
                          onChange={(e) => setCurrencyCode(e.target.value)}
                        >
                          {CURRENCIES.map((cur) => (
                            <option key={cur.code} value={cur.name}>
                              {cur.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </div>
                  <div className="space-y-2 pt-1">
                    {isSignedIn ? (
                      <>
                        <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/80 p-2">
                          <Avatar className="h-12 w-12 shrink-0">
                            {userMenu.avatarSrc ? (
                              <AvatarImage
                                src={userMenu.avatarSrc}
                                alt=""
                                referrerPolicy="no-referrer"
                                className="object-cover"
                              />
                            ) : null}
                            <AvatarFallback className="text-sm font-semibold">{userMenu.initials}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1 text-left">
                            <p className="truncate font-semibold text-foreground">{userMenu.displayName}</p>
                            <p className="truncate text-xs text-muted-foreground" title={userMenu.email}>
                              {userMenu.email || "—"}
                            </p>
                          </div>
                        </div>
                        <div className="flex w-full gap-2">
                          <Link
                            href="/profile"
                            onClick={() => setMobileOpen(false)}
                            className="min-w-0 flex-1"
                          >
                            <span className="block w-full rounded-xl bg-primary py-3 text-center text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-600">
                              {tNav("profile")}
                            </span>
                          </Link>
                          {/* {userMenu.isAdmin && (
                            <NextLink
                              href="/admin"
                              onClick={() => setMobileOpen(false)}
                              className="min-w-0 flex-1"
                            >
                              <span className="block w-full rounded-xl border-2 border-primary py-3 text-center text-sm font-semibold text-primary transition-colors hover:bg-primary/10">
                                {tNav("adminPanel")}
                              </span>
                            </NextLink>
                          )} */}
                          <form action={signOutAction} className="min-w-0 flex-1">
                            <button
                              type="submit"
                              className="block w-full rounded-xl border-2 border-primary py-3 text-center text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
                            >
                              {tNav("logout")}
                            </button>
                          </form>
                        </div>
                      </>
                    ) : (
                      <div className="flex w-full gap-2">
                        <Link
                          href="/login"
                          onClick={() => setMobileOpen(false)}
                          className="min-w-0 flex-1"
                        >
                          <span className="block w-full rounded-xl bg-primary py-3 text-center text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-600">
                            {tNav("login")}
                          </span>
                        </Link>
                        <Link
                          href="/signup"
                          onClick={() => setMobileOpen(false)}
                          className="min-w-0 flex-1"
                        >
                          <span className="block w-full rounded-xl border-2 border-primary py-3 text-center text-sm font-semibold text-primary transition-colors hover:bg-primary/10">
                            {tNav("signup")}
                          </span>
                        </Link>
                      </div>
                    )}
                  </div>
                </motion.footer>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Mobile bottom tab bar — All Services reuses setMobileOpen (former hamburger) */}
      <nav
        className="lg:hidden fixed inset-x-0 bottom-0 z-50 border-t border-border bg-muted/95 backdrop-blur-md rounded-t-2xl supports-[backdrop-filter]:bg-muted/80 pb-[max(env(safe-area-inset-bottom))]"
        aria-label={tNav("navigationSection")}
      >
        <div className="grid grid-cols-4">
          {MOBILE_BOTTOM_TABS.map(({ href, labelKey, Icon }) => {
            const active = isNavActive(href, pathname);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={mobileBottomTabClass(active)}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-7 w-7 shrink-0" strokeWidth={active ? 2.25 : 2} />
                <span className="text-[12px] font-semibold leading-tight">{tNav(labelKey)}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            className={mobileBottomTabClass(mobileOpen)}
            aria-label={tNav("allServices")}
            aria-expanded={mobileOpen}
          >
            <LayoutGrid className="h-5 w-5 shrink-0" strokeWidth={mobileOpen ? 2.25 : 2} />
            <span className="text-[10px] font-semibold leading-tight">{tNav("allServices")}</span>
          </button>
        </div>
      </nav>
    </>
  );
}

function FlagImg({ code, className }: { code: string; className?: string }) {
  return (
    <Image
      src={getFlagUrl(code)}
      width={40}
      height={24}
      className={`object-cover rounded ${className}`}
      alt=""
      onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
    />
  );
}

