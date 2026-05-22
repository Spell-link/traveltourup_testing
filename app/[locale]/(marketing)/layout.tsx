import { MarketingLayoutClient } from "@/app/[locale]/(marketing)/MarketingLayoutClient";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MarketingLayoutClient>{children}</MarketingLayoutClient>;
}
