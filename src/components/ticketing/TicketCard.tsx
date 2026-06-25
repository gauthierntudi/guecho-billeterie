"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { TicketCategory, TicketTier } from "@prisma/client";
import { TICKET_CATEGORY_LABELS } from "@/types/ticketing";

gsap.registerPlugin(useGSAP, ScrollTrigger);

type TicketCardProps = {
  ticketCode: string;
  tier: TicketTier;
  name: string;
  category: TicketCategory;
};

const TIER_COLORS: Record<TicketTier, string> = {
  STANDARD: "from-zinc-500/20 to-zinc-900/40 border-zinc-500/30",
  VIP: "from-amber-500/20 to-amber-900/30 border-amber-400/40",
  VVIP: "from-violet-500/25 to-violet-900/40 border-violet-400/40",
  STREAMING_ACCESS: "from-cyan-500/20 to-cyan-900/30 border-cyan-400/40",
};

export function TicketCard({ ticketCode, tier, name, category }: TicketCardProps) {
  const cardRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      gsap.from(cardRef.current, {
        scale: 0.95,
        opacity: 0,
        duration: 0.6,
        ease: "back.out(1.4)",
      });
    },
    { scope: cardRef },
  );

  return (
    <article
      ref={cardRef}
      className={`rounded-2xl border bg-gradient-to-br p-6 ${TIER_COLORS[tier]}`}
    >
      <p className="text-xs uppercase tracking-[0.3em] text-white/50">
        {TICKET_CATEGORY_LABELS[category]}
      </p>
      <h3 className="mt-2 text-2xl font-light">{name}</h3>
      <p className="mt-6 font-mono text-3xl tracking-[0.2em] text-white/90">
        {ticketCode}
      </p>
      <p className="mt-4 text-xs text-white/40">
        Présentez ce code à l&apos;entrée ou dans votre espace streaming.
      </p>
    </article>
  );
}
