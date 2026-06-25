export type SupportedCurrency = "USD" | "CDF";

export const CURRENCIES: SupportedCurrency[] = ["USD", "CDF"];

export const CURRENCY_LABELS: Record<SupportedCurrency, string> = {
  USD: "$ USD",
  CDF: "CDF",
};

const DEFAULT_EXCHANGE_RATE = 2300;

export function getExchangeRate(): number {
  const raw =
    process.env.NEXT_PUBLIC_CDF_EXCHANGE_RATE ??
    process.env.CDF_EXCHANGE_RATE ??
    String(DEFAULT_EXCHANGE_RATE);

  const rate = Number(raw);
  return Number.isFinite(rate) && rate > 0 ? rate : DEFAULT_EXCHANGE_RATE;
}

type PricedTicket = {
  priceUsd: number;
};

/** Prix CDF = prix USD × taux */
export function getCdfPrice(priceUsd: number, rate = getExchangeRate()): number {
  return Math.round(priceUsd * rate);
}

export function getTicketPrice(
  ticket: PricedTicket,
  currency: SupportedCurrency,
): number {
  return currency === "USD" ? ticket.priceUsd : getCdfPrice(ticket.priceUsd);
}
