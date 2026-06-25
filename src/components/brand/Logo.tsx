import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export const LOGO_SRC = "/img/logo-guecho.png";

type LogoProps = {
  className?: string;
  imageClassName?: string;
  size?: "sm" | "md" | "lg" | "hero";
  href?: string;
  priority?: boolean;
};

const SIZES = {
  sm: {
    width: 160,
    height: 64,
    className: "h-9 w-auto md:h-11",
  },
  md: {
    width: 220,
    height: 88,
    className: "h-11 w-auto md:h-16 lg:h-[4.5rem]",
  },
  lg: {
    width: 280,
    height: 112,
    className: "h-14 w-auto md:h-20",
  },
  hero: {
    width: 480,
    height: 192,
    className: "h-28 w-auto sm:h-32 md:h-44 lg:h-52",
  },
} as const;

export function Logo({
  className,
  imageClassName,
  size = "md",
  href = "/",
  priority = false,
}: LogoProps) {
  const dimensions = SIZES[size];

  const image = (
    <Image
      src={LOGO_SRC}
      alt="GUECHO"
      width={dimensions.width}
      height={dimensions.height}
      priority={priority}
      className={cn(
        "object-contain object-left",
        dimensions.className,
        imageClassName,
      )}
    />
  );

  if (!href) {
    return <div className={cn("inline-flex shrink-0", className)}>{image}</div>;
  }

  return (
    <Link
      href={href}
      className={cn("inline-flex shrink-0 transition hover:opacity-90", className)}
      aria-label="GUECHO — Accueil"
    >
      {image}
    </Link>
  );
}
