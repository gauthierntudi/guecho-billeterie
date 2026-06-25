import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { adminCard } from "@/components/admin/admin-styles";

type AdminStatCardProps = {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  tone?: "amber" | "emerald" | "violet" | "sky";
};

const TONES = {
  amber: "bg-amber-50 border-amber-100",
  emerald: "bg-emerald-50 border-emerald-100",
  violet: "bg-violet-50 border-violet-100",
  sky: "bg-sky-50 border-sky-100",
} as const;

const ICON_TONES = {
  amber: "bg-amber-100 text-amber-700",
  emerald: "bg-emerald-100 text-emerald-700",
  violet: "bg-violet-100 text-violet-700",
  sky: "bg-sky-100 text-sky-700",
} as const;

export function AdminStatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "amber",
}: AdminStatCardProps) {
  return (
    <div className={cn(adminCard, "border p-5", TONES[tone])}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-600">{label}</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-zinc-900">
            {value}
          </p>
          {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
        </div>
        {Icon ? (
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              ICON_TONES[tone],
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function AdminStatGrid({ children }: { children: React.ReactNode }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{children}</section>
  );
}

type AdminPanelProps = {
  title: string;
  subtitle?: string;
  action?: { href: string; label: string };
  children: React.ReactNode;
  className?: string;
};

export function AdminPanel({
  title,
  subtitle,
  action,
  children,
  className,
}: AdminPanelProps) {
  return (
    <section className={cn(adminCard, "overflow-hidden", className)}>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-100 px-6 py-5 sm:px-7 sm:py-6">
        <div>
          <h3 className="text-base font-semibold text-zinc-900">{title}</h3>
          {subtitle ? (
            <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>
          ) : null}
        </div>
        {action ? (
          <Link
            href={action.href}
            className="text-xs font-medium text-zinc-600 transition hover:text-zinc-900"
          >
            {action.label} →
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}
