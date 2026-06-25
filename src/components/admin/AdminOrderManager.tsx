"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { OrderStatus, PaymentStatus, TicketStatus } from "@prisma/client";
import {
  ExternalLink,
  Loader2,
  Search,
  Ticket,
  X,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import type { SupportedCurrency } from "@/lib/pricing";
import {
  TICKET_CATEGORY_LABELS,
  TICKET_TIER_LABELS,
} from "@/types/ticketing";
import { AdminBadge } from "@/components/admin/AdminBadge";
import { AdminPanel } from "@/components/admin/AdminStatCard";
import {
  adminBtnPrimary,
  adminBtnSecondary,
  adminCardInset,
  adminInput,
} from "@/components/admin/admin-styles";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  PAID: "Payée",
  CANCELLED: "Annulée",
  REFUNDED: "Remboursée",
};

type AdminOrderTicket = {
  id: string;
  ticketCode: string;
  status: TicketStatus;
  attendeeName: string | null;
  issuedAt: string;
};

type AdminOrderRow = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
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
    tickets: AdminOrderTicket[];
  }>;
  payment: {
    status: PaymentStatus;
    providerRef: string | null;
  } | null;
};

type AdminOrderManagerProps = {
  orders: AdminOrderRow[];
};

function countMissingTickets(order: AdminOrderRow) {
  if (order.status !== "PAID") return 0;
  return order.items.reduce(
    (sum, item) => sum + Math.max(0, item.quantity - item.tickets.length),
    0,
  );
}

function buildSearchHaystack(order: AdminOrderRow): string {
  const ticketLines = order.items.flatMap((item) =>
    item.tickets.map((ticket) => ticket.ticketCode),
  );

  return [
    order.orderNumber,
    order.customerName,
    order.customerPhone,
    order.customerEmail,
    STATUS_LABELS[order.status],
    ...ticketLines,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function AdminOrderManager({ orders }: AdminOrderManagerProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(orders[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
  });

  const filteredOrders = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return orders;
    return orders.filter((order) =>
      buildSearchHaystack(order).includes(normalized),
    );
  }, [orders, query]);

  const selectedOrder =
    orders.find((order) => order.id === selectedId) ??
    filteredOrders[0] ??
    null;

  useEffect(() => {
    if (filteredOrders.length === 0) return;
    if (!filteredOrders.some((order) => order.id === selectedId)) {
      setSelectedId(filteredOrders[0].id);
    }
  }, [filteredOrders, selectedId]);

  useEffect(() => {
    if (!selectedOrder) return;
    setDraft({
      customerName: selectedOrder.customerName,
      customerEmail: selectedOrder.customerEmail,
      customerPhone: selectedOrder.customerPhone,
    });
  }, [
    selectedOrder?.id,
    selectedOrder?.customerName,
    selectedOrder?.customerEmail,
    selectedOrder?.customerPhone,
  ]);

  const missingTickets = selectedOrder ? countMissingTickets(selectedOrder) : 0;
  const allTickets = selectedOrder
    ? selectedOrder.items.flatMap((item) =>
        item.tickets.map((ticket) => ({
          ...ticket,
          ticketTypeName: item.ticketType.name,
          tier: item.ticketType.tier,
          category: item.ticketType.category,
        })),
      )
    : [];

  function selectOrder(order: AdminOrderRow) {
    setSelectedId(order.id);
    setDraft({
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
    });
    setError(null);
    setSuccess(null);
  }

  async function saveOrder() {
    if (!selectedOrder) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/admin/orders/${selectedOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Enregistrement impossible");
        return;
      }

      setSuccess("Commande mise à jour");
      router.refresh();
    } catch {
      setError("Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  }

  async function runAction(
    action: "fulfill" | "tickets",
    loadingKey: string,
    successMessage: string,
  ) {
    if (!selectedOrder) return;

    setActionLoading(loadingKey);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        `/api/admin/orders/${selectedOrder.id}/${action}`,
        { method: "POST" },
      );
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Action impossible");
        return;
      }

      setSuccess(successMessage);
      router.refresh();
    } catch {
      setError("Action impossible");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      <AdminPanel
        title="Commandes"
        subtitle={`${filteredOrders.length} sur ${orders.length}`}
        className="h-fit xl:sticky xl:top-8"
      >
        <div className="border-b border-zinc-100 px-5 py-4">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher…"
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

        <ul className="max-h-[520px] divide-y divide-zinc-100 overflow-y-auto">
          {filteredOrders.length === 0 ? (
            <li className="px-5 py-10 text-center text-sm text-zinc-500">
              Aucune commande trouvée.
            </li>
          ) : (
            filteredOrders.map((order) => {
              const missing = countMissingTickets(order);
              const active = selectedOrder?.id === order.id;

              return (
                <li key={order.id}>
                  <button
                    type="button"
                    onClick={() => selectOrder(order)}
                    className={cn(
                      "w-full px-5 py-4 text-left transition",
                      active ? "bg-zinc-50" : "hover:bg-zinc-50/80",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-mono text-xs text-zinc-500">
                          {order.orderNumber}
                        </p>
                        <p className="mt-1 truncate text-sm font-medium text-zinc-900">
                          {order.customerName}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {formatPrice(order.totalAmount, order.currency)}
                        </p>
                      </div>
                      <AdminBadge
                        variant={order.status === "PAID" ? "success" : "default"}
                      >
                        {STATUS_LABELS[order.status] ?? order.status}
                      </AdminBadge>
                    </div>
                    {missing > 0 ? (
                      <p className="mt-2 text-xs font-medium text-amber-700">
                        {missing} billet{missing > 1 ? "s" : ""} à générer
                      </p>
                    ) : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </AdminPanel>

      <div className="space-y-6">
        {!selectedOrder ? (
          <AdminPanel title="Détail commande">
            <p className="px-6 py-12 text-center text-sm text-zinc-500">
              Sélectionnez une commande pour l&apos;éditer.
            </p>
          </AdminPanel>
        ) : (
          <>
            <AdminPanel title="Détail commande" subtitle={selectedOrder.orderNumber}>
              <div className="space-y-6 px-5 py-5 sm:px-7 sm:py-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <AdminBadge
                    variant={
                      selectedOrder.status === "PAID" ? "success" : "default"
                    }
                  >
                    {STATUS_LABELS[selectedOrder.status] ?? selectedOrder.status}
                  </AdminBadge>
                  <p className="text-sm text-zinc-500">
                    {new Intl.DateTimeFormat("fr-FR", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(selectedOrder.createdAt))}
                  </p>
                </div>

                {error ? (
                  <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </p>
                ) : null}
                {success ? (
                  <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {success}
                  </p>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block sm:col-span-2">
                    <span className="mb-1.5 block text-xs font-medium text-zinc-500">
                      Nom du client
                    </span>
                    <input
                      type="text"
                      value={draft.customerName}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          customerName: event.target.value,
                        }))
                      }
                      className={adminInput}
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-zinc-500">
                      Email
                    </span>
                    <input
                      type="email"
                      value={draft.customerEmail}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          customerEmail: event.target.value,
                        }))
                      }
                      className={adminInput}
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-zinc-500">
                      Téléphone
                    </span>
                    <input
                      type="text"
                      value={draft.customerPhone}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          customerPhone: event.target.value,
                        }))
                      }
                      className={adminInput}
                    />
                  </label>
                </div>

                <div className={`${adminCardInset} px-4 py-4`}>
                  <p className="text-xs font-medium text-zinc-500">Billets commandés</p>
                  <ul className="mt-2 space-y-1 text-sm text-zinc-700">
                    {selectedOrder.items.map((item) => (
                      <li key={item.id}>
                        {item.quantity}× {item.ticketType.name}{" "}
                        <span className="text-zinc-400">
                          ({TICKET_TIER_LABELS[item.ticketType.tier]})
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-base font-semibold tabular-nums text-zinc-900">
                    Total :{" "}
                    {formatPrice(
                      selectedOrder.totalAmount,
                      selectedOrder.currency,
                    )}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={saveOrder}
                    disabled={saving}
                    className={`${adminBtnPrimary} disabled:opacity-50`}
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Enregistrer
                  </button>

                  {selectedOrder.status === "PENDING" ? (
                    <button
                      type="button"
                      onClick={() =>
                        runAction(
                          "fulfill",
                          "fulfill",
                          "Paiement confirmé et billets générés",
                        )
                      }
                      disabled={actionLoading === "fulfill"}
                      className={`${adminBtnSecondary} disabled:opacity-50`}
                    >
                      {actionLoading === "fulfill" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : null}
                      Confirmer le paiement
                    </button>
                  ) : null}

                  {selectedOrder.status === "PAID" && missingTickets > 0 ? (
                    <button
                      type="button"
                      onClick={() =>
                        runAction(
                          "tickets",
                          "tickets",
                          `${missingTickets} billet${missingTickets > 1 ? "s" : ""} généré${missingTickets > 1 ? "s" : ""}`,
                        )
                      }
                      disabled={actionLoading === "tickets"}
                      className={`${adminBtnSecondary} disabled:opacity-50`}
                    >
                      {actionLoading === "tickets" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Ticket className="h-4 w-4" />
                      )}
                      Générer les billets ({missingTickets})
                    </button>
                  ) : null}

                  <Link
                    href={`/confirmation/${selectedOrder.id}`}
                    target="_blank"
                    className={`${adminBtnSecondary}`}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Voir la confirmation
                  </Link>
                </div>
              </div>
            </AdminPanel>

            <AdminPanel
              title="Billets émis"
              subtitle={
                allTickets.length > 0
                  ? `${allTickets.length} code${allTickets.length > 1 ? "s" : ""}`
                  : "Aucun billet généré"
              }
            >
              {allTickets.length === 0 ? (
                <p className="px-6 py-10 text-center text-sm text-zinc-500">
                  {selectedOrder.status === "PAID"
                    ? "Aucun billet généré pour cette commande payée."
                    : "Les billets seront générés après confirmation du paiement."}
                </p>
              ) : (
                <div className="divide-y divide-zinc-100">
                  {allTickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-7"
                    >
                      <div>
                        <p className="text-sm font-medium text-zinc-900">
                          {ticket.ticketTypeName}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {TICKET_CATEGORY_LABELS[ticket.category]} ·{" "}
                          {TICKET_TIER_LABELS[ticket.tier]}
                        </p>
                      </div>
                      <p className="font-mono text-sm tracking-wider text-zinc-800">
                        {ticket.ticketCode}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </AdminPanel>
          </>
        )}
      </div>
    </div>
  );
}
