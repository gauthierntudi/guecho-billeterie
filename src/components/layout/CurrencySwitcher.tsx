"use client";

import { useCurrency } from "@/contexts/CurrencyContext";
import { CURRENCIES, CURRENCY_LABELS } from "@/lib/pricing";
import { cn } from "@/lib/utils";

type CurrencySwitcherProps = {
  className?: string;
};

export function CurrencySwitcher({ className }: CurrencySwitcherProps) {
  const { currency, setCurrency } = useCurrency();

  return (
    <div
      className={cn(
        "flex rounded-full border border-white/20 bg-black/40 p-1",
        className,
      )}
      role="group"
      aria-label="Choisir la devise"
    >
      {CURRENCIES.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setCurrency(code)}
          className={cn(
            "rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition",
            currency === code
              ? "bg-amber-400 text-black"
              : "text-white/60 hover:text-white",
          )}
        >
          {CURRENCY_LABELS[code]}
        </button>
      ))}
    </div>
  );
}
