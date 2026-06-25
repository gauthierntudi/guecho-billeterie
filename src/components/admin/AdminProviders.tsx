"use client";

import { CurrencyProvider } from "@/contexts/CurrencyContext";

export function AdminProviders({ children }: { children: React.ReactNode }) {
  return <CurrencyProvider>{children}</CurrencyProvider>;
}
