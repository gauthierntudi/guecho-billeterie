import { cn } from "@/lib/utils";

type EventMetaChipProps = {
  children: React.ReactNode;
  tone: "amber" | "sky" | "navy";
};

const TONES = {
  amber: "bg-[#fe9800] text-black",
  sky: "bg-[#38bdf8] text-black",
  navy: "bg-[#0f1f4d] text-white",
} as const;

export function EventMetaChip({ children, tone }: EventMetaChipProps) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full rounded-full px-3 py-1.5 text-[10px] font-[family-name:var(--font-anton)] uppercase leading-tight md:text-[11px]",
        TONES[tone],
      )}
    >
      {children}
    </span>
  );
}
