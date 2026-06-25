"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Tableau de bord", exact: true },
  { href: "/admin/tickets", label: "Billets" },
  { href: "/admin/orders", label: "Transactions" },
] as const;

export function AdminNav() {
  const currentPath = usePathname();

  return (
    <nav className="flex gap-1 rounded-2xl bg-zinc-100 p-1">
      {NAV.map((item) => {
        const active =
          "exact" in item && item.exact
            ? currentPath === item.href
            : currentPath.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex-1 rounded-xl px-3 py-2 text-center text-xs font-medium transition",
              active
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-500",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
