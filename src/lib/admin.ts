import { OrderStatus, TicketStatus } from "@prisma/client";
import { DEFAULT_EVENT_SLUG } from "@/lib/site-config";
import { getCdfPrice } from "@/lib/pricing";
import { generateTicketCode } from "@/lib/flexpaie";
import { prisma } from "@/lib/prisma";

export async function getAdminEvent() {
  return prisma.event.findUnique({
    where: { slug: DEFAULT_EVENT_SLUG },
    include: {
      ticketTypes: {
        orderBy: [{ category: "asc" }, { priceUsd: "asc" }],
      },
    },
  });
}

export async function getAdminStats(eventId: string) {
  const ticketTypes = await prisma.ticketType.findMany({
    where: { eventId },
    orderBy: [{ category: "asc" }, { priceUsd: "asc" }],
  });

  const paidOrderItems = await prisma.orderItem.findMany({
    where: {
      order: {
        eventId,
        status: OrderStatus.PAID,
      },
    },
    select: {
      ticketTypeId: true,
      quantity: true,
      subtotal: true,
      order: { select: { currency: true } },
    },
  });

  const revenueByTicketType = new Map<
    string,
    { quantitySold: number; revenueCdf: number; revenueUsd: number }
  >();

  for (const item of paidOrderItems) {
    const current = revenueByTicketType.get(item.ticketTypeId) ?? {
      quantitySold: 0,
      revenueCdf: 0,
      revenueUsd: 0,
    };
    current.quantitySold += item.quantity;
    if (item.order.currency === "USD") {
      current.revenueUsd += item.subtotal;
    } else {
      current.revenueCdf += item.subtotal;
    }
    revenueByTicketType.set(item.ticketTypeId, current);
  }

  const paidByCurrency = await prisma.order.groupBy({
    by: ["currency"],
    where: { eventId, status: OrderStatus.PAID },
    _sum: { totalAmount: true },
    _count: true,
  });

  const totalRevenueCdf =
    paidByCurrency.find((group) => group.currency === "CDF")?._sum.totalAmount ?? 0;
  const totalRevenueUsd =
    paidByCurrency.find((group) => group.currency === "USD")?._sum.totalAmount ?? 0;
  const paidOrdersCount = paidByCurrency.reduce(
    (sum, group) => sum + group._count,
    0,
  );

  const ordersByStatus = await prisma.order.groupBy({
    by: ["status"],
    where: { eventId },
    _count: true,
  });

  const ticketStats = ticketTypes.map((ticketType) => {
    const paid = revenueByTicketType.get(ticketType.id);
    const soldPercent =
      ticketType.quantity > 0
        ? Math.round((ticketType.soldCount / ticketType.quantity) * 100)
        : 0;

    return {
      id: ticketType.id,
      name: ticketType.name,
      tier: ticketType.tier,
      category: ticketType.category,
      priceUsd: ticketType.priceUsd,
      priceCdf: ticketType.price,
      quantity: ticketType.quantity,
      soldCount: ticketType.soldCount,
      available: ticketType.quantity - ticketType.soldCount,
      soldPercent,
      isActive: ticketType.isActive,
      paidQuantity: paid?.quantitySold ?? 0,
      revenueCdf: paid?.revenueCdf ?? 0,
      revenueUsd: paid?.revenueUsd ?? 0,
    };
  });

  const totalCapacity = ticketTypes.reduce(
    (sum, ticketType) => sum + ticketType.quantity,
    0,
  );
  const totalTicketsSold = ticketTypes.reduce(
    (sum, ticketType) => sum + ticketType.soldCount,
    0,
  );
  const fillRate =
    totalCapacity > 0 ? Math.round((totalTicketsSold / totalCapacity) * 100) : 0;

  const spectacleStats = ticketStats.filter(
    (ticket) => ticket.category === "SPECTACLE",
  );
  const streamingStats = ticketStats.filter(
    (ticket) => ticket.category === "STREAMING",
  );

  const recentOrders = await prisma.order.findMany({
    where: { eventId },
    take: 6,
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        include: {
          ticketType: { select: { name: true } },
        },
      },
    },
  });

  const paidItemsForFlow = await prisma.orderItem.findMany({
    where: {
      order: {
        eventId,
        status: OrderStatus.PAID,
      },
    },
    select: {
      ticketTypeId: true,
      quantity: true,
      subtotal: true,
      orderId: true,
      order: { select: { createdAt: true, currency: true } },
    },
  });

  const salesFlow = buildSalesFlowSeries(
    paidItemsForFlow,
    ticketTypes.map((ticket) => ({ id: ticket.id, name: ticket.name })),
    7,
  );

  return {
    ticketStats,
    totalRevenueCdf,
    totalRevenueUsd,
    totalTicketsSold,
    totalCapacity,
    fillRate,
    spectacleSold: spectacleStats.reduce(
      (sum, ticket) => sum + ticket.soldCount,
      0,
    ),
    streamingSold: streamingStats.reduce(
      (sum, ticket) => sum + ticket.soldCount,
      0,
    ),
    paidOrdersCount,
    ordersByStatus: Object.fromEntries(
      ordersByStatus.map((group) => [group.status, group._count]),
    ),
    recentOrders: recentOrders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      status: order.status,
      totalAmount: order.totalAmount,
      currency: order.currency,
      createdAt: order.createdAt.toISOString(),
      items: order.items.map((item) => ({
        quantity: item.quantity,
        name: item.ticketType.name,
      })),
    })),
    salesFlow,
  };
}

function buildSalesFlowSeries(
  items: Array<{
    ticketTypeId: string;
    quantity: number;
    subtotal: number;
    orderId: string;
    order: { createdAt: Date; currency: string };
  }>,
  ticketTypes: Array<{ id: string; name: string }>,
  days: number,
) {
  const tickets = [
    { id: "all", name: "Tous les billets" },
    ...ticketTypes.map((ticket) => ({ id: ticket.id, name: ticket.name })),
  ];

  const byTicket = Object.fromEntries(
    tickets.map((ticket) => [
      ticket.id,
      buildSalesFlowForTicket(
        items,
        ticket.id === "all" ? undefined : ticket.id,
        days,
      ),
    ]),
  );

  return { tickets, byTicket };
}

function buildSalesFlowForTicket(
  items: Array<{
    ticketTypeId: string;
    quantity: number;
    subtotal: number;
    orderId: string;
    order: { createdAt: Date; currency: string };
  }>,
  ticketTypeId: string | undefined,
  days: number,
) {
  const formatter = new Intl.DateTimeFormat("fr-FR", { weekday: "short" });
  const scopedItems = ticketTypeId
    ? items.filter((item) => item.ticketTypeId === ticketTypeId)
    : items;

  return Array.from({ length: days }, (_, index) => {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    dayStart.setDate(dayStart.getDate() - (days - 1 - index));

    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const dayItems = scopedItems.filter(
      (item) =>
        item.order.createdAt >= dayStart && item.order.createdAt < dayEnd,
    );

    const orderIds = new Set(dayItems.map((item) => item.orderId));

    return {
      date: dayStart.toISOString(),
      label: formatter.format(dayStart).replace(".", ""),
      revenueCdf: dayItems
        .filter((item) => item.order.currency !== "USD")
        .reduce((sum, item) => sum + item.subtotal, 0),
      revenueUsd: dayItems
        .filter((item) => item.order.currency === "USD")
        .reduce((sum, item) => sum + item.subtotal, 0),
      orders: orderIds.size,
      quantity: dayItems.reduce((sum, item) => sum + item.quantity, 0),
    };
  });
}

export async function listAdminOrders(eventId: string) {
  return prisma.order.findMany({
    where: { eventId },
    include: {
      items: {
        include: {
          ticketType: true,
          tickets: true,
        },
      },
      payment: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAdminOrder(orderId: string, eventId: string) {
  return prisma.order.findFirst({
    where: { id: orderId, eventId },
    include: {
      items: {
        include: {
          ticketType: true,
          tickets: true,
        },
      },
      payment: true,
      event: { select: { slug: true, title: true } },
    },
  });
}

export async function updateAdminOrder(
  orderId: string,
  eventId: string,
  data: {
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
  },
) {
  const existing = await getAdminOrder(orderId, eventId);
  if (!existing) {
    return { error: "Commande introuvable" as const };
  }

  const order = await prisma.order.update({
    where: { id: orderId },
    data: {
      ...(data.customerName !== undefined
        ? { customerName: data.customerName }
        : {}),
      ...(data.customerEmail !== undefined
        ? { customerEmail: data.customerEmail }
        : {}),
      ...(data.customerPhone !== undefined
        ? { customerPhone: data.customerPhone }
        : {}),
    },
    include: {
      items: {
        include: {
          ticketType: true,
          tickets: true,
        },
      },
      payment: true,
      event: { select: { slug: true, title: true } },
    },
  });

  return { order };
}

export async function generateMissingTicketsForOrder(
  orderId: string,
  eventId: string,
) {
  const order = await getAdminOrder(orderId, eventId);
  if (!order) {
    return { error: "Commande introuvable" as const };
  }

  if (order.status !== OrderStatus.PAID) {
    return {
      error: "Seules les commandes payées peuvent recevoir des billets" as const,
    };
  }

  let created = 0;

  await prisma.$transaction(async (tx) => {
    for (const item of order.items) {
      const missing = item.quantity - item.tickets.length;
      if (missing <= 0) continue;

      const tickets = Array.from({ length: missing }, () => ({
        orderItemId: item.id,
        ticketCode: generateTicketCode(),
        status: TicketStatus.VALID,
        attendeeName: order.customerName,
        attendeeEmail: order.customerEmail,
      }));

      await tx.ticket.createMany({ data: tickets });
      created += missing;
    }
  });

  if (created === 0) {
    return { error: "Tous les billets sont déjà générés" as const };
  }

  const updated = await getAdminOrder(orderId, eventId);
  return { created, order: updated };
}

export async function countMissingTickets(order: {
  status: OrderStatus;
  items: Array<{ quantity: number; tickets: unknown[] }>;
}) {
  if (order.status !== OrderStatus.PAID) return 0;

  return order.items.reduce(
    (sum, item) => sum + Math.max(0, item.quantity - item.tickets.length),
    0,
  );
}

export async function updateTicketType(
  id: string,
  data: {
    priceUsd?: number;
    quantity?: number;
    isActive?: boolean;
  },
) {
  const existing = await prisma.ticketType.findUnique({ where: { id } });
  if (!existing) {
    return { error: "Type de billet introuvable" as const };
  }

  if (data.quantity !== undefined && data.quantity < existing.soldCount) {
    return {
      error: `Quantité minimale : ${existing.soldCount} (déjà vendus)` as const,
    };
  }

  const ticketType = await prisma.ticketType.update({
    where: { id },
    data: {
      ...(data.priceUsd !== undefined
        ? {
            priceUsd: data.priceUsd,
            price: getCdfPrice(data.priceUsd),
          }
        : {}),
      ...(data.quantity !== undefined ? { quantity: data.quantity } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    },
  });

  return { ticketType };
}

export async function requireAdminEvent() {
  const event = await getAdminEvent();
  if (!event) {
    throw new Error("Événement introuvable");
  }
  return event;
}
