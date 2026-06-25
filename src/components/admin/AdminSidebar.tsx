"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ExternalLink,
  LogOut,
  Settings,
  HelpCircle,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";
import { cn } from "@/lib/utils";

const OVERVIEW = [
  { href: "/admin", label: "Tableau de bord", exact: true },
  { href: "/admin/tickets", label: "Billets" },
  { href: "/admin/orders", label: "Transactions" },
] as const;

const SUPPORT = [
  { href: "/admin/settings", label: "Paramètres", icon: Settings },
  { href: "/", label: "Voir le site", external: true, icon: ExternalLink },
] as const;

export function AdminSidebar() {
  const currentPath = usePathname();

  return (
    <aside className="flex h-screen w-full flex-col overflow-y-auto border-r border-zinc-100 px-6 py-8">
      <Logo href="/admin" size="sm" />

      <div className="mt-8 flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold text-white">
          GR
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-zinc-900">
            Guecho Admin
          </p>
          <p className="truncate text-xs text-zinc-500">Billetterie</p>
        </div>
      </div>

      <div className="mt-10">
        <p className="mb-4 px-3 text-xs font-medium text-zinc-400">Overview</p>
        <nav className="space-y-1">
          {OVERVIEW.map((item) => {
            const active =
              "exact" in item && item.exact
                ? currentPath === item.href
                : currentPath.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center rounded-xl px-3 py-3 text-sm transition",
                  active
                    ? "font-semibold text-zinc-900"
                    : "text-zinc-500 hover:text-zinc-800",
                )}
              >
                {active ? (
                  <span className="absolute -left-1 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-zinc-900" />
                ) : null}
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto pt-8">
        <p className="mb-3 px-3 text-xs font-medium text-zinc-400">Support</p>
        <div className="space-y-1">
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-zinc-500 transition hover:text-zinc-800"
          >
            <HelpCircle className="h-4 w-4" />
            Aide
          </button>
          {SUPPORT.map((item) => {
            const isExternal = "external" in item && item.external;
            const active = !isExternal && currentPath.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                {...(isExternal ? { target: "_blank" } : {})}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition",
                  active
                    ? "font-semibold text-zinc-900"
                    : "text-zinc-500 hover:text-zinc-800",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
          <AdminLogoutButton className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-zinc-500 transition hover:text-zinc-800">
            <LogOut className="h-4 w-4" />
            Déconnexion
          </AdminLogoutButton>
        </div>
      </div>
    </aside>
  );
}
