import { LandingPage } from "@/components/landing/LandingPage";
import { getHeroVideoUrl } from "@/lib/r2-media";

export default async function Home() {
  const heroVideoUrl = await getHeroVideoUrl();

  return <LandingPage heroVideoUrl={heroVideoUrl} />;
}
