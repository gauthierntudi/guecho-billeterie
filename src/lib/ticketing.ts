import { OrderStatus, PaymentStatus, TicketStatus } from "@prisma/client";
import {
  generateOrderNumber,
  generateTicketCode,
  initiateFlexPayPayment,
  checkFlexPayTransaction,
} from "@/lib/flexpaie";
import { withDbRetry } from "@/lib/db-retry";
import { normalizeStoredPhone, getPhoneLookupVariants } from "@/lib/phone";
import { getTicketPrice } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";

const FULFILL_TRANSACTION_OPTIONS = {
  maxWait: 15_000,
  timeout: 30_000,
} as const;
import { createOrderSchema } from "@/lib/validators";
import type { CreateOrderPayload, CreateOrderResponse } from "@/types/ticketing";

export async function getEventBySlug(slug: string) {
  return prisma.event.findUnique({
    where: { slug, isActive: true },
    include: {
      ticketTypes: {
        where: { isActive: true },
        orderBy: [{ category: "asc" }, { price: "asc" }],
      },
    },
  });
}

export async function createOrderWithPayment(
  payload: CreateOrderPayload,
): Promise<CreateOrderResponse | { error: string; details?: unknown }> {
  return withDbRetry(() => createOrderWithPaymentInternal(payload));
}

async function createOrderWithPaymentInternal(
  payload: CreateOrderPayload,
): Promise<CreateOrderResponse | { error: string; details?: unknown }> {
  const parsed = createOrderSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: "Données invalides", details: parsed.error.flatten() };
  }

  const {
    eventSlug,
    customerName,
    customerEmail,
    customerPhone,
    paymentPhone,
    paymentType,
    currency,
    items,
  } = parsed.data;

  const event = await getEventBySlug(eventSlug);
  if (!event) {
    return { error: "Événement introuvable" };
  }

  const ticketTypeMap = new Map(
    event.ticketTypes.map((ticketType) => [ticketType.id, ticketType]),
  );

  let totalAmount = 0;
  const orderItemsData: {
    ticketTypeId: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }[] = [];

  for (const item of items) {
    const ticketType = ticketTypeMap.get(item.ticketTypeId);
    if (!ticketType) {
      return { error: "Type de billet invalide" };
    }

    const available = ticketType.quantity - ticketType.soldCount;
    if (item.quantity > available) {
      return {
        error: `Stock insuffisant pour ${ticketType.name} (${available} restants)`,
      };
    }

    const unitPrice = getTicketPrice(ticketType, currency);
    const subtotal = unitPrice * item.quantity;
    totalAmount += subtotal;
    orderItemsData.push({
      ticketTypeId: ticketType.id,
      quantity: item.quantity,
      unitPrice,
      subtotal,
    });
  }

  const orderNumber = generateOrderNumber();
  const emailForOrder = customerEmail.trim();

  const order = await prisma.$transaction(async (tx) => {
    const createdOrder = await tx.order.create({
      data: {
        eventId: event.id,
        orderNumber,
        customerName,
        customerEmail: emailForOrder,
        customerPhone: normalizeStoredPhone(customerPhone),
        paymentPhone:
          paymentType === "1" && paymentPhone
            ? normalizeStoredPhone(paymentPhone)
            : null,
        totalAmount,
        currency,
        status: OrderStatus.PENDING,
        items: {
          create: orderItemsData,
        },
        payment: {
          create: {
            amount: totalAmount,
            currency,
            status: PaymentStatus.PENDING,
          },
        },
      },
      include: { items: true, payment: true },
    });

    for (const item of orderItemsData) {
      await tx.ticketType.update({
        where: { id: item.ticketTypeId },
        data: { soldCount: { increment: item.quantity } },
      });
    }

    return createdOrder;
  });

  const payment = await initiateFlexPayPayment({
    orderId: order.id,
    orderNumber: order.orderNumber,
    amount: order.totalAmount,
    currency: order.currency,
    flexPayPhone:
      paymentType === "1" ? (paymentPhone ?? customerPhone) : customerPhone,
    description: `Billets ${event.title}`,
    paymentType,
  });

  if (!payment.success) {
    await rollbackOrder(order.id, orderItemsData);
    return { error: payment.error };
  }

  await prisma.order.update({
    where: { id: order.id },
    data: {
      flexpaieTransactionId:
        payment.mode === "mobile"
          ? payment.orderNumber
          : payment.mode === "card"
            ? payment.orderNumber
            : undefined,
      flexpaieReference: payment.reference,
    },
  });

  if (payment.mode === "mobile") {
    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      mode: "mobile",
      flexPayOrderNumber: payment.orderNumber,
      message: payment.message,
    };
  }

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    mode: "card",
    redirectUrl: payment.url,
    redirectParams: payment.params,
  };
}

async function rollbackOrder(
  orderId: string,
  items: { ticketTypeId: string; quantity: number }[],
) {
  await prisma.$transaction(async (tx) => {
    for (const item of items) {
      await tx.ticketType.update({
        where: { id: item.ticketTypeId },
        data: { soldCount: { decrement: item.quantity } },
      });
    }
    await tx.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.CANCELLED },
    });
    await tx.payment.update({
      where: { orderId },
      data: { status: PaymentStatus.FAILED },
    });
  });
}

export async function fulfillOrder(orderId: string, providerRef?: string) {
  return withDbRetry(() => fulfillOrderInternal(orderId, providerRef));
}

async function fulfillOrderInternal(orderId: string, providerRef?: string) {
  const orderInclude = {
    items: { include: { ticketType: true, tickets: true } },
    event: true,
    payment: true,
  } as const;

  return prisma.$transaction(
    async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: { include: { tickets: true } } },
      });

      if (!order) {
        return null;
      }

      const expectedTickets = order.items.reduce(
        (sum, item) => sum + item.quantity,
        0,
      );
      const existingTickets = order.items.reduce(
        (sum, item) => sum + item.tickets.length,
        0,
      );

      if (
        order.status === OrderStatus.PAID ||
        existingTickets >= expectedTickets
      ) {
        return tx.order.findUnique({
          where: { id: orderId },
          include: orderInclude,
        });
      }

      const wasCancelled = order.status === OrderStatus.CANCELLED;

      const claimed = await tx.order.updateMany({
        where: {
          id: orderId,
          status: { in: [OrderStatus.PENDING, OrderStatus.CANCELLED] },
        },
        data: {
          status: OrderStatus.PAID,
          ...(providerRef ? { flexpaieReference: providerRef } : {}),
        },
      });

      if (claimed.count === 0) {
        return tx.order.findUnique({
          where: { id: orderId },
          include: orderInclude,
        });
      }

      if (wasCancelled) {
        for (const item of order.items) {
          await tx.ticketType.update({
            where: { id: item.ticketTypeId },
            data: { soldCount: { increment: item.quantity } },
          });
        }
      }

      await tx.payment.update({
        where: { orderId },
        data: { status: PaymentStatus.SUCCESS },
      });

      const ticketsData = order.items.flatMap((item) => {
        const missing = item.quantity - item.tickets.length;
        return Array.from({ length: missing }, () => ({
          orderItemId: item.id,
          ticketCode: generateTicketCode(),
          status: TicketStatus.VALID,
          attendeeName: order.customerName,
          attendeeEmail: order.customerEmail,
        }));
      });

      if (ticketsData.length > 0) {
        await tx.ticket.createMany({ data: ticketsData });
      }

      return tx.order.findUnique({
        where: { id: orderId },
        include: orderInclude,
      });
    },
    FULFILL_TRANSACTION_OPTIONS,
  );
}

export async function reconcileFlexPayOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order || order.status === OrderStatus.PAID) {
    return order;
  }

  const checkTarget = order.flexpaieTransactionId ?? order.flexpaieReference;
  if (!checkTarget) {
    return order;
  }

  const check = await checkFlexPayTransaction(checkTarget);

  if (check.transaction?.status === "0") {
    if (
      check.transaction.orderNumber &&
      check.transaction.orderNumber !== order.flexpaieTransactionId
    ) {
      await prisma.order.update({
        where: { id: orderId },
        data: { flexpaieTransactionId: check.transaction.orderNumber },
      });
    }

    return fulfillOrder(orderId, check.transaction.reference);
  }

  return order;
}

export async function failOrderPayment(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order || order.status === OrderStatus.PAID) return;

  await prisma.$transaction(
    async (tx) => {
      for (const item of order.items) {
        await tx.ticketType.update({
          where: { id: item.ticketTypeId },
          data: { soldCount: { decrement: item.quantity } },
        });
      }
      await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.CANCELLED },
      });
      await tx.payment.update({
        where: { orderId },
        data: { status: PaymentStatus.FAILED },
      });
    },
    FULFILL_TRANSACTION_OPTIONS,
  );
}

export async function getOrderById(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { ticketType: true, tickets: true } },
      event: true,
      payment: true,
    },
  });
}

export async function getOrderByFlexPayCallback(
  orderNumber: string,
  reference?: string,
) {
  return prisma.order.findFirst({
    where: {
      OR: [
        { flexpaieTransactionId: orderNumber },
        { flexpaieReference: orderNumber },
        ...(reference ? [{ flexpaieReference: reference }] : []),
        { orderNumber },
      ],
    },
  });
}

export async function getPaidOrdersByEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return [];

  return prisma.order.findMany({
    where: {
      status: OrderStatus.PAID,
      customerEmail: { equals: normalized, mode: "insensitive" },
      items: {
        some: {
          tickets: { some: {} },
        },
      },
    },
    include: {
      event: true,
      items: {
        include: {
          ticketType: true,
          tickets: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPaidOrdersByPhone(phone: string) {
  const variants = getPhoneLookupVariants(phone);

  if (!variants.length) {
    return [];
  }

  return prisma.order.findMany({
    where: {
      status: OrderStatus.PAID,
      customerPhone: { in: variants },
      items: {
        some: {
          tickets: { some: {} },
        },
      },
    },
    include: {
      event: true,
      items: {
        include: {
          ticketType: true,
          tickets: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}
