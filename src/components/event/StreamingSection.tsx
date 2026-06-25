"use client";

import Link from "next/link";
import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  Clock,
  Globe2,
  MonitorPlay,
  Radio,
} from "lucide-react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const FEATURES = [
  {
    icon: MonitorPlay,
    title: "Qualité HD",
    description: "Flux optimisé multi-appareils, faible latence.",
    accent: "from-violet-500/25 via-violet-500/5 to-transparent",
    border: "border-violet-400/20",
    iconWrap: "bg-violet-500/15 text-violet-300 ring-violet-400/25",
  },
  {
    icon: Globe2,
    title: "Accès mondial",
    description: "Regardez depuis n'importe où, sans limite géographique.",
    accent: "from-amber-500/25 via-amber-500/5 to-transparent",
    border: "border-amber-400/20",
    iconWrap: "bg-amber-500/15 text-amber-300 ring-amber-400/25",
  },
  {
    icon: Clock,
    title: "Replay 48h",
    description: "Revivez le spectacle pendant deux jours après la diffusion.",
    accent: "from-cyan-500/20 via-cyan-500/5 to-transparent",
    border: "border-cyan-400/20",
    iconWrap: "bg-cyan-500/15 text-cyan-300 ring-cyan-400/25",
    highlight: "48h",
  },
] as const;

export function StreamingSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      gsap.fromTo(
        ".stream-reveal",
        { y: 48, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.9,
          stagger: 0.12,
          ease: "power3.out",
          clearProps: "transform",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 78%",
            once: true,
          },
        },
      );
    },
    { scope: sectionRef },
  );

  return (
    <section
      ref={sectionRef}
      id="streaming"
      className="relative scroll-mt-28 overflow-hidden px-4 py-20 sm:px-6 sm:py-28"
    >
      <div className="relative mx-auto max-w-7xl">
        <div className="stream-reveal mb-12 max-w-2xl sm:mb-14">
          <div className="inline-flex items-center gap-2.5 rounded-full border border-violet-400/25 bg-violet-500/10 px-4 py-1.5 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
            </span>
            <span className="text-[10px] uppercase tracking-[0.35em] text-violet-200 sm:text-xs">
              Streaming live
            </span>
          </div>

          <h2 className="mt-6 font-[family-name:var(--font-anton)] text-3xl uppercase leading-[0.95] sm:text-4xl md:text-5xl">
            Suivez le spectacle{" "}
            <span className="bg-gradient-to-r from-violet-200 via-white to-cyan-200 bg-clip-text text-transparent">
              partout
            </span>
          </h2>

          <p className="mt-5 text-sm leading-relaxed text-white/55 sm:text-base">
            Accès HD en direct et replay 48h. Une expérience pensée pour les
            écrans, avec la même intensité que la salle.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="#billetterie"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-6 py-3 text-sm uppercase tracking-[0.2em] text-white backdrop-blur-sm transition hover:border-violet-300/40 hover:bg-violet-500/15"
            >
              <Radio className="h-4 w-4 text-violet-300" />
              Réserver l&apos;accès
            </Link>
            <p className="text-xs uppercase tracking-[0.25em] text-white/35">
              Billets streaming disponibles
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:gap-5 md:grid-cols-3">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;

            return (
              <article
                key={feature.title}
                className={`stream-reveal group relative overflow-hidden rounded-2xl border ${feature.border} bg-white/[0.04] p-6 shadow-none transition duration-300 hover:border-white/20 hover:bg-white/[0.07] sm:p-8`}
              >
                <div
                  className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${feature.accent} opacity-80 transition group-hover:opacity-100`}
                />
                <div className="relative">
                  {feature.highlight ? (
                    <span className="mb-4 block font-mono text-3xl tracking-tight text-white/90">
                      {feature.highlight}
                    </span>
                  ) : (
                    <div
                      className={`mb-4 inline-flex rounded-xl p-3 ring-1 ring-inset ${feature.iconWrap}`}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                  )}
                  <h3 className="text-lg font-medium text-white/95">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/55">
                    {feature.description}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
