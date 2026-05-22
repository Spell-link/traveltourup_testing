import { JsonLd } from "@/components/seo/json-ld";
import { SITE_NAME } from "@/config/brand";
import { CONTACT } from "@/config/footer.config";
import { getSiteUrl } from "@/config/site-url";
import { routing } from "@/i18n/routing";

type SiteJsonLdProps = {
  locale: string;
};

export function SiteJsonLd({ locale: _locale }: SiteJsonLdProps) {
  const base = getSiteUrl();
  const logoUrl = `${base}/favicon.png`;

  const sameAs = [
    process.env.NEXT_PUBLIC_SOCIAL_TWITTER_URL,
    process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK_URL,
    process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM_URL,
    process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN_URL,
  ].filter(Boolean) as string[];

  const org = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: base,
    logo: logoUrl,
    // address: {
    //   "@type": "PostalAddress",
    //   streetAddress: CONTACT.address,
    // },
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: CONTACT.email,
        telephone: CONTACT.phone,
        availableLanguage: routing.locales,
      },
    ],
    ...(sameAs.length ? { sameAs } : {}),
  };

  const webSite = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: base,
    publisher: { "@type": "Organization", name: SITE_NAME },
    inLanguage: routing.locales,
  };

  return <JsonLd data={[org, webSite]} />;
}
