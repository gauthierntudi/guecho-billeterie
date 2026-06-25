import { cn } from "@/lib/utils";

type CreativeEventTitleProps = {
  title?: string;
  size?: "hero" | "slide" | "compact";
  className?: string;
};

function splitTitle(title: string) {
  const parts = title.trim().split(/\s+/);
  if (parts.length <= 1) {
    return { first: title, second: "" };
  }
  return { first: parts[0], second: parts.slice(1).join(" ") };
}

const SIZE_STYLES = {
  hero: {
    first: "text-4xl md:text-6xl lg:text-7xl tracking-tight",
    second: "text-6xl md:text-8xl lg:text-[9rem] lg:leading-[0.9]",
    gap: "mt-0",
  },
  slide: {
    first: "text-3xl md:text-5xl lg:text-6xl tracking-tight",
    second: "text-5xl md:text-7xl lg:text-[6.5rem] lg:leading-[0.92]",
    gap: "mt-0",
  },
  compact: {
    first: "text-2xl md:text-3xl tracking-tight",
    second: "text-3xl md:text-5xl leading-[0.95]",
    gap: "mt-0",
  },
} as const;

const antonClass =
  "font-[family-name:var(--font-anton)] uppercase text-white";

export function CreativeEventTitle({
  title = "Guecho Rocambole",
  size = "slide",
  className,
}: CreativeEventTitleProps) {
  const { first, second } = splitTitle(title);
  const styles = SIZE_STYLES[size];

  if (!second) {
    return (
      <h1 className={cn("leading-none", antonClass, styles.second, className)}>
        {first}
      </h1>
    );
  }

  return (
    <h1 className={cn("leading-none", className)}>
      <span className={cn("block", antonClass, styles.first)}>{first}</span>
      <span
        className={cn("block", antonClass, styles.second, styles.gap)}
      >
        {second}
      </span>
    </h1>
  );
}
