import { getAdminStats, requireAdminEvent } from "@/lib/admin";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import {
  AdminFinancialStat,
  AdminHeroCard,
} from "@/components/admin/AdminHeroCard";
import { AdminSalesFlowChart } from "@/components/admin/AdminSalesFlowChart";
import { AdminDashboardPanels } from "@/components/admin/AdminDashboardPanels";
import {
  AdminRightRail,
  AdminStatusPills,
  AdminTicketQuickRow,
} from "@/components/admin/AdminRightRail";
import { adminCard, adminPagePadding, adminSectionGap, adminSectionTitle } from "@/components/admin/admin-styles";

export default async function AdminDashboardPage() {
  const event = await requireAdminEvent();
  const stats = await getAdminStats(event.id);

  return (
    <div className="flex min-h-screen w-full">
      <div className={`flex-1 overflow-y-auto ${adminPagePadding}`}>
        <AdminTopBar eventTitle={event.title} />

        <div className={adminSectionGap}>
          <AdminHeroCard
            revenueCdf={stats.totalRevenueCdf}
            revenueUsd={stats.totalRevenueUsd}
            fillRate={stats.fillRate}
            sold={stats.totalTicketsSold}
            capacity={stats.totalCapacity}
            paidOrders={stats.paidOrdersCount}
          />

          <section>
            <h2 className={`${adminSectionTitle} mb-6`}>Relevé financier</h2>
            <div className="grid gap-6 md:grid-cols-3">
              <AdminFinancialStat
                label="Billets vendus"
                value={String(stats.totalTicketsSold)}
                trend={`+${stats.fillRate}% du stock`}
                tone="mint"
                points={[12, 18, 16, 22, 20, 28, stats.totalTicketsSold]}
              />
              <AdminFinancialStat
                label="Spectacle"
                value={String(stats.spectacleSold)}
                trend="Places salle"
                tone="peach"
                points={[8, 10, 9, 14, 13, 16, stats.spectacleSold]}
              />
              <AdminFinancialStat
                label="Streaming"
                value={String(stats.streamingSold)}
                trend={`${stats.ordersByStatus.PENDING ?? 0} en attente`}
                tone="sky"
                points={[4, 6, 5, 8, 7, 10, stats.streamingSold]}
              />
            </div>
          </section>

          <section className={`${adminCard} p-7 sm:p-8`}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <h2 className={adminSectionTitle}>Flux des ventes</h2>
            </div>
            <AdminSalesFlowChart series={stats.salesFlow} />
          </section>

          <AdminDashboardPanels
            ticketStats={stats.ticketStats}
            totalRevenueCdf={stats.totalRevenueCdf}
            totalRevenueUsd={stats.totalRevenueUsd}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <AdminTicketQuickRow ticketStats={stats.ticketStats} />
            <AdminStatusPills ordersByStatus={stats.ordersByStatus} />
          </div>
        </div>
      </div>

      <AdminRightRail
        recentOrders={stats.recentOrders}
        ticketStats={stats.ticketStats}
      />
    </div>
  );
}
