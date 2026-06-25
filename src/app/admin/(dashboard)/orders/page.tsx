import { listAdminOrders, requireAdminEvent } from "@/lib/admin";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { AdminOrdersTable } from "@/components/admin/AdminOrdersTable";
import type { SupportedCurrency } from "@/lib/pricing";
import {
  adminPagePadding,
  adminSectionGap,
  adminSectionTitle,
} from "@/components/admin/admin-styles";

export default async function AdminOrdersPage() {
  const event = await requireAdminEvent();
  const orders = await listAdminOrders(event.id);

  const serializedOrders = orders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerEmail: order.customerEmail,
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
        subtitle={`${orders.length} commande${orders.length > 1 ? "s" : ""} enregistrée${orders.length > 1 ? "s" : ""}.`}
      />
      <div className={adminSectionGap}>
        <h2 className={`${adminSectionTitle} text-xl`}>Transactions</h2>
        <AdminOrdersTable orders={serializedOrders} />
      </div>
    </div>
  );
}
