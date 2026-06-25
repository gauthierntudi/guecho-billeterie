"use client";

import Link from "next/link";
import { MoreHorizontal, TrendingUp } from "lucide-react";
import { AdminSparkline } from "@/components/admin/AdminCharts";
import { useCurrency } from "@/contexts/CurrencyContext";
import { formatPrice } from "@/lib/utils";

type AdminHeroCardProps = {
  revenueCdf: number;
  revenueUsd: number;
  fillRate: number;
  sold: number;
  capacity: number;
  paidOrders: number;
};

export function AdminHeroCard({
  revenueCdf,
  revenueUsd,
  fillRate,
  sold,
  capacity,
  paidOrders,
}: AdminHeroCardProps) {
  const { currency } = useCurrency();
  const revenue = currency === "USD" ? revenueUsd : revenueCdf;
  const spark = [42, 48, 45, 55, 52, 60, 58, fillRate || 62];

  return (
    <section className="relative overflow-hidden rounded-[24px] bg-[#1c2a3f] p-8 text-white sm:p-10">
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-sm text-zinc-400">
            Chiffre d&apos;affaires · {currency}
          </p>
          <p className="mt-4 text-3xl font-semibold tracking-tight sm:text-[2.25rem]">
            {formatPrice(revenue, currency)}
          </p>
          <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-emerald-400">
            <TrendingUp className="h-4 w-4" />
            {fillRate}% de remplissage · {paidOrders} payée
            {paidOrders > 1 ? "s" : ""}
          </p>
        </div>
        <AdminSparkline
          points={spark}
          color="#34d399"
          className="h-10 w-24 shrink-0 opacity-90"
        />
      </div>

      <div className="mt-8 flex flex-wrap gap-4">
        <Link
          href="/admin/tickets"
          className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100"
        >
          Billets
        </Link>
        <Link
          href="/admin/orders"
          className="inline-flex items-center justify-center rounded-full border border-white/25 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/10"
        >
          Transactions
        </Link>
      </div>

      <p className="mt-6 text-sm text-zinc-500">
        {sold} vendus sur {capacity} places
      </p>
    </section>
  );
}

type FinancialStatProps = {
  label: string;
  value: string;
  trend: string;
  tone: "mint" | "peach" | "sky";
  points: number[];
};

const TONE_STYLES = {
  mint: {
    card: "bg-[#e8f8ef] border-[#d4f0e0]",
    line: "#10b981",
    trend: "text-emerald-600",
  },
  peach: {
    card: "bg-[#fff1e8] border-[#ffe2cf]",
    line: "#f97316",
    trend: "text-orange-600",
  },
  sky: {
    card: "bg-[#eaf5ff] border-[#d7ebff]",
    line: "#0ea5e9",
    trend: "text-sky-600",
  },
} as const;

export function AdminFinancialStat({
  label,
  value,
  trend,
  tone,
  points,
}: FinancialStatProps) {
  const styles = TONE_STYLES[tone];

  return (
    <article
      className={`rounded-[20px] border p-6 sm:p-7 ${styles.card}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-zinc-600">{label}</p>
        <button
          type="button"
          className="text-zinc-400 transition hover:text-zinc-600"
          aria-label="Options"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-4 text-[1.75rem] font-semibold tracking-tight text-zinc-900">
        {value}
      </p>
      <p className={`mt-2 text-sm font-medium ${styles.trend}`}>{trend}</p>
      <AdminSparkline
        points={points}
        color={styles.line}
        className="mt-6 h-10 w-full"
      />
    </article>
  );
}
