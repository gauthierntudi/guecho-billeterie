import { TicketCategory, TicketTier } from "@prisma/client";
import type { FlexPayPaymentType } from "@/lib/flexpaie";
import type { SupportedCurrency } from "@/lib/pricing";

export const TICKET_TIER_LABELS: Record<TicketTier, string> = {
  STANDARD: "Standard",
  VIP: "VIP",
  VVIP: "VVIP",
  STREAMING_ACCESS: "Access Streaming",
};

export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  SPECTACLE: "Billet Spectacle",
  STREAMING: "Billet Streaming",
};

export function isStreamingTicket(ticket: {
  category: TicketCategory;
  tier: TicketTier;
}) {
  return (
    ticket.category === "STREAMING" || ticket.tier === "STREAMING_ACCESS"
  );
}

export type CartItem = {
  ticketTypeId: string;
  tier: TicketTier;
  category: TicketCategory;
  name: string;
  price: number;
  currency: SupportedCurrency;
  quantity: number;
};

export type CreateOrderPayload = {
  eventSlug: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  paymentPhone?: string;
  paymentType: FlexPayPaymentType;
  currency: SupportedCurrency;
  items: { ticketTypeId: string; quantity: number }[];
};

export type CreateOrderResponse =
  | {
      orderId: string;
      orderNumber: string;
      mode: "mobile";
      flexPayOrderNumber: string;
      message: string;
    }
  | {
      orderId: string;
      orderNumber: string;
      mode: "card";
      redirectUrl: string;
      redirectParams: Record<string, string>;
    };
