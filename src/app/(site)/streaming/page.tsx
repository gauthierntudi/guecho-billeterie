import { Suspense } from "react";
import type { Metadata } from "next";
import { EventPageBackground } from "@/components/event/EventPageBackground";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { StreamingGate } from "@/components/streaming/StreamingGate";
import { getPublicStreamStatus } from "@/lib/streaming";
import { buildSiteMetadata } from "@/lib/site-metadata";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildSiteMetadata({
  title: "Streaming live — Guecho Rocambole",
  description:
    "Accédez au live Guecho Rocambole avec votre billet Access Streaming.",
  path: "/streaming",
});

export default async function StreamingPage() {
  const initialStatus = await getPublicStreamStatus().catch(() => null);

  return (
    <main className="relative isolate min-h-dvh bg-[#050505] text-white">
      <EventPageBackground src="/img/s1.jpg" alt="Guecho — streaming" />
      <div className="relative z-10">
        <SiteHeader />
        <section className="mx-auto max-w-5xl px-4 pb-24 pt-28 sm:px-6 sm:pt-32">
          <Suspense
            fallback={
              <p className="text-sm text-amber-100/70">
                Chargement du streaming…
              </p>
            }
          >
            <StreamingGate initialStatus={initialStatus} />
          </Suspense>
        </section>
        <SiteFooter bareBackground />
      </div>
    </main>
  );
}
