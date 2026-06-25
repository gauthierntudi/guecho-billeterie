import { SiteLoaderProvider } from "@/contexts/SiteLoaderContext";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SiteLoaderProvider>{children}</SiteLoaderProvider>;
}
