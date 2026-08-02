"use client";

import { useState } from "react";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { StreamingGate } from "@/components/streaming/StreamingGate";
import { StreamingVideoBackground } from "@/components/streaming/StreamingVideoBackground";
import { cn } from "@/lib/utils";

type StreamStatus = {
  isLive: boolean;
  title: string | null;
  eventTitle: string;
  eventSlug: string;
  hasChannel: boolean;
};

type StreamingExperienceProps = {
  initialStatus?: StreamStatus | null;
  heroVideoUrl?: string | null;
};

export function StreamingExperience({
  initialStatus = null,
  heroVideoUrl = null,
}: StreamingExperienceProps) {
  const [playerActive, setPlayerActive] = useState(false);

  return (
    <>
      {playerActive ? null : (
        <StreamingVideoBackground videoUrl={heroVideoUrl} />
      )}

      <div className="relative z-10">
        {!playerActive ? <SiteHeader /> : null}

        <section
          className={cn(
            playerActive
              ? "fixed inset-0 z-30 bg-black"
              : "mx-auto max-w-5xl px-4 pb-20 pt-28 sm:px-6 sm:pt-32",
          )}
        >
          <StreamingGate
            initialStatus={initialStatus}
            onPlaybackActive={setPlayerActive}
          />
        </section>

        {!playerActive ? <SiteFooter bareBackground /> : null}
      </div>
    </>
  );
}
