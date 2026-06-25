import { listAdminOrders, requireAdminEvent } from "@/lib/admin";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { AdminOrderManager } from "@/components/admin/AdminOrderManager";
import type { SupportedCurrency } from "@/lib/pricing";
import {
  adminPagePadding,
  adminSectionGap,
  adminSectionTitle,
} from "@/components/admin/admin-styles";

export default async function AdminSettingsPage() {
  const event = await requireAdminEvent();
  const orders = await listAdminOrders(event.id);

  const serializedOrders = orders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    totalAmount: order.totalAmount,
    currency: order.currency as SupportedCurrency,
    status: order.status,
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      ticketType: {
        name: item.ticketType.name,
        category: item.ticketType.category,
        tier: item.ticketType.tier,
      },
      tickets: item.tickets.map((ticket) => ({
        id: ticket.id,
        ticketCode: ticket.ticketCode,
        status: ticket.status,
        attendeeName: ticket.attendeeName,
        issuedAt: ticket.issuedAt.toISOString(),
      })),
    })),
    payment: order.payment
      ? {
          status: order.payment.status,
          providerRef: order.payment.providerRef,
        }
      : null,
  }));

  return (
    <div className={adminPagePadding}>
      <AdminTopBar
        eventTitle={event.title}
        subtitle="Gestion des commandes, confirmation des paiements et génération des billets."
      />

      <div className={adminSectionGap}>
        <h2 className={`${adminSectionTitle} text-xl`}>Paramètres</h2>
        <AdminOrderManager orders={serializedOrders} />
      </div>
    </div>
  );
}
