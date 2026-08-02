"use client";

import { useEffect, useState } from "react";

type StreamingVideoBackgroundProps = {
  /** Prefetched public/signed URL from the server */
  videoUrl?: string | null;
  /** When true, hide the looping cover (live player is on). */
  hidden?: boolean;
};

/**
 * Full-bleed muted loop of video-cover.mp4 behind the streaming gate,
 * until the live player takes over.
 */
export function StreamingVideoBackground({
  videoUrl: initialUrl = null,
  hidden = false,
}: StreamingVideoBackgroundProps) {
  const [videoUrl, setVideoUrl] = useState<string | null>(initialUrl);

  useEffect(() => {
    if (initialUrl || hidden) return;

    let cancelled = false;
    void fetch("/api/media/hero-video", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { url?: string | null } | null) => {
        if (!cancelled && data?.url) setVideoUrl(data.url);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [initialUrl, hidden]);

  if (hidden) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
      {videoUrl ? (
        <video
          key={videoUrl}
          className="absolute inset-0 h-full w-full object-cover object-center"
          src={videoUrl}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        />
      ) : (
        <div className="absolute inset-0 bg-[#050505]" />
      )}
      <div className="absolute inset-0 bg-black/55" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/40" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_rgba(0,0,0,0.55)_70%)]" />
    </div>
  );
}
