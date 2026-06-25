"use client";

import { useEffect, useRef, useState } from "react";

type HeroVideoBackgroundProps = {
  src: string | null;
};

export function HeroVideoBackground({ src }: HeroVideoBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(!src);

  useEffect(() => {
    if (!src || !videoRef.current) return;

    setFailed(false);
    const video = videoRef.current;
    video.load();
    void video.play().catch(() => setFailed(true));
  }, [src]);

  return (
    <div className="absolute inset-0 z-0">
      {src && !failed ? (
        <video
          ref={videoRef}
          src={src}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover motion-reduce:hidden"
          aria-hidden
        />
      ) : null}
      <div
        className={`absolute inset-0 ${failed || !src ? "bg-[#050505]" : "bg-black/65"} motion-reduce:bg-[#050505]`}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-[#050505]" />
    </div>
  );
}
