"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { IvsPlayer } from "@/components/streaming/IvsPlayer";

type AdminStreamPreviewProps = {
  showLiveBadge?: boolean;
  className?: string;
  /** Bump to force a full remount / new token. */
  reloadKey?: number;
};

/**
 * Admin preview player: fetches short-lived authorized IVS URLs
 * (channel playback auth) and refreshes before expiry.
 */
export function AdminStreamPreview({
  showLiveBadge = false,
  className,
  reloadKey = 0,
}: AdminStreamPreviewProps) {
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let refreshTimer: number | null = null;

    async function loadPlayback() {
      try {
        const response = await fetch("/api/admin/streaming/playback", {
          cache: "no-store",
          credentials: "same-origin",
        });
        const data = await response.json();
        if (cancelled) return;

        if (!response.ok) {
          setError(data.error ?? "Preview indisponible");
          setPlaybackUrl(null);
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
          setError("Connexion au preview impossible");
          setPlaybackUrl(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    setLoading(true);
    setError(null);
    void loadPlayback();

    return () => {
      cancelled = true;
      if (refreshTimer) window.clearTimeout(refreshTimer);
    };
  }, [reloadKey]);

  if (loading && !playbackUrl) {
    return (
      <div className="flex h-full min-h-[200px] items-center justify-center gap-2 bg-zinc-950 text-zinc-400">
        <Loader2 className="h-5 w-5 animate-spin text-violet-400" />
        Préparation du preview sécurisé…
      </div>
    );
  }

  if (error && !playbackUrl) {
    return (
      <div className="flex h-full min-h-[200px] items-center justify-center bg-zinc-950 px-6 text-center text-sm text-red-300">
        {error}
      </div>
    );
  }

  if (!playbackUrl) return null;

  return (
    <IvsPlayer
      key={`${reloadKey}-${playbackUrl}`}
      playbackUrl={playbackUrl}
      title="Preview admin"
      showLiveBadge={showLiveBadge}
      className={className}
    />
  );
}
