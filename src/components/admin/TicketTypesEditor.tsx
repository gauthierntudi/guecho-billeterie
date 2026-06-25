"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { TicketCategory, TicketTier } from "@prisma/client";
import { Loader2, Ticket } from "lucide-react";
import {
  TICKET_CATEGORY_LABELS,
  TICKET_TIER_LABELS,
} from "@/types/ticketing";
import { useCurrency } from "@/contexts/CurrencyContext";
import { formatPrice } from "@/lib/utils";
import { getCdfPrice, getExchangeRate, getTicketPrice } from "@/lib/pricing";
import {
  adminBtnPrimary,
  adminCard,
  adminCardInset,
  adminInput,
} from "@/components/admin/admin-styles";
import { cn } from "@/lib/utils";

type TicketTypeRow = {
  id: string;
  name: string;
  tier: TicketTier;
  category: TicketCategory;
  priceUsd: number;
  price: number;
  quantity: number;
  soldCount: number;
  isActive: boolean;
};

type TicketTypesEditorProps = {
  ticketTypes: TicketTypeRow[];
};

type FilterKey = "all" | TicketCategory;

const TIER_STYLES: Record<TicketTier, string> = {
  STANDARD: "bg-zinc-100 text-zinc-700",
  VIP: "bg-orange-100 text-orange-800",
  VVIP: "bg-violet-100 text-violet-800",
  STREAMING_ACCESS: "bg-sky-100 text-sky-800",
};

const TIER_BAR: Record<TicketTier, string> = {
  STANDARD: "bg-zinc-500",
  VIP: "bg-orange-500",
  VVIP: "bg-violet-500",
  STREAMING_ACCESS: "bg-sky-500",
};

const FILTERS: Array<{ id: FilterKey; label: string }> = [
  { id: "all", label: "Tous" },
  { id: "SPECTACLE", label: "Spectacle" },
  { id: "STREAMING", label: "Streaming" },
];

export function TicketTypesEditor({ ticketTypes }: TicketTypesEditorProps) {
  const router = useRouter();
  const { currency } = useCurrency();
  const exchangeRate = getExchangeRate();
  const [rows, setRows] = useState(ticketTypes);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const filteredRows = useMemo(
    () =>
      filter === "all"
        ? rows
        : rows.filter((row) => row.category === filter),
    [rows, filter],
  );

  const summary = useMemo(() => {
    const active = rows.filter((row) => row.isActive).length;
    const sold = rows.reduce((sum, row) => sum + row.soldCount, 0);
    const capacity = rows.reduce((sum, row) => sum + row.quantity, 0);
    const fillRate =
      capacity > 0 ? Math.round((sold / capacity) * 100) : 0;

    return { active, sold, capacity, fillRate, total: rows.length };
  }, [rows]);

  function updateRow(id: string, patch: Partial<TicketTypeRow>) {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  }

  async function saveRow(id: string) {
    const row = rows.find((item) => item.id === id);
    if (!row) return;

    setSavingId(id);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/admin/ticket-types", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          priceUsd: row.priceUsd,
          quantity: row.quantity,
          isActive: row.isActive,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Enregistrement impossible");
        return;
      }

      setSuccess(`${row.name} mis à jour`);
      router.refresh();
    } catch {
      setError("Enregistrement impossible");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Types de billets" value={String(summary.total)} />
        <SummaryCard label="Actifs" value={String(summary.active)} />
        <SummaryCard
          label="Vendus / stock"
          value={`${summary.sold} / ${summary.capacity}`}
        />
        <SummaryCard label="Taux de remplissage" value={`${summary.fillRate}%`} />
      </section>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition",
                filter === item.id
                  ? "bg-zinc-900 text-white"
                  : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="text-sm text-zinc-500">
          Taux de change : 1 USD = {formatPrice(exchangeRate, "CDF")}
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {filteredRows.length === 0 ? (
          <div
            className={`${adminCard} col-span-full px-6 py-12 text-center text-sm text-zinc-500`}
          >
            Aucun billet dans cette catégorie.
          </div>
        ) : (
          filteredRows.map((row) => (
            <TicketTypeCard
              key={row.id}
              row={row}
              currency={currency}
              exchangeRate={exchangeRate}
              saving={savingId === row.id}
              onUpdate={(patch) => updateRow(row.id, patch)}
              onSave={() => saveRow(row.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className={`${adminCard} px-5 py-4`}>
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-zinc-900">
        {value}
      </p>
    </div>
  );
}

function TicketTypeCard({
  row,
  currency,
  exchangeRate,
  saving,
  onUpdate,
  onSave,
}: {
  row: TicketTypeRow;
  currency: "CDF" | "USD";
  exchangeRate: number;
  saving: boolean;
  onUpdate: (patch: Partial<TicketTypeRow>) => void;
  onSave: () => void;
}) {
  const available = row.quantity - row.soldCount;
  const soldPercent =
    row.quantity > 0 ? Math.round((row.soldCount / row.quantity) * 100) : 0;
  const displayPrice = getTicketPrice(row, currency);
  const altPrice =
    currency === "USD"
      ? getCdfPrice(row.priceUsd, exchangeRate)
      : row.priceUsd;

  return (
    <article
      className={cn(
        adminCard,
        "flex h-full flex-col overflow-hidden",
        !row.isActive && "opacity-70",
      )}
    >
      <div className="border-b border-zinc-100 px-4 py-4">
        <div className="flex items-start justify-between gap-2">
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
              TIER_STYLES[row.tier],
            )}
          >
            <Ticket className="h-4 w-4" />
          </div>
          <label className="inline-flex shrink-0 items-center gap-2">
            <span className="text-xs text-zinc-500">
              {row.isActive ? "Actif" : "Inactif"}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={row.isActive}
              onClick={() => onUpdate({ isActive: !row.isActive })}
              className={cn(
                "relative h-6 w-10 rounded-full transition",
                row.isActive ? "bg-zinc-900" : "bg-zinc-200",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition",
                  row.isActive ? "left-[18px]" : "left-0.5",
                )}
              />
            </button>
          </label>
        </div>

        <div className="mt-3">
          <span
            className={cn(
              "inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              TIER_STYLES[row.tier],
            )}
          >
            {TICKET_TIER_LABELS[row.tier]}
          </span>
          <p className="mt-1 text-[11px] text-zinc-500">
            {TICKET_CATEGORY_LABELS[row.category]}
          </p>
          <h3 className="mt-1.5 text-base font-semibold leading-snug text-zinc-900">
            {row.name}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            {formatPrice(displayPrice, currency)}
            <span className="text-zinc-400">
              {" "}
              ·{" "}
              {currency === "USD"
                ? `≈ ${formatPrice(altPrice, "CDF")}`
                : formatPrice(altPrice, "USD")}
            </span>
          </p>
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-[11px] text-zinc-500">
            <span>
              {row.soldCount}/{row.quantity}
            </span>
            <span>{soldPercent}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
            <div
              className={cn("h-full rounded-full transition-all", TIER_BAR[row.tier])}
              style={{ width: `${Math.min(soldPercent, 100)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 px-4 py-4">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-zinc-500">
            Prix USD
          </span>
          <input
            type="number"
            min={0}
            value={row.priceUsd}
            onChange={(event) =>
              onUpdate({ priceUsd: Number(event.target.value) })
            }
            className={adminInput}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-zinc-500">
            Stock total
          </span>
          <input
            type="number"
            min={row.soldCount}
            value={row.quantity}
            onChange={(event) =>
              onUpdate({ quantity: Number(event.target.value) })
            }
            className={adminInput}
          />
          <span className="mt-1 block text-[11px] text-zinc-400">
            Min. {row.soldCount} vendus
          </span>
        </label>

        <div className="grid grid-cols-2 gap-2">
          <StatBox label="Vendus" value={String(row.soldCount)} />
          <StatBox label="Dispo." value={String(available)} />
        </div>
      </div>

      <div className="mt-auto border-t border-zinc-100 px-4 py-3">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className={`${adminBtnPrimary} w-full disabled:opacity-50`}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Enregistrer
        </button>
      </div>
    </article>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className={`${adminCardInset} px-3 py-2.5`}>
      <p className="text-[11px] font-medium text-zinc-500">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums text-zinc-900">
        {value}
      </p>
    </div>
  );
}
