import Image from "next/image";

type EventPageBackgroundProps = {
  src: string;
  alt?: string;
};

export function EventPageBackground({
  src,
  alt = "",
}: EventPageBackgroundProps) {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
      <Image
        src={src}
        alt={alt}
        fill
        priority
        sizes="100vw"
        className="object-cover object-center grayscale"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/75 to-[#050505]/35" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(251,191,36,0.12),_transparent_55%)]" />
    </div>
  );
}
