import type { TicketTier } from "@prisma/client";
import { Crown, MonitorPlay, Star, Ticket, type LucideIcon } from "lucide-react";

export type TicketTierStyle = {
  card: string;
  border: string;
  badge: string;
  icon: LucideIcon;
  glow: string;
  title: string;
  description: string;
  price: string;
  meta: string;
  premium: string;
  qtyBtn: string;
  qtyBtnAdd: string;
  code: string;
  qrWrap: string;
};

export const TICKET_TIER_STYLES: Record<TicketTier, TicketTierStyle> = {
  STANDARD: {
    card: "bg-gradient-to-br from-[#64748b] via-[#475569] to-[#1e293b]",
    border: "border-white/25",
    badge: "bg-black/25 text-white",
    icon: Ticket,
    glow: "shadow-none sm:shadow-[0_20px_50px_-12px_rgba(100,116,139,0.55)]",
    title: "text-white",
    description: "text-white/80",
    price: "text-white",
    meta: "text-white/65",
    premium: "text-white/80",
    qtyBtn:
      "border-white/35 bg-black/20 text-white hover:border-white hover:bg-white/15",
    qtyBtnAdd: "hover:border-white hover:bg-white/20",
    code: "text-white",
    qrWrap: "bg-white",
  },
  VIP: {
    card: "bg-gradient-to-br from-[#fe9800] via-[#f97316] to-[#c2410c]",
    border: "border-black/20",
    badge: "bg-black/20 text-black",
    icon: Star,
    glow: "shadow-none sm:shadow-[0_20px_50px_-12px_rgba(254,152,0,0.55)]",
    title: "text-black",
    description: "text-black/75",
    price: "text-black",
    meta: "text-black/65",
    premium: "text-black/80",
    qtyBtn:
      "border-black/25 bg-black/10 text-black hover:border-black/50 hover:bg-black/20",
    qtyBtnAdd: "hover:border-black hover:bg-black/25",
    code: "text-black",
    qrWrap: "bg-white",
  },
  VVIP: {
    card: "bg-gradient-to-br from-[#a855f7] via-[#7c3aed] to-[#4c1d95]",
    border: "border-violet-200/30",
    badge: "bg-black/25 text-violet-100",
    icon: Crown,
    glow: "shadow-none sm:shadow-[0_20px_50px_-12px_rgba(124,58,237,0.6)]",
    title: "text-white",
    description: "text-violet-100/85",
    price: "text-white",
    meta: "text-violet-100/70",
    premium: "text-violet-200",
    qtyBtn:
      "border-white/35 bg-black/20 text-white hover:border-white hover:bg-white/15",
    qtyBtnAdd: "hover:border-violet-200 hover:bg-white/20",
    code: "text-white",
    qrWrap: "bg-white",
  },
  STREAMING_ACCESS: {
    card: "bg-gradient-to-br from-[#38bdf8] via-[#0ea5e9] to-[#0369a1]",
    border: "border-black/15",
    badge: "bg-black/15 text-black",
    icon: MonitorPlay,
    glow: "shadow-none sm:shadow-[0_20px_50px_-12px_rgba(56,189,248,0.55)]",
    title: "text-black",
    description: "text-black/75",
    price: "text-black",
    meta: "text-black/65",
    premium: "text-black/80",
    qtyBtn:
      "border-black/25 bg-black/10 text-black hover:border-black/50 hover:bg-black/20",
    qtyBtnAdd: "hover:border-black hover:bg-black/25",
    code: "text-black",
    qrWrap: "bg-white",
  },
};
