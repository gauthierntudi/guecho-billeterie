import type { Metadata } from "next";
import { EventPageBackground } from "@/components/event/EventPageBackground";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { TicketLookupForm } from "@/components/ticketing/TicketLookupForm";
import { buildSiteMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = buildSiteMetadata({
  title: "Mes billets — Guecho Rocambole",
  description:
    "Retrouvez vos billets avec votre téléphone de contact ou votre e-mail de paiement.",
  path: "/mes-billets",
});

export default function MesBilletsPage() {
  return (
    <main className="relative isolate min-h-screen bg-[#050505] text-white">
      <EventPageBackground src="/img/s1.jpg" alt="Guecho — fond" />
      <div className="relative z-10">
        <SiteHeader />
        <section className="mx-auto max-w-7xl px-6 pb-24 pt-32">
          <div className="max-w-3xl">
            <p className="text-sm uppercase tracking-[0.3em] text-amber-400">
              Espace billetterie
            </p>
            <h1 className="mt-4 font-[family-name:var(--font-anton)] text-4xl uppercase leading-[0.95] md:text-5xl">
              Mes billets
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-white/55 md:text-base">
              Retrouvez vos passes avec le téléphone de contact saisi à
              l&apos;achat, ou l&apos;e-mail utilisé pour le paiement par carte.
            </p>
          </div>

          <div className="mt-10">
            <TicketLookupForm />
          </div>
        </section>
        <SiteFooter bareBackground />
      </div>
    </main>
  );
}
