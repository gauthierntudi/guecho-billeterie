import { cn } from "@/lib/utils";

const VARIANTS = {
  default: "bg-zinc-100 text-zinc-600",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  muted: "bg-zinc-50 text-zinc-400",
} as const;

type AdminBadgeProps = {
  children: React.ReactNode;
  variant?: keyof typeof VARIANTS;
};

export function AdminBadge({ children, variant = "default" }: AdminBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded-lg px-2 py-1 text-[11px] font-medium leading-none",
        VARIANTS[variant],
      )}
    >
      {children}
    </span>
  );
}
