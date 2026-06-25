import type { TicketTier } from "@prisma/client";
import QRCode from "qrcode";

export type TicketDownloadData = {
  ticketCode: string;
  tier: TicketTier;
};

const TICKET_TEMPLATE_SRC: Partial<Record<TicketTier, string>> = {
  STANDARD: "/img/tickets/ticket-standard.png",
  VIP: "/img/tickets/ticket-vip.png",
  VVIP: "/img/tickets/ticket-vvip.png",
};

function getTemplateSrc(tier: TicketTier): string {
  return TICKET_TEMPLATE_SRC[tier] ?? TICKET_TEMPLATE_SRC.STANDARD!;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function getQrPlacement(width: number, height: number) {
  const sectionStart = Math.round(height * (1089 / 1664));
  const qrSize = Math.round(width * 0.46);
  const qrX = Math.round((width - qrSize) / 2);
  const qrY = sectionStart + Math.round(height * 0.008) + 31;

  return { qrX, qrY, qrSize };
}

function getQrColors(tier: TicketTier) {
  if (tier === "VIP" || tier === "VVIP") {
    return { dark: "#ffffff", light: "#00000000" };
  }

  return { dark: "#294189", light: "#00000000" };
}

export async function renderTicketPng(data: TicketDownloadData): Promise<string> {
  const template = await loadImage(getTemplateSrc(data.tier));
  const width = template.naturalWidth;
  const height = template.naturalHeight;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas indisponible");
  }

  context.drawImage(template, 0, 0, width, height);

  const { qrX, qrY, qrSize } = getQrPlacement(width, height);

  const qrDataUrl = await QRCode.toDataURL(data.ticketCode, {
    width: qrSize,
    margin: 0,
    color: getQrColors(data.tier),
  });
  const qrImage = await loadImage(qrDataUrl);
  context.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

  return canvas.toDataURL("image/png");
}

export async function downloadTicketPng(
  data: TicketDownloadData,
  filename: string,
) {
  const dataUrl = await renderTicketPng(data);
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

export function formatTicketEventDate(dateIso: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(dateIso));
}

export function formatTicketEventTime(dateIso: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateIso));
}
