"use client";

import { useMemo, useState } from "react";
import type { OrderStatus, PaymentStatus } from "@prisma/client";
import { Search, X } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import type { SupportedCurrency } from "@/lib/pricing";
import {
  TICKET_CATEGORY_LABELS,
  TICKET_TIER_LABELS,
} from "@/types/ticketing";
import { AdminBadge } from "@/components/admin/AdminBadge";
import { AdminPanel } from "@/components/admin/AdminStatCard";
import { adminInput } from "@/components/admin/admin-styles";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  PAID: "Payée",
  CANCELLED: "Annulée",
  REFUNDED: "Remboursée",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  SUCCESS: "Réussie",
  FAILED: "Échouée",
  CANCELLED: "Annulée",
};

type AdminOrderRow = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  totalAmount: number;
  currency: SupportedCurrency;
  status: OrderStatus;
  createdAt: string;
  items: Array<{
    id: string;
    quantity: number;
    ticketType: {
      name: string;
      category: keyof typeof TICKET_CATEGORY_LABELS;
      tier: keyof typeof TICKET_TIER_LABELS;
    };
  }>;
  payment: {
    status: PaymentStatus;
    providerRef: string | null;
  } | null;
};

type AdminOrdersTableProps = {
  orders: AdminOrderRow[];
};

function buildSearchHaystack(order: AdminOrderRow): string {
  const ticketLines = order.items.map(
    (item) =>
      `${item.quantity} ${item.ticketType.name} ${TICKET_CATEGORY_LABELS[item.ticketType.category]} ${TICKET_TIER_LABELS[item.ticketType.tier]}`,
  );

  return [
    order.orderNumber,
    order.customerName,
    order.customerPhone,
    order.customerEmail,
    order.totalAmount,
    order.currency,
    formatPrice(order.totalAmount, order.currency),
    STATUS_LABELS[order.status] ?? order.status,
    order.payment?.status
      ? (PAYMENT_STATUS_LABELS[order.payment.status] ?? order.payment.status)
      : null,
    order.payment?.providerRef,
    ...ticketLines,
    new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(order.createdAt)),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function AdminOrdersTable({ orders }: AdminOrdersTableProps) {
  const [query, setQuery] = useState("");

  const filteredOrders = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return orders;

    return orders.filter((order) =>
      buildSearchHaystack(order).includes(normalized),
    );
  }, [orders, query]);

  const subtitle =
    query.trim().length > 0
      ? `${filteredOrders.length} résultat${filteredOrders.length > 1 ? "s" : ""} sur ${orders.length}`
      : `${orders.length} commande${orders.length > 1 ? "s" : ""}`;

  return (
    <AdminPanel title="Liste des commandes" subtitle={subtitle}>
      <div className="border-b border-zinc-100 px-5 py-4 sm:px-7">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher par n°, client, téléphone, email, billet, statut…"
            className={`${adminInput} pl-10 pr-10`}
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
              aria-label="Effacer la recherche"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs font-medium text-zinc-500">
            <tr>
              <th className="px-5 py-3">Commande</th>
              <th className="px-5 py-3">Client</th>
              <th className="px-5 py-3">Billets</th>
              <th className="px-5 py-3">Montant</th>
              <th className="px-5 py-3">Statut</th>
              <th className="px-5 py-3">Paiement</th>
              <th className="px-5 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filteredOrders.map((order) => (
              <tr key={order.id} className="align-top hover:bg-zinc-50/80">
                <td className="px-5 py-4">
                  <p className="font-mono text-xs text-zinc-700">
                    {order.orderNumber}
                  </p>
                </td>
                <td className="px-5 py-4">
                  <p className="font-medium text-zinc-900">
                    {order.customerName}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {order.customerPhone}
                  </p>
                  {order.customerEmail ? (
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {order.customerEmail}
                    </p>
                  ) : null}
                </td>
                <td className="px-5 py-4 text-zinc-600">
                  <ul className="space-y-1 text-xs">
                    {order.items.map((item) => (
                      <li key={item.id}>
                        {item.quantity}× {item.ticketType.name}{" "}
                        <span className="text-zinc-400">
                          ({TICKET_CATEGORY_LABELS[item.ticketType.category]} ·{" "}
                          {TICKET_TIER_LABELS[item.ticketType.tier]})
                        </span>
                      </li>
                    ))}
                  </ul>
                </td>
                <td className="px-5 py-4 font-medium tabular-nums text-zinc-900">
                  {formatPrice(order.totalAmount, order.currency)}
                </td>
                <td className="px-5 py-4">
                  <AdminBadge
                    variant={order.status === "PAID" ? "success" : "default"}
                  >
                    {STATUS_LABELS[order.status] ?? order.status}
                  </AdminBadge>
                </td>
                <td className="px-5 py-4">
                  {order.payment ? (
                    <div>
                      <AdminBadge
                        variant={
                          order.payment.status === "SUCCESS"
                            ? "success"
                            : order.payment.status === "PENDING"
                              ? "warning"
                              : "default"
                        }
                      >
                        {PAYMENT_STATUS_LABELS[order.payment.status] ??
                          order.payment.status}
                      </AdminBadge>
                      {order.payment.providerRef ? (
                        <p className="mt-1.5 font-mono text-[10px] text-zinc-400">
                          {order.payment.providerRef}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <span className="text-zinc-400">—</span>
                  )}
                </td>
                <td className="px-5 py-4 text-xs text-zinc-500">
                  {new Intl.DateTimeFormat("fr-FR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(new Date(order.createdAt))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {orders.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-zinc-500">
            Aucune transaction pour le moment.
          </p>
        ) : filteredOrders.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-zinc-500">
            Aucun résultat pour « {query} ».
          </p>
        ) : null}
      </div>
    </AdminPanel>
  );
}
