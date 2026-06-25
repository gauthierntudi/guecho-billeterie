"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";
import { LOGO_SRC } from "@/components/brand/Logo";

type LandingLoaderProps = {
  ready: boolean;
  onExitComplete: () => void;
};

const LOADER_BACKGROUNDS = [
  "#0d1b4d",
  "#1e3a8a",
  "#312e81",
  "#4a1942",
  "#0f4c5c",
  "#1a3c34",
  "#7c2d12",
  "#831843",
  "#134e4a",
  "#1d4ed8",
  "#5b21b6",
  "#9d174d",
] as const;

const RING_SIZE = 200;
const STROKE = 20;
const RADIUS = (RING_SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type Rgb = { r: number; g: number; b: number };
type Hsl = { h: number; s: number; l: number };

type HarmoniousPalette = {
  ringStroke: (percent: number) => string;
  textColor: (percent: number) => string;
};

function hexToRgb(hex: string): Rgb {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  if (delta !== 0) {
    switch (max) {
      case rn:
        h = ((gn - bn) / delta + (gn < bn ? 6 : 0)) * 60;
        break;
      case gn:
        h = ((bn - rn) / delta + 2) * 60;
        break;
      default:
        h = ((rn - gn) / delta + 4) * 60;
    }
  }

  return {
    h: Math.round(h),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

function createHarmoniousPalette(background: string): HarmoniousPalette {
  const hsl = rgbToHsl(hexToRgb(background));

  return {
    ringStroke(percent: number) {
      const progress = percent / 100;
      const saturation = Math.round(
        Math.min(96, hsl.s * (0.35 + progress * 0.85) + 8),
      );
      const lightness = Math.round(58 + progress * 36);
      const alpha = Math.round((0.12 + progress * 0.88) * 100) / 100;

      return `hsla(${hsl.h}, ${saturation}%, ${lightness}%, ${alpha})`;
    },
    textColor(percent: number) {
      const progress = percent / 100;
      const lightness = Math.round(72 + progress * 22);
      const saturation = Math.round(
        Math.min(88, hsl.s * (0.25 + progress * 0.55) + 6),
      );
      const alpha = Math.round((0.38 + progress * 0.62) * 100) / 100;

      return `hsla(${hsl.h}, ${saturation}%, ${lightness}%, ${alpha})`;
    },
  };
}

function applyRingProgress(
  ring: SVGCircleElement,
  percent: number,
  palette: HarmoniousPalette,
) {
  const offset = CIRCUMFERENCE - (percent / 100) * CIRCUMFERENCE;
  ring.style.strokeDasharray = `${CIRCUMFERENCE}`;
  ring.style.strokeDashoffset = `${offset}`;
  ring.style.stroke = palette.ringStroke(percent);
}

function pickBackground() {
  const index = Math.floor(Math.random() * LOADER_BACKGROUNDS.length);
  return LOADER_BACKGROUNDS[index]!;
}

function pickExitDirection() {
  return Math.random() < 0.5 ? "up" : "down";
}

type LoaderTheme = {
  backgroundColor: string;
  exitDirection: "up" | "down";
};

export function LandingLoader({ ready, onExitComplete }: LandingLoaderProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);
  const percentRef = useRef<HTMLParagraphElement>(null);
  const exitingRef = useRef(false);
  const progressRef = useRef({ value: 0 });

  const [theme, setTheme] = useState<LoaderTheme | null>(null);
  const palette = useMemo(
    () => (theme ? createHarmoniousPalette(theme.backgroundColor) : null),
    [theme],
  );
  const paletteRef = useRef(palette);
  paletteRef.current = palette;

  const [displayPercent, setDisplayPercent] = useState(0);

  useLayoutEffect(() => {
    setTheme({
      backgroundColor: pickBackground(),
      exitDirection: pickExitDirection(),
    });
  }, []);

  useEffect(() => {
    const ring = ringRef.current;
    const percent = percentRef.current;
    if (!ring || !percent || !paletteRef.current) return;

    applyRingProgress(ring, 0, paletteRef.current);

    const tween = gsap.to(progressRef.current, {
      value: 92,
      duration: 2.2,
      ease: "power1.inOut",
      onUpdate: () => {
        const v = Math.round(progressRef.current.value);
        if (!paletteRef.current) return;
        applyRingProgress(ring, v, paletteRef.current);
        setDisplayPercent(v);
      },
    });

    return () => {
      tween.kill();
    };
  }, [theme]);

  useEffect(() => {
    if (!ready || exitingRef.current || !theme) return;

    const root = rootRef.current;
    const ring = ringRef.current;
    if (!root || !ring) return;

    exitingRef.current = true;
    gsap.killTweensOf(progressRef.current);

    gsap.to(progressRef.current, {
      value: 100,
      duration: 0.4,
      ease: "power2.out",
      onUpdate: () => {
        const v = Math.round(progressRef.current.value);
        if (!paletteRef.current) return;
        applyRingProgress(ring, v, paletteRef.current);
        setDisplayPercent(v);
      },
      onComplete: () => {
        gsap.to(root, {
          yPercent: theme.exitDirection === "up" ? -100 : 100,
          duration: 0.85,
          ease: "power4.inOut",
          onComplete: onExitComplete,
        });
      },
    });
  }, [onExitComplete, ready, theme]);

  if (!theme || !palette) {
    return (
      <div
        className="loader-root fixed inset-0 z-[100] bg-[#050505]"
        aria-busy
        aria-live="polite"
      />
    );
  }

  const { backgroundColor } = theme;

  return (
    <div
      ref={rootRef}
      className="loader-root fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
      style={{ backgroundColor, color: palette.textColor(displayPercent) }}
      aria-hidden={ready}
      aria-live="polite"
      aria-busy={!ready}
    >
      <div className="loader-panel flex flex-col items-center">
        <div
          className="relative flex items-center justify-center"
          style={{ width: RING_SIZE, height: RING_SIZE }}
        >
          <svg
            width={RING_SIZE}
            height={RING_SIZE}
            className="-rotate-90"
            aria-hidden
          >
            <circle
              ref={ringRef}
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={palette.ringStroke(0)}
              strokeWidth={STROKE}
              strokeLinecap="round"
              style={{
                strokeDasharray: CIRCUMFERENCE,
                strokeDashoffset: CIRCUMFERENCE,
              }}
            />
          </svg>

          <div className="absolute inset-0 flex items-center justify-center px-5">
            <Image
              src={LOGO_SRC}
              alt="Guecho"
              width={110}
              height={44}
              className="h-9 w-auto object-contain md:h-10"
              priority
            />
          </div>
        </div>

        <p
          ref={percentRef}
          className="mt-8 font-[family-name:var(--font-anton)] text-5xl leading-none tracking-tight md:text-6xl"
          style={{ color: palette.textColor(displayPercent) }}
        >
          {displayPercent}%
        </p>
      </div>
    </div>
  );
}
