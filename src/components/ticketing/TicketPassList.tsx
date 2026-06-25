"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Download, Loader2 } from "lucide-react";
import { downloadTicketPng } from "@/lib/ticket-download";
import { isStreamingTicket } from "@/types/ticketing";
import { TicketPassCard, type TicketPassItem } from "./TicketPassCard";

type TicketPassListProps = {
  tickets: TicketPassItem[];
  title?: string;
  className?: string;
};

export function TicketPassList({
  tickets,
  title = "Vos passes",
  className,
}: TicketPassListProps) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;

    async function generateCodes() {
      const entries = await Promise.all(
        tickets.map(async (ticket) => {
          const dataUrl = await QRCode.toDataURL(ticket.ticketCode, {
            width: 176,
            margin: 1,
            color: { dark: "#000000", light: "#ffffff" },
          });
          return [ticket.id, dataUrl] as const;
        }),
      );

      if (active) {
        setQrCodes(Object.fromEntries(entries));
      }
    }

    if (tickets.length > 0) {
      generateCodes();
    } else {
      setQrCodes({});
    }

    return () => {
      active = false;
    };
  }, [tickets]);

  async function downloadOne(ticket: TicketPassItem) {
    await downloadTicketPng(
      {
        ticketCode: ticket.ticketCode,
        tier: ticket.tier,
      },
      `billet-${ticket.ticketCode}.png`,
    );
  }

  async function handleDownload(ticket: TicketPassItem) {
    setDownloadingId(ticket.id);
    try {
      await downloadOne(ticket);
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleDownloadAll() {
    const downloadable = tickets.filter((ticket) => !isStreamingTicket(ticket));
    if (!downloadable.length) return;

    setDownloadingAll(true);
    try {
      for (const ticket of downloadable) {
        await downloadOne(ticket);
        await new Promise((resolve) => window.setTimeout(resolve, 250));
      }
    } finally {
      setDownloadingAll(false);
    }
  }

  if (!tickets.length) return null;

  const downloadableTickets = tickets.filter(
    (ticket) => !isStreamingTicket(ticket),
  );

  return (
    <div className={className}>
      <div className="flex flex-wrap items-end justify-between gap-4 px-1">
        <div>
          <h3 className="text-sm uppercase tracking-[0.3em] text-white/50">
            {title}
          </h3>
          <p className="mt-2 text-sm text-white/45">
            {tickets.length} billet{tickets.length > 1 ? "s" : ""} émis
          </p>
        </div>
        {downloadableTickets.length > 1 ? (
          <button
            type="button"
            onClick={handleDownloadAll}
            disabled={downloadingAll || downloadingId !== null}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-white/70 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {downloadingAll ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            Tout télécharger
          </button>
        ) : null}
      </div>

      <div className="mt-4 space-y-4">
        {tickets.map((ticket) => (
          <TicketPassCard
            key={ticket.id}
            ticket={ticket}
            qrSrc={qrCodes[ticket.id]}
            downloading={downloadingId === ticket.id || downloadingAll}
            onDownload={
              isStreamingTicket(ticket)
                ? undefined
                : () => handleDownload(ticket)
            }
          />
        ))}
      </div>
    </div>
  );
}
