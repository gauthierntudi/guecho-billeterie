import { cn } from "@/lib/utils";

type PageLoaderProps = {
  theme?: "admin" | "site";
  variant?: "full" | "inline";
  label?: string;
  className?: string;
};

const THEMES = {
  admin: {
    shell: "bg-[#eef1f6]",
    ring: "border-zinc-200 border-t-zinc-700",
    label: "text-zinc-500",
  },
  site: {
    shell: "bg-[#050505]",
    ring: "border-white/10 border-t-amber-400",
    label: "text-white/50",
  },
} as const;

export function PageLoader({
  theme = "site",
  variant = "full",
  label = "Chargement",
  className,
}: PageLoaderProps) {
  const palette = THEMES[theme];

  const content = (
    <div className="flex flex-col items-center gap-5">
      <div
        className={cn(
          "h-12 w-12 animate-spin rounded-full border-[3px]",
          palette.ring,
        )}
        aria-hidden
      />
      <p className={cn("text-sm font-medium tracking-wide", palette.label)}>
        {label}
      </p>
    </div>
  );

  if (variant === "inline") {
    return (
      <div
        className={cn(
          "flex min-h-0 w-full flex-1 items-center justify-center px-6",
          className,
        )}
        role="status"
        aria-live="polite"
        aria-label={label}
      >
        {content}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-[100dvh] w-full items-center justify-center",
        palette.shell,
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      {content}
    </div>
  );
}
