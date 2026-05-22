/**
 * Footer configuration - centralized for maintenance and consistency.
 */

import type { FooterNavLink, FooterSocialLink, FooterContact } from "@/types";

export const QUICK_LINKS: FooterNavLink[] = [
  { href: "/", labelKey: "quick_home" },
  { href: "/flights", labelKey: "quick_flights" },
  { href: "/about", labelKey: "quick_about" },
  { href: "/blog", labelKey: "quick_blog" },
  { href: "/contact", labelKey: "quick_contact" },
];

export const SERVICES: FooterNavLink[] = [
  { href: "/hotels", labelKey: "svc_hotels" },
  { href: "/flights", labelKey: "svc_flights" },
  { href: "/cars", labelKey: "svc_cars" },
  // { href: "/", labelKey: "svc_tours" },
  { href: "/faqs", labelKey: "svc_faqs" },
];

export const SOCIAL_LINKS: FooterSocialLink[] = [
//   NEXT_PUBLIC_TWITTER_SITE=traveltourup
// NEXT_PUBLIC_SOCIAL_TWITTER_URL=https://twitter.com/traveltourup
// NEXT_PUBLIC_SOCIAL_FACEBOOK_URL=https://facebook.com/traveltourup
// NEXT_PUBLIC_SOCIAL_INSTAGRAM_URL=https://instagram.com/traveltourup
// NEXT_PUBLIC_SOCIAL_LINKEDIN_URL=https://linkedin.com/company/traveltourup
  {
    href: process.env.NEXT_PUBLIC_SOCIAL_TWITTER_URL || "",
    labelKey: "social_twitter",
    icon: "twitter",
  },
  {
    href: process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK_URL || "",
    labelKey: "social_facebook",
    icon: "facebook",
  },
  {
    href: process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM_URL || "",
    labelKey: "social_instagram",
    icon: "instagram",
  },
  {
    href: process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN_URL || "",
    labelKey: "social_linkedin",
    icon: "linkedin",
  },
];


// Head Office: 

// Regional office: 0-961 First Floor, Souq-e-Idrees, Main Muree Road Rawalpindi

// Regional office: 781 First Floor, Shadman Colony, Lahore
export const CONTACT: FooterContact = {
  // address: "920 Hylan Blvd Staten Island, NewYork 10305",
  phone: "+1 800 443 0456",
  email: "info@traveltourup.com",
};

export const PAYMENT_METHODS: string[] = ["Visa", "Mastercard", "PayPal", "Amex"];
