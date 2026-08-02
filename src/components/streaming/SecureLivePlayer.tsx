"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { IvsPlayer } from "@/components/streaming/IvsPlayer";

type SecureLivePlayerProps = {
  title?: string | null;
  className?: string;
  onSessionLost?: (message: string) => void;
  onExit?: () => void;
};

/**
 * Fetches short-lived playback URLs from /api/streaming/playback
 * (cookie + session gated) and refreshes them before expiry.
 */
export function SecureLivePlayer({
  title,
  className,
  onSessionLost,
  onExit,
}: SecureLivePlayerProps) {
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const onSessionLostRef = useRef(onSessionLost);
  onSessionLostRef.current = onSessionLost;

  useEffect(() => {
    let cancelled = false;
    let refreshTimer: number | null = null;

    async function loadPlayback() {
      try {
        const response = await fetch("/api/streaming/playback", {
          cache: "no-store",
          credentials: "same-origin",
        });
        const data = await response.json();
        if (cancelled) return;

        if (!response.ok) {
          setError(data.error ?? "Flux indisponible");
          setPlaybackUrl(null);
          onSessionLostRef.current?.(data.error ?? "Session expirée");
          return;
        }

        setPlaybackUrl(data.playbackUrl);
        setError(null);

        const expiresIn = Number(data.expiresIn ?? 120);
        const refreshInMs = Math.max(20, expiresIn - 30) * 1000;
        if (refreshTimer) window.clearTimeout(refreshTimer);
        refreshTimer = window.setTimeout(() => {
          void loadPlayback();
        }, refreshInMs);
      } catch {
        if (!cancelled) {
          setError("Connexion au flux impossible");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadPlayback();

    return () => {
      cancelled = true;
      if (refreshTimer) window.clearTimeout(refreshTimer);
    };
  }, []);

  if (loading && !playbackUrl) {
    return (
      <div className="flex h-full min-h-[200px] items-center justify-center gap-2 bg-black text-white/50">
        <Loader2 className="h-5 w-5 animate-spin text-amber-300" />
        Préparation du flux sécurisé…
      </div>
    );
  }

  if (error && !playbackUrl) {
    return (
      <div className="flex h-full min-h-[200px] items-center justify-center bg-black px-6 text-center text-sm text-red-300">
        {error}
      </div>
    );
  }

  if (!playbackUrl) return null;

  return (
    <IvsPlayer
      key={playbackUrl}
      playbackUrl={playbackUrl}
      title={title ?? undefined}
      className={className}
      onExit={onExit}
      exitLabel="Changer d'accès"
    />
  );
}
