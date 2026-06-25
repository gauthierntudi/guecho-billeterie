import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import type { SupportedCurrency } from "@/lib/pricing";

export function formatPrice(
  amount: number,
  currency: SupportedCurrency | string = "CDF",
) {
  const code = currency === "USD" ? "USD" : "CDF";
  const locale = code === "USD" ? "en-US" : "fr-CD";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: code,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatEventDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
