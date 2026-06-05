import type { Metadata } from "next";
import { VerifyPhoneCom } from "@/components/auth/VerifyPhoneCom";
import { metadataForLocalizedRoute } from "@/config/metadata.config";
import { safeInternalPath } from "@/lib/auth/redirect";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return metadataForLocalizedRoute(locale, "/verify-phone");
}

type PageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function VerifyPhonePage(props: PageProps) {
  const sp = await props.searchParams;
  const next = safeInternalPath(sp.next);
  return <VerifyPhoneCom defaultNext={next} />;
}
