"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Calendar, Clock, MapPin, type LucideIcon } from "lucide-react";
import { EVENT_DATE, EVENT_TIME, EVENT_VENUE } from "@/lib/event-meta";
import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP);

const CIRCLE_SIZE =
  "h-[5.25rem] w-[5.25rem] md:h-32 md:w-32 lg:h-36 lg:w-36";

type MetaCircleConfig = {
  id: string;
  label?: string;
  value: string;
  bgClass: string;
  labelClass?: string;
  valueClass: string;
  iconClass: string;
  Icon: LucideIcon;
  floatY: number;
  gridClass: string;
};

const META_CIRCLES: MetaCircleConfig[] = [
  {
    id: "date",
    value: EVENT_DATE,
    bgClass: "bg-[#fe9800]",
    Icon: Calendar,
    iconClass: "text-black/8",
    valueClass:
      "text-sm leading-[1.05] text-black md:text-base lg:text-lg",
    floatY: 7,
    gridClass: "col-start-1 row-start-1",
  },
  {
    id: "venue",
    value: EVENT_VENUE,
    bgClass: "bg-[#0f1f4d]",
    Icon: MapPin,
    iconClass: "text-white/8",
    valueClass:
      "text-xs leading-[1.05] text-white md:text-base lg:text-lg",
    floatY: 9,
    gridClass: "col-start-2 row-start-1",
  },
  {
    id: "time",
    label: "À partir de",
    value: EVENT_TIME,
    bgClass: "bg-[#38bdf8]",
    Icon: Clock,
    iconClass: "text-black/8",
    labelClass:
      "text-[6px] normal-case tracking-[0.08em] text-black/60 md:text-[7px]",
    valueClass:
      "font-[family-name:var(--font-anton)] text-xl leading-none text-black md:text-2xl lg:text-3xl",
    floatY: 6,
    gridClass: "col-span-2 row-start-2 justify-self-center -mt-2 md:-mt-3",
  },
];

function usePointerHover() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(
      "(min-width: 768px) and (hover: hover) and (pointer: fine)",
    );
    const update = () => setEnabled(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return enabled;
}

type EventMetaStripProps = {
  className?: string;
};

export function EventMetaStrip({ className }: EventMetaStripProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const hoverEnabled = usePointerHover();

  const onCircleEnter = useCallback((event: MouseEvent<HTMLDivElement>) => {
    if (!hoverEnabled) return;

    gsap.to(event.currentTarget, {
      scale: 1.14,
      filter: "brightness(1.1)",
      boxShadow: "0 18px 42px rgba(0,0,0,0.38)",
      duration: 0.35,
      ease: "power2.out",
      overwrite: "auto",
    });
  }, [hoverEnabled]);

  const onCircleLeave = useCallback((event: MouseEvent<HTMLDivElement>) => {
    if (!hoverEnabled) return;

    gsap.to(event.currentTarget, {
      scale: 1,
      filter: "brightness(1)",
      boxShadow: "0 0 0 rgba(0,0,0,0)",
      duration: 0.45,
      ease: "power2.out",
      overwrite: "auto",
    });
  }, [hoverEnabled]);

  useGSAP(
    () => {
      gsap.fromTo(
        ".meta-circle",
        { scale: 0.75, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          duration: 0.85,
          stagger: 0.12,
          delay: 0.55,
          ease: "back.out(1.4)",
        },
      );

      gsap.utils
        .toArray<HTMLElement>(".meta-circle-wrap")
        .forEach((wrap, index) => {
          const distance = Number(wrap.dataset.floatY ?? 8);
          gsap.to(wrap, {
            y: distance,
            duration: 2.8 + index * 0.2,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
            delay: 0.3 + index * 0.4,
          });
        });
    },
    { scope: rootRef },
  );

  return (
    <div
      ref={rootRef}
      className={cn(
        "pointer-events-none absolute inset-0 z-[15]",
        className,
      )}
      aria-label="Informations événement"
    >
      <div className="absolute right-3 top-1/2 -translate-y-1/2 md:right-14 lg:right-20">
        <div className="grid grid-cols-2 gap-x-3 md:gap-x-4">
          {META_CIRCLES.map((item) => {
            const Icon = item.Icon;

            return (
            <div
              key={item.id}
              data-float-y={item.floatY}
              className={cn("meta-circle-wrap flex justify-center", item.gridClass)}
            >
              <div
                role="presentation"
                onMouseEnter={onCircleEnter}
                onMouseLeave={onCircleLeave}
                className={cn(
                  "meta-circle relative flex flex-col items-center justify-center overflow-hidden rounded-full px-2 text-center transition-[box-shadow] will-change-transform md:px-3",
                  CIRCLE_SIZE,
                  item.bgClass,
                  hoverEnabled
                    ? "pointer-events-auto cursor-pointer"
                    : "pointer-events-none",
                )}
              >
                <Icon
                  aria-hidden
                  strokeWidth={1.25}
                  className={cn(
                    "pointer-events-none absolute left-1/2 top-1/2 h-[72%] w-[72%] -translate-x-1/2 -translate-y-1/2",
                    item.iconClass,
                  )}
                />
                <div className="relative z-10 flex flex-col items-center">
                {item.label ? (
                  <p
                    className={cn(
                      "text-[7px] uppercase tracking-[0.28em] md:text-[8px]",
                      item.labelClass,
                    )}
                  >
                    {item.label}
                  </p>
                ) : null}
                <p
                  className={cn(
                    "max-w-[88%] font-[family-name:var(--font-anton)] uppercase",
                    item.label ? "mt-1" : "",
                    item.valueClass,
                  )}
                >
                  {item.value}
                </p>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
