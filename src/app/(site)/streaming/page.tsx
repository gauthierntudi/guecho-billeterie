import { Suspense } from "react";
import type { Metadata } from "next";
import { StreamingExperience } from "@/components/streaming/StreamingExperience";
import { getPublicStreamStatus } from "@/lib/streaming";
import { getHeroVideoUrl } from "@/lib/r2-media";
import { buildSiteMetadata } from "@/lib/site-metadata";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildSiteMetadata({
  title: "Streaming live — Guecho Rocambole",
  description:
    "Accédez au live Guecho Rocambole avec votre billet Access Streaming.",
  path: "/streaming",
});

export default async function StreamingPage() {
  const [initialStatus, heroVideoUrl] = await Promise.all([
    getPublicStreamStatus().catch(() => null),
    getHeroVideoUrl().catch(() => null),
  ]);

  return (
    <main className="relative isolate min-h-dvh bg-[#050505] text-white">
      <Suspense
        fallback={
          <p className="px-6 pt-28 text-sm text-amber-100/70">
            Chargement du streaming…
          </p>
        }
      >
        <StreamingExperience
          initialStatus={initialStatus}
          heroVideoUrl={heroVideoUrl}
        />
      </Suspense>
    </main>
  );
}
