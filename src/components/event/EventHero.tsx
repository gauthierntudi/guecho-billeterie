"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Event } from "@prisma/client";
import { formatEventDate } from "@/lib/utils";
import { MapPin, Calendar } from "lucide-react";
import { CreativeEventTitle } from "@/components/brand/CreativeEventTitle";

gsap.registerPlugin(useGSAP, ScrollTrigger);

type EventHeroProps = {
  event: Event;
};

export function EventHero({ event }: EventHeroProps) {
  const heroRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

      tl.fromTo(
        ".hero-line",
        { y: 120, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1.2,
          stagger: 0.15,
          clearProps: "transform",
        },
      )
        .fromTo(
          ".hero-meta",
          { opacity: 0, y: 30 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            stagger: 0.1,
            clearProps: "transform",
          },
          "-=0.5",
        )
        .fromTo(
          ".hero-glow",
          { scale: 0.8, opacity: 0 },
          { scale: 1, opacity: 1, duration: 1.5, clearProps: "transform,opacity" },
          "-=1",
        );

      gsap.to(".hero-glow", {
        scale: 1.1,
        duration: 4,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    },
    { scope: heroRef },
  );

  return (
    <section
      ref={heroRef}
      className="relative flex min-h-screen items-end overflow-hidden px-6 pb-24 pt-32"
    >
      <div className="hero-glow pointer-events-none absolute -right-32 top-20 h-[500px] w-[500px] rounded-full bg-amber-500/20 blur-[120px]" />
      <div className="hero-glow pointer-events-none absolute -left-20 bottom-0 h-[400px] w-[400px] rounded-full bg-violet-600/15 blur-[100px]" />

      <div className="relative z-10 mx-auto w-full max-w-7xl">
        <p className="hero-line mb-6 text-xs uppercase tracking-[0.4em] text-amber-400">
          Événement exclusif
        </p>
        <div className="hero-line">
          <CreativeEventTitle title={event.title} size="hero" />
        </div>
        {event.subtitle && (
          <p className="hero-line mt-6 max-w-2xl text-lg text-white/60 md:text-xl">
            {event.subtitle}
          </p>
        )}

        <div className="mt-10 flex flex-wrap gap-6">
          <div className="hero-meta flex items-center gap-3 text-sm text-white/70">
            <Calendar className="h-4 w-4 text-amber-400" />
            {formatEventDate(event.startsAt)}
          </div>
          <div className="hero-meta flex items-center gap-3 text-sm text-white/70">
            <MapPin className="h-4 w-4 text-amber-400" />
            {event.venue}, {event.city}
          </div>
        </div>

        <a
          href="#billetterie"
          className="hero-meta relative z-20 mt-12 inline-flex items-center justify-center rounded-full bg-white px-10 py-5 text-sm font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-white/90 md:px-12 md:py-5 md:text-base"
        >
          Acheter Mon Billet
          <span aria-hidden className="ml-2">
            →
          </span>
        </a>
      </div>
    </section>
  );
}
