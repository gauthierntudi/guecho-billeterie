import { PrismaClient, TicketCategory, TicketTier } from "@prisma/client";

const prisma = new PrismaClient();

const EXCHANGE_RATE = Number(process.env.CDF_EXCHANGE_RATE ?? 2300);
const EVENT_SLUG =
  process.env.NEXT_PUBLIC_DEFAULT_EVENT_SLUG ?? "guecho-live-2026";
const LEGACY_EVENT_SLUG = "guecho-live-2026";

const TICKET_TYPES = [
  {
    tier: TicketTier.STANDARD,
    category: TicketCategory.SPECTACLE,
    name: "Standard",
    description: "Accès fosse & gradins — vue panoramique",
    priceUsd: 10,
    quantity: 500,
  },
  {
    tier: TicketTier.VIP,
    category: TicketCategory.SPECTACLE,
    name: "VIP",
    description: "Zone premium, accès lounge & boissons incluses",
    priceUsd: 50,
    quantity: 150,
  },
  {
    tier: TicketTier.VVIP,
    category: TicketCategory.SPECTACLE,
    name: "VVIP",
    description: "Carré or, rencontre artistes & place assise premium",
    priceUsd: 100,
    quantity: 50,
  },
  {
    tier: TicketTier.STREAMING_ACCESS,
    category: TicketCategory.STREAMING,
    name: "Access Streaming",
    description: "Accès live HD + replay 48h — partout dans le monde",
    priceUsd: 8,
    quantity: 10000,
  },
] as const;

function toCdf(priceUsd: number) {
  return Math.round(priceUsd * EXCHANGE_RATE);
}

async function migrateEventSlugIfNeeded() {
  if (EVENT_SLUG === LEGACY_EVENT_SLUG) return;

  const legacyEvent = await prisma.event.findUnique({
    where: { slug: LEGACY_EVENT_SLUG },
  });

  if (!legacyEvent) return;

  const targetExists = await prisma.event.findUnique({
    where: { slug: EVENT_SLUG },
  });

  if (targetExists) return;

  await prisma.event.update({
    where: { id: legacyEvent.id },
    data: { slug: EVENT_SLUG },
  });

  console.log(`Slug migré : ${LEGACY_EVENT_SLUG} → ${EVENT_SLUG}`);
}

async function main() {
  await migrateEventSlugIfNeeded();

  const event = await prisma.event.upsert({
    where: { slug: EVENT_SLUG },
    update: {
      title: "Guecho Rocambole",
      subtitle: "Une nuit rocambolesque — spectacle & streaming",
      venue: "Musée National RDC",
      city: "Kinshasa",
      coverImage: "/img/s1.jpg",
      startsAt: new Date("2026-08-02T15:00:00+01:00"),
      endsAt: new Date("2026-08-02T23:00:00+01:00"),
      isActive: true,
    },
    create: {
      slug: EVENT_SLUG,
      title: "Guecho Rocambole",
      subtitle: "Une nuit rocambolesque — spectacle & streaming",
      description:
        "Plongez dans l'univers rocambolesque de Guecho : performance live, visuels immersifs et accès streaming mondial. Réservez votre place en salle ou suivez le spectacle en ligne.",
      venue: "Musée National RDC",
      city: "Kinshasa",
      startsAt: new Date("2026-08-02T15:00:00+01:00"),
      endsAt: new Date("2026-08-02T23:00:00+01:00"),
      coverImage: "/img/s1.jpg",
      isActive: true,
    },
  });

  for (const ticket of TICKET_TYPES) {
    const priceCdf = toCdf(ticket.priceUsd);
    await prisma.ticketType.upsert({
      where: {
        eventId_tier: { eventId: event.id, tier: ticket.tier },
      },
      update: {
        name: ticket.name,
        description: ticket.description,
        priceUsd: ticket.priceUsd,
        price: priceCdf,
        quantity: ticket.quantity,
        isActive: true,
      },
      create: {
        eventId: event.id,
        category: ticket.category,
        tier: ticket.tier,
        name: ticket.name,
        description: ticket.description,
        priceUsd: ticket.priceUsd,
        price: priceCdf,
        currency: "CDF",
        quantity: ticket.quantity,
      },
    });
  }

  console.log(
    `Événement seedé : ${event.title} (${event.slug}, taux CDF: ${EXCHANGE_RATE})`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
