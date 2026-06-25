import { NextResponse } from "next/server";
import { isPrismaConnectionError, withDbRetry } from "@/lib/db-retry";
import type { SupportedCurrency } from "@/lib/pricing";
import {
  getPaidOrdersByEmail,
  getPaidOrdersByPhone,
} from "@/lib/ticketing";
import { ticketLookupSchema } from "@/lib/validators";

function mapOrders(
  orders: Awaited<ReturnType<typeof getPaidOrdersByPhone>>,
) {
  return orders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    eventTitle: order.event.title,
    eventSlug: order.event.slug,
    eventStartsAt: order.event.startsAt.toISOString(),
    venue: order.event.venue,
    totalAmount: order.totalAmount,
    currency: order.currency as SupportedCurrency,
    tickets: order.items.flatMap((item) =>
      item.tickets.map((ticket) => ({
        id: ticket.id,
        ticketCode: ticket.ticketCode,
        ticketName: item.ticketType.name,
        tier: item.ticketType.tier,
        category: item.ticketType.category,
      })),
    ),
  }));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = ticketLookupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Téléphone ou email invalide" },
        { status: 400 },
      );
    }

    const phone = parsed.data.phone?.trim() ?? "";
    const email = parsed.data.email?.trim() ?? "";

    const orders = await withDbRetry(() => {
      if (email) {
        return getPaidOrdersByEmail(email);
      }

      return getPaidOrdersByPhone(phone);
    });

    return NextResponse.json({ orders: mapOrders(orders) });
  } catch (error) {
    if (isPrismaConnectionError(error)) {
      return NextResponse.json(
        {
          error:
            "Service temporairement indisponible. Réessayez dans quelques secondes.",
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: "Impossible de récupérer vos billets pour le moment." },
      { status: 500 },
    );
  }
}
