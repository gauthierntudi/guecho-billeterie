"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CreativeEventTitle } from "@/components/brand/CreativeEventTitle";
import { EventMetaStrip } from "@/components/landing/EventMetaStrip";
import { WaterHoverMedia } from "@/components/landing/WaterHoverMedia";
import { DEFAULT_EVENT_SLUG } from "@/lib/site-config";

gsap.registerPlugin(useGSAP);

type Slide =
  | {
      id: string;
      type: "video";
      showHero: true;
      eyebrow: string;
      subtitle: string;
    }
  | {
      id: string;
      type: "image";
      image: string;
      eyebrow: string;
      title: string;
      subtitle: string;
    };

const SLIDES: Slide[] = [
  {
    id: "video",
    type: "video",
    showHero: true,
    eyebrow: "Événement exclusif",
    subtitle:
      "Guelord Ingange, dit Guecho — Rocambole, l'aventure scénique qui fait rire Kinshasa.",
  },
  {
    id: "s0",
    type: "image",
    image: "/img/s0.jpg",
    eyebrow: "Artiste & comédien",
    title: "Guelord Ingange",
    subtitle:
      "Sous le pseudonyme Guecho, il fait rire Kinshasa avec un humour ancré dans le quotidien congolais et la tradition du maboke.",
  },
  {
    id: "s1",
    type: "image",
    image: "/img/s1.jpg",
    eyebrow: "Voix du 7ᵉ art",
    title: "Président du consortium",
    subtitle:
      "À la tête du consortium des artistes et culturels du Congo, il défend la dignité et la juste rémunération des créateurs.",
  },
  {
    id: "s2",
    type: "image",
    image: "/img/s2.jpg",
    eyebrow: "Engagement citoyen",
    title: "Droits d'auteur",
    subtitle:
      "En octobre 2024, il a mené les comédiens congolais au CSAC pour dénoncer l'exploitation abusive de leurs œuvres par Maboke TV.",
  },
  {
    id: "s3",
    type: "image",
    image: "/img/s3.jpg",
    eyebrow: "Culture congolaise",
    title: "L'univers Maboke",
    subtitle:
      "Du sketch en lingala au théâtre populaire : un héritage de rire, de critique sociale et d'expression populaire.",
  },
  {
    id: "s4",
    type: "image",
    image: "/img/s4.jpg",
    eyebrow: "Spectacle inédit",
    title: "Rocambole",
    subtitle:
      "Une aventure scénique pleine de rebondissements — entre stand-up, personnages et surprises — signée Guecho.",
  },
  {
    id: "s5",
    type: "image",
    image: "/img/s5.jpg",
    eyebrow: "Rendez-vous",
    title: "Kinshasa rit",
    subtitle:
      "Une soirée exceptionnelle au Musée National RDC — en salle ou en streaming — pour vivre l'expérience Guecho Rocambole.",
  },
];

const LOOP_OFFSET = 1;

const LOOP_SLIDES: Slide[] = [
  { ...SLIDES[SLIDES.length - 1]!, id: `${SLIDES[SLIDES.length - 1]!.id}-loop-head` },
  ...SLIDES,
  { ...SLIDES[0]!, id: `${SLIDES[0]!.id}-loop-tail` },
];

type CreativeSkewSliderProps = {
  heroVideoUrl: string | null;
  onReady?: () => void;
};

function domToLogicalIndex(domIndex: number) {
  if (domIndex <= 0) return SLIDES.length - 1;
  if (domIndex >= LOOP_SLIDES.length - 1) return 0;
  return domIndex - LOOP_OFFSET;
}

function animateSlideContent(slide: HTMLElement | null) {
  if (!slide) return;

  const items = slide.querySelectorAll(".slide-eyebrow, .slide-title, .slide-sub");
  gsap.fromTo(
    items,
    { y: 48, opacity: 0 },
    {
      y: 0,
      opacity: 1,
      duration: 0.85,
      stagger: 0.08,
      ease: "power3.out",
      clearProps: "transform",
    },
  );
}

export function CreativeSkewSlider({
  heroVideoUrl,
  onReady,
}: CreativeSkewSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const slidesRef = useRef<(HTMLElement | null)[]>([]);
  const mediaLayersRef = useRef<(HTMLElement | null)[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const isJumpingRef = useRef(false);
  const jumpCooldownRef = useRef(false);
  const scrollEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRef = useRef(false);
  const updateTransformsRef = useRef<() => void>(() => {});

  const [active, setActive] = useState(0);
  const [scrollReady, setScrollReady] = useState(false);

  const getViewport = useCallback(() => {
    return scrollRef.current?.clientHeight || window.innerHeight;
  }, []);

  const stabilizeMediaLayer = useCallback((domIndex: number) => {
    mediaLayersRef.current.forEach((layer, index) => {
      if (!layer) return;

      if (index === domIndex) {
        layer.style.opacity = "1";
        layer.style.transform = "none";
        layer.style.pointerEvents = "auto";
      } else {
        layer.style.opacity = "0";
        layer.style.transform = "none";
        layer.style.pointerEvents = "none";
      }
    });
  }, []);

  const performLoopJump = useCallback(
    (targetDom: number, logical: number) => {
      if (jumpCooldownRef.current || isJumpingRef.current) return;

      const scroller = scrollRef.current;
      if (!scroller) return;

      jumpCooldownRef.current = true;
      isJumpingRef.current = true;

      const previousSnap = scroller.style.scrollSnapType;
      const previousBehavior = scroller.style.scrollBehavior;

      scroller.style.scrollSnapType = "none";
      scroller.style.scrollBehavior = "auto";
      scroller.scrollTop = targetDom * getViewport();

      activeRef.current = logical;
      setActive(logical);
      stabilizeMediaLayer(targetDom);
      animateSlideContent(slidesRef.current[targetDom]);

      window.setTimeout(() => {
        scroller.style.scrollSnapType = previousSnap;
        scroller.style.scrollBehavior = previousBehavior;
        isJumpingRef.current = false;
        jumpCooldownRef.current = false;
        updateTransformsRef.current();
      }, 420);
    },
    [getViewport, stabilizeMediaLayer],
  );

  const checkLoopBoundary = useCallback(() => {
    const scroller = scrollRef.current;
    if (!scroller || isJumpingRef.current || jumpCooldownRef.current) return;

    const viewport = getViewport();
    const domIndex = Math.round(scroller.scrollTop / viewport);

    if (domIndex >= LOOP_SLIDES.length - 1) {
      performLoopJump(LOOP_OFFSET, 0);
      return;
    }

    if (domIndex <= 0) {
      performLoopJump(SLIDES.length, SLIDES.length - 1);
    }
  }, [getViewport, performLoopJump]);

  const getDomProgress = useCallback(() => {
    const scroller = scrollRef.current;
    if (!scroller) return LOOP_OFFSET;

    const viewport = getViewport();
    return scroller.scrollTop / viewport;
  }, [getViewport]);

  const updateProgressBar = useCallback((domProgress: number) => {
    if (!progressRef.current) return;

    const span = SLIDES.length;
    let linear = domProgress - LOOP_OFFSET;

    if (linear >= span - 0.05) {
      const wrap = linear - (span - 1);
      linear = wrap;
    } else if (linear <= 0.05) {
      linear = span - 1 + linear;
    }

    const ratio = Math.min(1, Math.max(0, linear / Math.max(span - 1, 1)));
    progressRef.current.style.width = `${ratio * 100}%`;
  }, []);

  const updateTransforms = useCallback(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;

    if (!initializedRef.current) {
      mediaLayersRef.current.forEach((layer) => {
        if (!layer) return;
        layer.style.opacity = "0";
        layer.style.pointerEvents = "none";
        layer.style.transform = "none";
      });
      return;
    }

    const viewport = getViewport();
    const domProgress = scroller.scrollTop / viewport;

    mediaLayersRef.current.forEach((layer, index) => {
      if (!layer) return;

      const local = domProgress - index;
      const distance = Math.abs(local);

      if (distance > 1.15) {
        layer.style.opacity = "0";
        layer.style.pointerEvents = "none";
        layer.style.transform = "none";
        return;
      }

      if (isJumpingRef.current || jumpCooldownRef.current) {
        return;
      }

      layer.style.pointerEvents = distance < 0.35 ? "auto" : "none";
      layer.style.opacity = String(Math.max(0, 1 - distance * 0.92));
      layer.style.transform = `skewX(${local * 5}deg) scale(${1 + distance * 0.06}) translateY(${local * -24}px)`;
    });

    updateProgressBar(domProgress);
  }, [getViewport, updateProgressBar]);

  updateTransformsRef.current = updateTransforms;

  const resolveDomIndex = useCallback(
    (logicalIndex: number, fromLogical = activeRef.current) => {
      const normalized =
        ((logicalIndex % SLIDES.length) + SLIDES.length) % SLIDES.length;

      const goingForward =
        normalized !== fromLogical &&
        (logicalIndex > fromLogical ||
          (fromLogical === SLIDES.length - 1 && normalized === 0));

      const goingBackward =
        normalized !== fromLogical &&
        (logicalIndex < fromLogical ||
          (fromLogical === 0 && normalized === SLIDES.length - 1));

      if (goingForward && fromLogical === SLIDES.length - 1) {
        return LOOP_SLIDES.length - 1;
      }

      if (goingBackward && fromLogical === 0) {
        return 0;
      }

      return normalized + LOOP_OFFSET;
    },
    [],
  );

  const syncActiveSlide = useCallback(() => {
    const scroller = scrollRef.current;
    if (!scroller || isJumpingRef.current || jumpCooldownRef.current) return;

    const domIndex = Math.round(getDomProgress());

    if (domIndex <= 0 || domIndex >= LOOP_SLIDES.length - 1) {
      return;
    }

    const next = domToLogicalIndex(domIndex);
    if (next === activeRef.current) return;

    activeRef.current = next;
    setActive(next);
    animateSlideContent(slidesRef.current[domIndex]);
  }, [getDomProgress]);

  const scrollToLogicalIndex = useCallback(
    (logicalIndex: number) => {
      const scroller = scrollRef.current;
      if (!scroller) return;

      const domIndex = resolveDomIndex(logicalIndex);
      const viewport = getViewport();

      scroller.scrollTo({
        top: domIndex * viewport,
        behavior: "smooth",
      });
    },
    [getViewport, resolveDomIndex],
  );

  const next = useCallback(
    () => scrollToLogicalIndex(activeRef.current + 1),
    [scrollToLogicalIndex],
  );
  const prev = useCallback(
    () => scrollToLogicalIndex(activeRef.current - 1),
    [scrollToLogicalIndex],
  );

  useGSAP(
    () => {
      gsap.fromTo(
        ".slider-ui",
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, delay: 0.4, ease: "power3.out" },
      );

      animateSlideContent(slidesRef.current[LOOP_OFFSET]);
      updateTransforms();
    },
    { scope: containerRef },
  );

  useLayoutEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller || initializedRef.current) return;

    const viewport = getViewport();
    const previousSnap = scroller.style.scrollSnapType;
    const previousBehavior = scroller.style.scrollBehavior;

    scroller.style.scrollSnapType = "none";
    scroller.style.scrollBehavior = "auto";
    scroller.scrollTop = LOOP_OFFSET * viewport;
    scroller.style.scrollSnapType = previousSnap || "";
    scroller.style.scrollBehavior = previousBehavior || "";

    initializedRef.current = true;
    stabilizeMediaLayer(LOOP_OFFSET);
    updateTransforms();
    setScrollReady(true);
    onReady?.();
  }, [getViewport, onReady, stabilizeMediaLayer, updateTransforms]);

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;

    const onScroll = () => {
      if (rafRef.current !== null || isJumpingRef.current) return;

      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        updateTransforms();
        syncActiveSlide();
      });

      if (scrollEndTimerRef.current) {
        clearTimeout(scrollEndTimerRef.current);
      }

      scrollEndTimerRef.current = setTimeout(() => {
        checkLoopBoundary();
      }, 140);
    };

    const onScrollEnd = () => {
      checkLoopBoundary();
    };

    scroller.addEventListener("scroll", onScroll, { passive: true });
    scroller.addEventListener("scrollend", onScrollEnd);
    window.addEventListener("resize", updateTransforms);

    return () => {
      scroller.removeEventListener("scroll", onScroll);
      scroller.removeEventListener("scrollend", onScrollEnd);
      window.removeEventListener("resize", updateTransforms);
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
      if (scrollEndTimerRef.current) {
        clearTimeout(scrollEndTimerRef.current);
      }
    };
  }, [checkLoopBoundary, syncActiveSlide, updateTransforms]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        next();
      }
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        prev();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !heroVideoUrl) return;

    if (active === 0) {
      video.load();
      void video.play().catch(() => {});
      return;
    }

    video.pause();
  }, [active, heroVideoUrl]);

  const displayIndex = active + 1;

  return (
    <div
      ref={containerRef}
      className={`relative h-dvh w-full overflow-hidden bg-[#050505] text-white transition-opacity duration-300 ${scrollReady ? "opacity-100" : "opacity-0"}`}
    >
      <div
        ref={scrollRef}
        className="h-dvh w-full snap-y snap-mandatory overflow-x-hidden overflow-y-scroll overscroll-none scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {LOOP_SLIDES.map((item, index) => {
          const logicalIndex = domToLogicalIndex(index);
          const isPrimaryVideo = item.type === "video" && item.id === "video";

          return (
            <section
              key={item.id}
              ref={(el) => {
                slidesRef.current[index] = el;
              }}
              className="relative h-dvh w-full max-w-full snap-start snap-always"
              aria-hidden={logicalIndex !== active}
            >
              <div className="slide-panel absolute inset-0 overflow-hidden">
                <div
                  ref={(el) => {
                    mediaLayersRef.current[index] = el;
                  }}
                  className="slide-media-layer absolute inset-0 z-[1] origin-center will-change-transform"
                >
                  {item.type === "video" && !heroVideoUrl ? (
                    <div className="absolute inset-0 z-[1] bg-gradient-to-br from-[#050505] via-[#1a1208] to-[#050505]" />
                  ) : (
                    <WaterHoverMedia
                      variant={item.type === "video" ? "video" : "image"}
                      src={
                        item.type === "image"
                          ? item.image
                          : (heroVideoUrl ?? "")
                      }
                      videoRef={isPrimaryVideo ? videoRef : undefined}
                      autoPlayVideo={isPrimaryVideo}
                      isActive={logicalIndex === active}
                    />
                  )}
                </div>

                <div className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-b from-black/25 via-black/40 to-black/80" />

                {(item.type === "video" && item.showHero) ||
                (item.type === "image" && item.title) ? (
                  <div className="pointer-events-none relative z-[3] flex h-full items-end px-6 pb-32 md:items-center md:pb-0 md:pl-16 lg:pl-24">
                    <div className="relative max-w-4xl">
                      <p className="slide-eyebrow mb-4 text-xs uppercase tracking-[0.45em] text-amber-300/90 md:text-sm">
                        {item.eyebrow}
                      </p>
                      {item.type === "video" ? (
                        <CreativeEventTitle
                          title="Guecho Rocambole"
                          size="slide"
                          className="slide-title"
                        />
                      ) : (
                        <h2 className="slide-title font-[family-name:var(--font-anton)] text-4xl uppercase leading-[0.95] text-white md:text-6xl lg:text-7xl">
                          {item.title}
                        </h2>
                      )}
                      <p className="slide-sub mt-6 max-w-lg text-base text-white/85 md:text-lg">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>

      <div className="slider-ui pointer-events-none absolute inset-0 z-20">
        <EventMetaStrip />

        <div className="pointer-events-auto absolute inset-x-0 bottom-0 px-6 pb-8 md:px-16 md:pb-10 lg:pl-24">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 md:gap-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="mb-3 text-[10px] uppercase tracking-[0.35em] text-white/40">
                  Prêt pour l&apos;expérience ?
                </p>
                <Link
                  href={`/evenement/${DEFAULT_EVENT_SLUG}#billetterie`}
                  className="inline-flex items-center justify-center rounded-full bg-white px-8 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-white/90 md:px-10 md:py-5 md:text-base"
                >
                  Acheter Mon Billet
                </Link>
              </div>

              <div className="hidden items-center gap-6 md:flex">
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={prev}
                    className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-white/50 transition hover:text-white"
                    aria-label="Slide précédent"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Prev
                  </button>
                  <button
                    type="button"
                    onClick={next}
                    className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-white/50 transition hover:text-white"
                    aria-label="Slide suivant"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <p className="font-mono text-sm text-white/60">
                  <span className="text-white">
                    {String(displayIndex).padStart(2, "0")}
                  </span>
                  <span className="mx-1 text-white/30">/</span>
                  <span>{String(SLIDES.length).padStart(2, "0")}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 hidden h-[2px] w-full bg-white/10 md:block">
          <div
            ref={progressRef}
            className="h-full bg-amber-400 will-change-[width]"
          />
        </div>
      </div>
    </div>
  );
}
