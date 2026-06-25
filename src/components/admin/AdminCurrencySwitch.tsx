"use client";

import { useCurrency } from "@/contexts/CurrencyContext";
import { CURRENCIES } from "@/lib/pricing";
import { cn } from "@/lib/utils";

export function AdminCurrencySwitch({ className }: { className?: string }) {
  const { currency, setCurrency } = useCurrency();

  return (
    <div
      className={cn(
        "flex rounded-full border border-zinc-200 bg-zinc-100 p-1",
        className,
      )}
      role="group"
      aria-label="Afficher en CDF ou USD"
    >
      {CURRENCIES.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setCurrency(code)}
          className={cn(
            "rounded-full px-3.5 py-1.5 text-xs font-semibold transition",
            currency === code
              ? "bg-white text-zinc-900 shadow-sm"
              : "text-zinc-500 hover:text-zinc-800",
          )}
        >
          {code}
        </button>
      ))}
    </div>
  );
}
