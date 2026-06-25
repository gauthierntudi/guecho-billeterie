"use client";

import type { TicketType, TicketTier } from "@prisma/client";
import { Minus, Plus } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { getTicketPrice } from "@/lib/pricing";
import { TICKET_TIER_STYLES } from "@/lib/ticket-tier-styles";
import { formatPrice } from "@/lib/utils";
import { TICKET_TIER_LABELS } from "@/types/ticketing";

type TicketTypeCardProps = {
  ticket: TicketType;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
};

const TIER_STYLES = TICKET_TIER_STYLES;

export function TicketTypeCard({
  ticket,
  quantity,
  onQuantityChange,
}: TicketTypeCardProps) {
  const { currency } = useCurrency();
  const available = ticket.quantity - ticket.soldCount;
  const isSoldOut = available <= 0;
  const style = TIER_STYLES[ticket.tier];
  const Icon = style.icon;
  const price = getTicketPrice(ticket, currency);

  return (
    <article
      className={`ticket-type-card group relative flex h-full flex-col overflow-hidden rounded-xl border p-4 opacity-100 transition sm:rounded-2xl sm:p-5 xl:min-h-[340px] xl:p-4 ${style.card} ${style.border} ${style.glow} ${isSoldOut ? "opacity-50" : ""} max-xl:hover:scale-[1.01] xl:hover:scale-[1.02] hover:brightness-105`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/15 blur-xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-8 -left-4 h-16 w-16 rounded-full bg-black/15 blur-xl"
      />

      <div className="relative mb-3 flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] ${style.badge}`}
        >
          <Icon className="h-2.5 w-2.5" />
          {TICKET_TIER_LABELS[ticket.tier]}
        </span>
        {ticket.tier === "VVIP" && (
          <span
            className={`text-[9px] uppercase tracking-widest ${style.premium}`}
          >
            Premium
          </span>
        )}
      </div>

      <h4
        className={`relative font-[family-name:var(--font-anton)] text-lg uppercase leading-[0.95] sm:text-base xl:text-base ${style.title}`}
      >
        {ticket.name}
      </h4>
      {ticket.description && (
        <p
          className={`relative mt-1.5 line-clamp-2 text-sm leading-relaxed sm:line-clamp-3 sm:text-xs xl:flex-1 ${style.description}`}
        >
          {ticket.description}
        </p>
      )}
      <p
        className={`relative mt-4 font-[family-name:var(--font-anton)] text-2xl uppercase leading-none sm:mt-3 sm:text-xl xl:mt-4 xl:text-2xl ${style.price}`}
      >
        {formatPrice(price, currency)}
      </p>
      <p className={`relative mt-1 text-[10px] ${style.meta}`}>
        {isSoldOut ? "Complet" : `${available} places restantes`}
      </p>

      <div className="relative mt-4 flex items-center gap-2 sm:mt-3 xl:mt-4">
        <button
          type="button"
          disabled={quantity === 0 || isSoldOut}
          onClick={() => onQuantityChange(quantity - 1)}
          className={`flex h-10 w-10 touch-manipulation items-center justify-center rounded-full border transition disabled:opacity-30 sm:h-8 sm:w-8 ${style.qtyBtn}`}
          aria-label="Diminuer"
        >
          <Minus className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
        </button>
        <span
          className={`min-w-[1.75rem] text-center font-mono text-lg sm:min-w-[1.5rem] sm:text-base ${style.title}`}
        >
          {quantity}
        </span>
        <button
          type="button"
          disabled={quantity >= available || isSoldOut}
          onClick={() => onQuantityChange(quantity + 1)}
          className={`flex h-10 w-10 touch-manipulation items-center justify-center rounded-full border transition disabled:opacity-30 sm:h-8 sm:w-8 ${style.qtyBtn} ${style.qtyBtnAdd}`}
          aria-label="Augmenter"
        >
          <Plus className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
        </button>
      </div>
    </article>
  );
}
