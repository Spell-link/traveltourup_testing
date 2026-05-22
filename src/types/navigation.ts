export interface NavLink {
  href: string;
  label: string;
}

/** Footer column links — labels resolve via `useTranslations('Footer')[labelKey]`. */
export interface FooterNavLink {
  href: string;
  labelKey: string;
}

export interface Language {
  name: string;
  /** Flag CDN country code (flagcdn.com). */
  code: string;
  /** URL `[locale]` segment (BCP 47). */
  locale: string;
}

export interface Currency {
  name: string;
  code: string;
}

export interface FooterSocialLink {
  href: string;
  icon: string;
  /** Message key under Footer namespace. */
  labelKey: string;
}

export interface BreadcrumbItem {
  label: string;
  href: string;
  isCurrentPage?: boolean;
}

export interface FooterContact {
  // address: string;
  // addressLine2?: string;
  phone: string;
  email: string;
}
