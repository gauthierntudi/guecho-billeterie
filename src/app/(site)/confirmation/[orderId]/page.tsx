import { notFound } from "next/navigation";
import {
  getOrderById,
  fulfillOrder,
  failOrderPayment,
  reconcileFlexPayOrder,
} from "@/lib/ticketing";
import type { SupportedCurrency } from "@/lib/pricing";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { EventPageBackground } from "@/components/event/EventPageBackground";
import { ConfirmationView } from "@/components/ticketing/ConfirmationView";
import { ConfirmationPaymentPoller } from "@/components/ticketing/ConfirmationPaymentPoller";

type PageProps = {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ demo?: string; status?: string }>;
};

export default async function ConfirmationPage({
  params,
  searchParams,
}: PageProps) {
  const { orderId } = await params;
  const { demo, status } = await searchParams;

  if (demo === "true") {
    await fulfillOrder(orderId);
  }

  let order = await getOrderById(orderId);

  if (!order) {
    notFound();
  }

  if (status === "cancel" || status === "decline") {
    if (order.status === "PENDING") {
      await failOrderPayment(orderId);
      order = (await getOrderById(orderId))!;
    }
  }

  if (order && status === "success" && order.status === "PENDING") {
    await reconcileFlexPayOrder(orderId);
    order = (await getOrderById(orderId)) ?? order;
  }

  if (
    order?.status === "PENDING" &&
    (order.flexpaieTransactionId || order.flexpaieReference)
  ) {
    await reconcileFlexPayOrder(orderId);
    order = (await getOrderById(orderId)) ?? order;
  }

  if (!order) {
    notFound();
  }

  const viewStatus =
    order.status === "PAID"
      ? "paid"
      : order.status === "CANCELLED"
        ? "cancelled"
        : "pending";

  const tickets = order.items.flatMap((item) =>
    item.tickets.map((ticket) => ({
      id: ticket.id,
      ticketCode: ticket.ticketCode,
      ticketName: item.ticketType.name,
      tier: item.ticketType.tier,
      category: item.ticketType.category,
    })),
  );

  const backgroundImage = order.event.coverImage?.startsWith("/img/")
    ? order.event.coverImage
    : "/img/s1.jpg";

  return (
    <main className="relative isolate min-h-screen bg-[#050505] text-white">
      <EventPageBackground
        src={backgroundImage}
        alt={`${order.event.title} — fond`}
      />
      <div className="relative z-10">
        <SiteHeader eventTitle={order.event.title} />
        <ConfirmationView
          status={viewStatus}
          orderNumber={order.orderNumber}
          customerName={order.customerName}
          customerEmail={order.customerEmail}
          eventTitle={order.event.title}
          eventSlug={order.event.slug}
          totalAmount={order.totalAmount}
          currency={order.currency as SupportedCurrency}
          tickets={tickets}
        />
        {viewStatus === "pending" &&
        (order.flexpaieTransactionId || order.flexpaieReference) ? (
          <ConfirmationPaymentPoller
            orderId={order.id}
            flexPayOrderNumber={
              order.flexpaieTransactionId ?? order.flexpaieReference!
            }
          />
        ) : null}
        <SiteFooter bareBackground />
      </div>
    </main>
  );
}
