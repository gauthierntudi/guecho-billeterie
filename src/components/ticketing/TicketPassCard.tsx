import { Download, Loader2 } from "lucide-react";
import type { TicketCategory, TicketTier } from "@prisma/client";
import {
  TICKET_CATEGORY_LABELS,
  TICKET_TIER_LABELS,
  isStreamingTicket,
} from "@/types/ticketing";
import { TICKET_TIER_STYLES } from "@/lib/ticket-tier-styles";
import { cn } from "@/lib/utils";

export type TicketPassItem = {
  id: string;
  ticketCode: string;
  ticketName: string;
  tier: TicketTier;
  category: TicketCategory;
};

type TicketPassCardProps = {
  ticket: TicketPassItem;
  qrSrc?: string;
  downloading?: boolean;
  onDownload?: () => void;
  className?: string;
};

export function TicketPassCard({
  ticket,
  qrSrc,
  downloading = false,
  onDownload,
  className,
}: TicketPassCardProps) {
  const style = TICKET_TIER_STYLES[ticket.tier];
  const Icon = style.icon;
  const streamingOnly = isStreamingTicket(ticket);

  return (
    <article
      className={cn(
        "ticket-pass group relative overflow-hidden rounded-2xl border",
        style.card,
        style.border,
        style.glow,
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/15 blur-xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-8 -left-4 h-20 w-20 rounded-full bg-black/15 blur-xl"
      />

      <div className="relative flex flex-col lg:flex-row lg:items-stretch">
        <div className="flex-1 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-[family-name:var(--font-anton)] text-[10px] uppercase tracking-[0.12em]",
                style.badge,
              )}
            >
              <Icon className="h-3 w-3" />
              {TICKET_TIER_LABELS[ticket.tier]}
            </span>
            <span className={cn("text-[9px] uppercase tracking-[0.2em]", style.meta)}>
              {TICKET_CATEGORY_LABELS[ticket.category]}
            </span>
          </div>

          <h3
            className={cn(
              "mt-4 font-[family-name:var(--font-anton)] text-2xl uppercase leading-[0.95] sm:text-[1.75rem]",
              style.title,
            )}
          >
            {ticket.ticketName}
          </h3>

          <p className={cn("mt-3 text-xs uppercase tracking-[0.22em]", style.meta)}>
            Code billet
          </p>
          <p
            className={cn(
              "mt-1 font-mono text-xl tracking-[0.14em] sm:text-2xl",
              style.code,
            )}
          >
            {ticket.ticketCode}
          </p>

          <p className={cn("mt-4 text-xs leading-relaxed", style.description)}>
            {streamingOnly
              ? "Consultez ce QR code depuis votre espace streaming — billet non téléchargeable."
              : "Présentez ce QR code à l'entrée ou dans votre espace streaming."}
          </p>
        </div>

        <div
          className={cn(
            "flex flex-col items-center justify-center gap-4 border-t px-5 py-5 sm:px-6 lg:w-[220px] lg:border-l lg:border-t-0",
            ticket.tier === "VIP" || ticket.tier === "STREAMING_ACCESS"
              ? "border-black/15"
              : "border-white/15",
          )}
        >
          <div className={cn("rounded-2xl p-2.5 shadow-lg", style.qrWrap)}>
            {qrSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrSrc}
                alt={`QR ${ticket.ticketCode}`}
                className="h-36 w-36"
              />
            ) : (
              <div className="flex h-36 w-36 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
              </div>
            )}
          </div>

          {onDownload ? (
            <button
              type="button"
              onClick={onDownload}
              disabled={downloading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-amber-400 px-5 py-3 text-[10px] font-semibold uppercase tracking-widest text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {downloading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Télécharger
            </button>
          ) : streamingOnly ? (
            <p
              className={cn(
                "text-center text-[10px] uppercase leading-relaxed tracking-widest",
                style.meta,
              )}
            >
              Accès en ligne uniquement
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
