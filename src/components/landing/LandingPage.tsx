"use client";

import { useCallback, useEffect, useState } from "react";
import { useSiteLoaderReady } from "@/contexts/SiteLoaderContext";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { CreativeSkewSlider } from "@/components/landing/CreativeSkewSlider";
import { DEFAULT_EVENT_SLUG } from "@/lib/site-config";

const PRELOAD_IMAGES = [
  "/img/s0.jpg",
  "/img/s1.jpg",
  "/img/s2.jpg",
  "/img/s3.jpg",
  "/img/s4.jpg",
  "/img/s5.jpg",
];

type LandingPageProps = {
  /** URL publique optionnelle ; sinon chargée via /api/media/hero-video */
  heroVideoUrl?: string | null;
};

function preloadImage(src: string) {
  return new Promise<void>((resolve) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = src;
  });
}

function preloadVideo(src: string) {
  return new Promise<void>((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => resolve();
    video.onerror = () => resolve();
    video.src = src;
  });
}

export function LandingPage({ heroVideoUrl: initialHeroVideoUrl = null }: LandingPageProps) {
  const [heroVideoUrl, setHeroVideoUrl] = useState<string | null>(
    initialHeroVideoUrl,
  );
  const [assetsReady, setAssetsReady] = useState(false);
  const [sliderReady, setSliderReady] = useState(false);

  useSiteLoaderReady(assetsReady && sliderReady);

  useEffect(() => {
    if (initialHeroVideoUrl) return;

    let cancelled = false;

    void fetch("/api/media/hero-video", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { url?: string | null } | null) => {
        if (!cancelled && data?.url) {
          setHeroVideoUrl(data.url);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [initialHeroVideoUrl]);

  useEffect(() => {
    let cancelled = false;

    const tasks = PRELOAD_IMAGES.map(preloadImage);
    if (heroVideoUrl) {
      tasks.push(preloadVideo(heroVideoUrl));
    }

    void Promise.all(tasks).then(() => {
      if (!cancelled) {
        setAssetsReady(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [heroVideoUrl]);

  const handleSliderReady = useCallback(() => {
    setSliderReady(true);
  }, []);

  return (
    <div className="overflow-x-hidden bg-[#050505] text-white">
      <SiteHeader ticketHref={`/evenement/${DEFAULT_EVENT_SLUG}#billetterie`} />
      <CreativeSkewSlider
        heroVideoUrl={heroVideoUrl}
        onReady={handleSliderReady}
      />
      <SiteFooter />
    </div>
  );
}
