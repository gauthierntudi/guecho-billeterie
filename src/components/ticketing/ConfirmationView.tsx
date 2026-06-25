"use client";

import { useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import type { TicketCategory, TicketTier } from "@prisma/client";
import type { SupportedCurrency } from "@/lib/pricing";
import { EVENT_DATE, EVENT_TIME, EVENT_VENUE } from "@/lib/event-meta";
import { formatPrice } from "@/lib/utils";
import { EventMetaChip } from "./EventMetaChip";
import { TicketPassList } from "./TicketPassList";

gsap.registerPlugin(useGSAP);

type OrderStatus = "paid" | "pending" | "cancelled";

type TicketItem = {
  id: string;
  ticketCode: string;
  ticketName: string;
  tier: TicketTier;
  category: TicketCategory;
};

type ConfirmationViewProps = {
  status: OrderStatus;
  orderNumber: string;
  customerName: string;
  customerEmail: string | null;
  eventTitle: string;
  eventSlug: string;
  totalAmount: number;
  currency: SupportedCurrency;
  tickets: TicketItem[];
};

const STATUS_COPY = {
  paid: {
    label: "Paiement confirmé",
    title: "Vos billets sont prêts",
    hint: "Téléchargez vos passes ou présentez le QR code à l'entrée.",
  },
  pending: {
    label: "Commande en attente",
    title: "Confirmation du paiement",
    hint: "Si le montant a été débité sur votre Mobile Money, vos billets apparaîtront ici automatiquement dès validation. Cette page se met à jour sans action de votre part.",
  },
  cancelled: {
    label: "Paiement non abouti",
    title: "Commande annulée",
    hint: "La transaction n'a pas été confirmée. Vous pouvez réessayer.",
  },
} as const;

export function ConfirmationView({
  status,
  orderNumber,
  customerName,
  customerEmail,
  eventTitle,
  eventSlug,
  totalAmount,
  currency,
  tickets,
}: ConfirmationViewProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const copy = STATUS_COPY[status];

  useGSAP(
    () => {
      gsap.fromTo(
        ".confirmation-intro > *",
        { y: 28, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.75,
          stagger: 0.08,
          ease: "power3.out",
          clearProps: "transform",
        },
      );

      gsap.fromTo(
        ".confirmation-panel, .ticket-pass",
        { y: 36, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.65,
          stagger: 0.1,
          delay: 0.15,
          ease: "power3.out",
          clearProps: "transform",
        },
      );
    },
    { scope: rootRef },
  );

  return (
    <div ref={rootRef} className="relative min-h-screen text-white">
      <section className="mx-auto max-w-7xl px-6 pb-24 pt-32">
        <div className="confirmation-intro mb-10 border-b border-white/10 pb-10">
          <p className="text-sm uppercase tracking-[0.3em] text-amber-400">
            {copy.label}
          </p>
          <h1 className="mt-4 font-[family-name:var(--font-anton)] text-4xl uppercase leading-[0.95] md:text-5xl">
            {copy.title}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/55 md:text-base">
            {copy.hint}
          </p>
        </div>

        <div className="flex flex-col gap-8 xl:flex-row xl:items-start xl:gap-5">
          <aside className="confirmation-panel w-full shrink-0 xl:sticky xl:top-28 xl:w-[360px]">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur sm:p-6">
              <h2 className="text-sm uppercase tracking-[0.3em] text-white/50">
                Récapitulatif
              </h2>

              <div className="mt-5 space-y-4">
                <div>
                  <p className="font-[family-name:var(--font-anton)] text-xl uppercase leading-[0.95] text-white/95 md:text-2xl">
                    {eventTitle}
                  </p>
                  <p className="mt-2 text-sm text-white/45">
                    {customerName}
                    {customerEmail ? ` · ${customerEmail}` : null}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <EventMetaChip tone="amber">{EVENT_DATE}</EventMetaChip>
                  <EventMetaChip tone="sky">{EVENT_TIME}</EventMetaChip>
                  <EventMetaChip tone="navy">{EVENT_VENUE}</EventMetaChip>
                </div>

                <div className="space-y-2 border-t border-white/10 pt-4 text-sm">
                  <div className="flex items-center justify-between gap-3 text-white/55">
                    <span>Commande</span>
                    <span className="font-mono text-white/80">{orderNumber}</span>
                  </div>
                  {status === "paid" && tickets.length > 0 ? (
                    <div className="flex items-center justify-between gap-3 text-white/55">
                      <span>Billets</span>
                      <span className="text-white/80">{tickets.length}</span>
                    </div>
                  ) : null}
                </div>

                <div className="flex items-center justify-between border-t border-white/10 pt-3">
                  <span className="text-sm uppercase tracking-widest text-white/50">
                    Total
                  </span>
                  <span className="text-2xl text-amber-300">
                    {formatPrice(totalAmount, currency)}
                  </span>
                </div>
              </div>

              <Link
                href={`/evenement/${eventSlug}`}
                className="mt-6 inline-flex w-full items-center justify-center rounded-full border border-white/10 px-5 py-3 text-xs font-medium uppercase tracking-widest text-white/60 transition hover:border-white/25 hover:text-white"
              >
                Retour à l&apos;événement
              </Link>
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            {status === "paid" && tickets.length > 0 ? (
              <TicketPassList tickets={tickets} />
            ) : (
              <div className="confirmation-panel rounded-2xl border border-white/10 bg-white/5 px-6 py-16 text-center backdrop-blur sm:px-10">
                <p className="text-sm uppercase tracking-[0.3em] text-white/40">
                  Billets
                </p>
                <p className="mx-auto mt-4 max-w-md text-lg font-light leading-relaxed text-white/75">
                  {status === "cancelled"
                    ? "Aucun billet n'a été émis pour cette commande."
                    : "Vos passes apparaîtront ici dès confirmation du paiement."}
                </p>
                {status === "cancelled" ? (
                  <Link
                    href={`/evenement/${eventSlug}#billetterie`}
                    className="mt-8 inline-flex items-center justify-center rounded-full bg-amber-400 px-6 py-3.5 text-xs font-semibold uppercase tracking-widest text-black transition hover:bg-amber-300"
                  >
                    Réessayer
                  </Link>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
