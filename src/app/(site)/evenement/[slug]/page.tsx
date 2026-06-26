import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getEventBySlug } from "@/lib/ticketing";
import { buildSiteMetadata } from "@/lib/site-metadata";
import { EventHero } from "@/components/event/EventHero";
import { EventPageBackground } from "@/components/event/EventPageBackground";
import { TicketSelector } from "@/components/ticketing/TicketSelector";
import { StreamingSection } from "@/components/event/StreamingSection";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { DEFAULT_EVENT_SLUG } from "@/lib/site-config";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);

  if (!event) {
    return { title: "Événement introuvable" };
  }

  return buildSiteMetadata({
    title: `${event.title} — Billetterie`,
    description: event.description,
    path: `/evenement/${slug}`,
  });
}

export default async function EventPage({ params }: PageProps) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);

  if (!event) {
    notFound();
  }

  const spectacleTickets = event.ticketTypes.filter(
    (ticket) => ticket.category === "SPECTACLE",
  );
  const streamingTickets = event.ticketTypes.filter(
    (ticket) => ticket.category === "STREAMING",
  );
  const ticketsFirst = slug === DEFAULT_EVENT_SLUG;
  const backgroundImage = ticketsFirst
    ? "/img/s1.jpg"
    : event.coverImage?.startsWith("/img/")
      ? event.coverImage
      : "/img/s1.jpg";

  return (
    <main className="relative isolate bg-[#050505] text-white">
      {ticketsFirst ? (
        <EventPageBackground
          src={backgroundImage}
          alt={`${event.title} — affiche`}
        />
      ) : null}
      <div className="relative z-10">
        <SiteHeader eventTitle={event.title} ticketHref="#billetterie" />
        {!ticketsFirst ? <EventHero event={event} /> : null}
        <TicketSelector
          eventSlug={event.slug}
          spectacleTickets={spectacleTickets}
          streamingTickets={streamingTickets}
          leadSection={ticketsFirst}
        />
        <StreamingSection />
        <SiteFooter bareBackground />
      </div>
    </main>
  );
}
