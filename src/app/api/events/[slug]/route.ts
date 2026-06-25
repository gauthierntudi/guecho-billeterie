import { NextResponse } from "next/server";
import { getEventBySlug } from "@/lib/ticketing";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const event = await getEventBySlug(slug);

  if (!event) {
    return NextResponse.json({ error: "Événement introuvable" }, { status: 404 });
  }

  const ticketTypes = event.ticketTypes.map((ticketType) => ({
    ...ticketType,
    available: ticketType.quantity - ticketType.soldCount,
  }));

  return NextResponse.json({ ...event, ticketTypes });
}
