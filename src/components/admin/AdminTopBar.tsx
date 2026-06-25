"use client";

import { ChevronDown } from "lucide-react";
import { AdminCurrencySwitch } from "@/components/admin/AdminCurrencySwitch";
import { adminSectionTitle } from "@/components/admin/admin-styles";

type AdminTopBarProps = {
  eventTitle: string;
  subtitle?: string;
};

export function AdminTopBar({ eventTitle, subtitle }: AdminTopBarProps) {
  return (
    <header className="mb-10 flex flex-col gap-5 lg:mb-12">
      <div className="flex w-full flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-5">
          <h1 className={`${adminSectionTitle} text-2xl sm:text-[1.75rem]`}>
            Bonjour 👋
          </h1>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-5 py-2.5 text-sm font-medium text-zinc-700"
          >
            {eventTitle}
            <ChevronDown className="h-4 w-4 text-zinc-400" />
          </button>
        </div>

        <div className="ml-auto shrink-0">
          <AdminCurrencySwitch />
        </div>
      </div>

      {subtitle ? (
        <p className="text-sm text-zinc-500">{subtitle}</p>
      ) : null}
    </header>
  );
}
