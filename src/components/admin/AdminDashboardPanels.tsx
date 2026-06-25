"use client";

import type { TicketCategory, TicketTier } from "@prisma/client";
import { useCurrency } from "@/contexts/CurrencyContext";
import { formatPrice } from "@/lib/utils";
import {
  TICKET_CATEGORY_LABELS,
  TICKET_TIER_LABELS,
} from "@/types/ticketing";
import { AdminPanel } from "@/components/admin/AdminStatCard";

type TicketStat = {
  id: string;
  name: string;
  tier: TicketTier;
  category: TicketCategory;
  priceUsd: number;
  priceCdf: number;
  soldCount: number;
  available: number;
  soldPercent: number;
  revenueCdf: number;
  revenueUsd: number;
};

type AdminDashboardPanelsProps = {
  ticketStats: TicketStat[];
  totalRevenueCdf: number;
  totalRevenueUsd: number;
};

export function AdminDashboardPanels({
  ticketStats,
  totalRevenueCdf,
  totalRevenueUsd,
}: AdminDashboardPanelsProps) {
  const { currency } = useCurrency();
  const totalRevenue = currency === "USD" ? totalRevenueUsd : totalRevenueCdf;

  return (
    <AdminPanel
      title="Ventes par billet"
      subtitle={`Stock, taux et revenus en ${currency}`}
      action={{ href: "/admin/tickets", label: "Gérer" }}
    >
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs font-medium text-zinc-500">
            <tr>
              <th className="px-6 py-4 font-medium sm:px-7">Billet</th>
              <th className="px-6 py-4 font-medium sm:px-7">Vendus</th>
              <th className="px-6 py-4 font-medium sm:px-7">Stock</th>
              <th className="px-6 py-4 font-medium sm:px-7">Taux</th>
              <th className="px-6 py-4 text-right font-medium sm:px-7">
                Revenu ({currency})
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {ticketStats.map((ticket) => {
              const revenue =
                currency === "USD" ? ticket.revenueUsd : ticket.revenueCdf;
              const unitPrice =
                currency === "USD" ? ticket.priceUsd : ticket.priceCdf;

              return (
                <tr key={ticket.id} className="hover:bg-zinc-50/80">
                  <td className="px-6 py-5 sm:px-7">
                    <p className="font-medium text-zinc-900">{ticket.name}</p>
                    <p className="mt-1 text-sm text-zinc-500">
                      {TICKET_CATEGORY_LABELS[ticket.category]} ·{" "}
                      {TICKET_TIER_LABELS[ticket.tier]} ·{" "}
                      {formatPrice(unitPrice, currency)}
                    </p>
                    <div className="mt-3 h-2 w-full max-w-[140px] overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className="h-full rounded-full bg-zinc-900"
                        style={{
                          width: `${Math.min(ticket.soldPercent, 100)}%`,
                        }}
                      />
                    </div>
                  </td>
                  <td className="px-6 py-5 tabular-nums text-zinc-700 sm:px-7">
                    {ticket.soldCount}
                  </td>
                  <td className="px-6 py-5 tabular-nums text-zinc-700 sm:px-7">
                    {ticket.available}
                  </td>
                  <td className="px-6 py-5 tabular-nums text-zinc-700 sm:px-7">
                    {ticket.soldPercent}%
                  </td>
                  <td className="px-6 py-5 text-right font-medium tabular-nums text-zinc-900 sm:px-7">
                    {revenue > 0 ? formatPrice(revenue, currency) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-zinc-100 bg-zinc-50/50">
              <td
                colSpan={4}
                className="px-6 py-4 text-sm text-zinc-600 sm:px-7"
              >
                Total encaissé ({currency})
              </td>
              <td className="px-6 py-4 text-right text-sm font-semibold tabular-nums text-zinc-900 sm:px-7">
                {formatPrice(totalRevenue, currency)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </AdminPanel>
  );
}
