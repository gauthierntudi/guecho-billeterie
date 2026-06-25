"use client";

import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import { useCurrency } from "@/contexts/CurrencyContext";
import { AdminBadge } from "@/components/admin/AdminBadge";
import { adminCard, adminSectionTitle } from "@/components/admin/admin-styles";
import {
  TICKET_CATEGORY_LABELS,
  TICKET_TIER_LABELS,
} from "@/types/ticketing";
import type { TicketCategory, TicketTier } from "@prisma/client";

type RecentOrder = {
  id: string;
  orderNumber: string;
  customerName: string;
  status: string;
  totalAmount: number;
  currency: string;
  createdAt: string;
};

type TicketPreview = {
  id: string;
  name: string;
  tier: TicketTier;
  category: TicketCategory;
  soldCount: number;
  quantity: number;
  priceUsd: number;
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  PAID: "Payée",
  CANCELLED: "Annulée",
  REFUNDED: "Remboursée",
};

const CARD_TONES = [
  "bg-[#dff3ff] text-sky-900",
  "bg-[#eceff4] text-zinc-800",
  "bg-[#e8f8ef] text-emerald-900",
  "bg-[#fff1e8] text-orange-900",
];

export function AdminRightRail({
  recentOrders,
  ticketStats,
}: {
  recentOrders: RecentOrder[];
  ticketStats: TicketPreview[];
}) {
  const { currency } = useCurrency();
  const filteredOrders = recentOrders.filter(
    (order) => order.currency === currency,
  );

  return (
    <aside className="hidden w-[340px] shrink-0 border-l border-zinc-200 bg-white px-7 py-10 xl:block">
      <div className="flex items-center justify-between">
        <h2 className={adminSectionTitle}>Transactions</h2>
        <Link
          href="/admin/orders"
          className="text-xs font-medium text-zinc-500 hover:text-zinc-800"
        >
          Tout voir
        </Link>
      </div>

      <ul className="mt-6 space-y-5">
        {filteredOrders.length === 0 ? (
          <li className="text-sm text-zinc-500">
            Aucune transaction en {currency}.
          </li>
        ) : (
          filteredOrders.slice(0, 6).map((order) => (
            <li key={order.id} className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-600">
                {order.customerName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-sm font-medium text-zinc-900">
                    {order.customerName}
                  </p>
                  <p className="shrink-0 text-sm font-semibold tabular-nums text-zinc-900">
                    {formatPrice(order.totalAmount, order.currency)}
                  </p>
                </div>
                <p className="mt-1 text-sm text-zinc-500">
                  {new Intl.DateTimeFormat("fr-FR", {
                    day: "2-digit",
                    month: "short",
                  }).format(new Date(order.createdAt))}
                </p>
                <AdminBadge
                  variant={order.status === "PAID" ? "success" : "default"}
                >
                  {STATUS_LABELS[order.status] ?? order.status}
                </AdminBadge>
              </div>
            </li>
          ))
        )}
      </ul>

      <div className="mt-12">
        <h2 className={adminSectionTitle}>Billets actifs</h2>
        <div className="mt-5 space-y-4">
          {ticketStats.slice(0, 3).map((ticket, index) => (
            <div
              key={ticket.id}
              className={`rounded-[18px] p-5 ${CARD_TONES[index % CARD_TONES.length]}`}
            >
              <p className="text-xs font-medium opacity-70">
                {TICKET_TIER_LABELS[ticket.tier]}
              </p>
              <p className="mt-1 text-sm font-semibold">{ticket.name}</p>
              <p className="mt-3 text-lg font-semibold tabular-nums">
                {ticket.soldCount}/{ticket.quantity}
              </p>
              <p className="mt-1 text-[11px] opacity-70">
                {TICKET_CATEGORY_LABELS[ticket.category]}
              </p>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

export function AdminTicketQuickRow({
  ticketStats,
}: {
  ticketStats: TicketPreview[];
}) {
  return (
    <section className={`${adminCard} p-7`}>
      <h2 className={adminSectionTitle}>Types de billets</h2>
      <div className="mt-6 flex flex-wrap gap-4">
        {ticketStats.map((ticket) => (
          <div
            key={ticket.id}
            className="flex h-14 min-w-[3.5rem] items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 px-5 text-sm font-semibold text-zinc-700"
            title={ticket.name}
          >
            {ticket.tier === "STREAMING_ACCESS" ? "ST" : ticket.tier.slice(0, 3)}
          </div>
        ))}
        <Link
          href="/admin/tickets"
          className="flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-zinc-300 text-xl text-zinc-400 transition hover:border-zinc-400 hover:text-zinc-600"
        >
          +
        </Link>
      </div>
    </section>
  );
}

export function AdminStatusPills({
  ordersByStatus,
}: {
  ordersByStatus: Record<string, number>;
}) {
  return (
    <section className={`${adminCard} p-7`}>
      <h2 className={adminSectionTitle}>Statuts commandes</h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {Object.entries(ordersByStatus).map(([status, count]) => (
          <div
            key={status}
            className="rounded-2xl border border-zinc-100 bg-zinc-50 px-5 py-4"
          >
            <p className="text-sm text-zinc-500">
              {STATUS_LABELS[status] ?? status}
            </p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-zinc-900">
              {count}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
