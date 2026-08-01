"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type {
  MediaPlayer,
  PlayerError,
  Quality,
} from "amazon-ivs-player";
import {
  Loader2,
  Maximize,
  Minimize,
  Pause,
  Play,
  Radio,
  RefreshCw,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import { cn } from "@/lib/utils";

type IvsPlayerProps = {
  playbackUrl: string;
  className?: string;
  title?: string;
  autoPlay?: boolean;
  muted?: boolean;
  showLiveBadge?: boolean;
};

type PlayerUiState = "loading" | "ready" | "playing" | "paused" | "buffering" | "ended" | "error";

function formatLatency(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return `${seconds.toFixed(1)}s`;
}

function qualityLabel(quality: Quality) {
  if (quality.height > 0) return `${quality.height}p`;
  if (quality.name) return quality.name;
  return `${Math.round(quality.bitrate / 1000)} kbps`;
}

export function IvsPlayer({
  playbackUrl,
  className,
  title,
  autoPlay = true,
  muted: initialMuted = false,
  showLiveBadge = true,
}: IvsPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<MediaPlayer | null>(null);
  const hideTimerRef = useRef<number | null>(null);

  const [uiState, setUiState] = useState<PlayerUiState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(initialMuted);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [latency, setLatency] = useState<number | null>(null);
  const [qualities, setQualities] = useState<Quality[]>([]);
  const [currentQuality, setCurrentQuality] = useState<Quality | null>(null);
  const [autoQuality, setAutoQuality] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const scheduleHideControls = useCallback(() => {
    clearHideTimer();
    hideTimerRef.current = window.setTimeout(() => {
      setControlsVisible(false);
    }, 2800);
  }, [clearHideTimer]);

  const revealControls = useCallback(() => {
    setControlsVisible(true);
    if (uiState === "playing") {
      scheduleHideControls();
    }
  }, [scheduleHideControls, uiState]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playbackUrl) return;

    let player: MediaPlayer | null = null;
    let cancelled = false;
    let latencyTimer: number | null = null;

    async function setup() {
      setUiState("loading");
      setError(null);
      setQualities([]);
      setCurrentQuality(null);
      setLatency(null);

      try {
        const IVS = await import("amazon-ivs-player");
        if (cancelled || !videoRef.current) return;

        if (!IVS.isPlayerSupported) {
          setError("Votre navigateur ne supporte pas le lecteur IVS");
          setUiState("error");
          return;
        }

        player = IVS.create({
          wasmWorker: "/ivs/amazon-ivs-wasmworker.min.js",
          wasmBinary: "/ivs/amazon-ivs-wasmworker.min.wasm",
        });
        playerRef.current = player;

        player.setAutoplay(autoPlay);
        player.setMuted(initialMuted);
        player.setVolume(1);
        player.setLiveLowLatencyEnabled(true);
        player.setRebufferToLive(true);
        player.setAutoQualityMode(true);

        player.addEventListener(IVS.PlayerState.READY, () => {
          if (cancelled) return;
          setUiState("ready");
          setQualities(player?.getQualities() ?? []);
          setCurrentQuality(player?.getQuality() ?? null);
          setAutoQuality(player?.isAutoQualityMode() ?? true);
        });

        player.addEventListener(IVS.PlayerState.BUFFERING, () => {
          if (!cancelled) setUiState("buffering");
        });

        player.addEventListener(IVS.PlayerState.PLAYING, () => {
          if (cancelled) return;
          setUiState("playing");
          setError(null);
          scheduleHideControls();
        });

        player.addEventListener(IVS.PlayerState.IDLE, () => {
          if (!cancelled) setUiState("paused");
        });

        player.addEventListener(IVS.PlayerState.ENDED, () => {
          if (!cancelled) setUiState("ended");
        });

        player.addEventListener(IVS.PlayerEventType.ERROR, (err: PlayerError) => {
          if (cancelled) return;
          setError(err?.message ?? "Erreur de lecture du flux");
          setUiState("error");
        });

        player.addEventListener(IVS.PlayerEventType.QUALITY_CHANGED, (quality) => {
          if (!cancelled) setCurrentQuality(quality);
        });

        player.addEventListener(IVS.PlayerEventType.MUTED_CHANGED, () => {
          if (!cancelled) setMuted(Boolean(player?.isMuted()));
        });

        player.addEventListener(IVS.PlayerEventType.VOLUME_CHANGED, (value) => {
          if (!cancelled) setVolume(value);
        });

        player.attachHTMLVideoElement(videoRef.current);
        player.load(playbackUrl);
        if (autoPlay) {
          player.play();
        }

        latencyTimer = window.setInterval(() => {
          if (!player || cancelled) return;
          setLatency(player.getLiveLatency());
          if (player.getState() === IVS.PlayerState.PLAYING) {
            setQualities(player.getQualities());
          }
        }, 1500);
      } catch {
        if (cancelled || !videoRef.current) return;
        videoRef.current.src = playbackUrl;
        void videoRef.current.play().then(
          () => setUiState("playing"),
          () => {
            setError("Impossible de démarrer la lecture");
            setUiState("error");
          },
        );
      }
    }

    void setup();

    return () => {
      cancelled = true;
      if (latencyTimer) window.clearInterval(latencyTimer);
      clearHideTimer();
      try {
        player?.delete();
      } catch {
        // ignore
      }
      playerRef.current = null;
    };
  }, [
    playbackUrl,
    reloadToken,
    autoPlay,
    initialMuted,
    scheduleHideControls,
    clearHideTimer,
  ]);

  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  function togglePlay() {
    const player = playerRef.current;
    if (!player) return;
    if (player.isPaused() || uiState === "paused" || uiState === "ended") {
      player.play();
    } else {
      player.pause();
      setControlsVisible(true);
      clearHideTimer();
    }
  }

  function toggleMute() {
    const player = playerRef.current;
    if (!player) return;
    const next = !player.isMuted();
    player.setMuted(next);
    setMuted(next);
    if (!next && player.getVolume() === 0) {
      player.setVolume(0.8);
      setVolume(0.8);
    }
  }

  function handleVolumeChange(value: number) {
    const player = playerRef.current;
    if (!player) return;
    player.setVolume(value);
    setVolume(value);
    if (value === 0) {
      player.setMuted(true);
      setMuted(true);
    } else if (player.isMuted()) {
      player.setMuted(false);
      setMuted(false);
    }
  }

  async function toggleFullscreen() {
    const node = containerRef.current;
    if (!node) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await node.requestFullscreen();
    }
  }

  function handleQualityChange(value: string) {
    const player = playerRef.current;
    if (!player) return;

    if (value === "auto") {
      player.setAutoQualityMode(true);
      setAutoQuality(true);
      return;
    }

    const selected = qualities.find(
      (quality) => `${quality.height}-${quality.bitrate}` === value,
    );
    if (!selected) return;
    player.setAutoQualityMode(false);
    player.setQuality(selected);
    setAutoQuality(false);
    setCurrentQuality(selected);
  }

  function handleRetry() {
    setReloadToken((token) => token + 1);
  }

  function handlePointerMove(_event: ReactPointerEvent<HTMLDivElement>) {
    revealControls();
  }

  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  const showOverlaySpinner = uiState === "loading" || uiState === "buffering";
  const showBigPlay = uiState === "paused" || uiState === "ended" || uiState === "ready";

  return (
    <div
      ref={containerRef}
      className={cn(
        "group relative h-full w-full overflow-hidden bg-black select-none",
        className,
      )}
      onPointerMove={handlePointerMove}
      onPointerLeave={() => {
        if (uiState === "playing") setControlsVisible(false);
      }}
    >
      <video
        ref={videoRef}
        className="h-full w-full bg-black object-contain"
        playsInline
        onClick={togglePlay}
      />

      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/35 transition-opacity duration-300",
          controlsVisible || showOverlaySpinner || uiState === "error"
            ? "opacity-100"
            : "opacity-0",
        )}
      />

      {showLiveBadge ? (
        <div
          className={cn(
            "absolute left-3 top-3 z-20 flex items-center gap-2 transition-opacity duration-300 sm:left-4 sm:top-4",
            controlsVisible || showOverlaySpinner ? "opacity-100" : "opacity-0",
          )}
        >
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white shadow-lg shadow-red-900/40">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
            Live
          </span>
          {latency !== null ? (
            <span className="rounded-full border border-white/15 bg-black/45 px-2.5 py-1 text-[10px] uppercase tracking-wider text-white/70 backdrop-blur">
              Latence {formatLatency(latency)}
            </span>
          ) : null}
        </div>
      ) : null}

      {title ? (
        <div
          className={cn(
            "absolute right-3 top-3 z-20 max-w-[55%] truncate rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[10px] uppercase tracking-wider text-white/70 backdrop-blur transition-opacity duration-300 sm:right-4 sm:top-4",
            controlsVisible ? "opacity-100" : "opacity-0",
          )}
        >
          {title}
        </div>
      ) : null}

      {showOverlaySpinner ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-amber-300" />
          <p className="text-xs uppercase tracking-[0.25em] text-white/55">
            {uiState === "loading" ? "Connexion au live…" : "Buffering…"}
          </p>
        </div>
      ) : null}

      {showBigPlay && !error ? (
        <button
          type="button"
          onClick={togglePlay}
          className="absolute inset-0 z-10 flex items-center justify-center"
          aria-label="Lecture"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white shadow-2xl backdrop-blur transition hover:scale-105 hover:bg-black/70">
            <Play className="ml-1 h-7 w-7 fill-current" />
          </span>
        </button>
      ) : null}

      {error ? (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-black/75 px-6 text-center">
          <Radio className="h-8 w-8 text-red-300" />
          <div>
            <p className="font-[family-name:var(--font-anton)] text-xl uppercase text-white">
              Flux indisponible
            </p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-white/55">{error}</p>
          </div>
          <button
            type="button"
            onClick={handleRetry}
            className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-5 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-black transition hover:bg-amber-300"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Réessayer
          </button>
        </div>
      ) : null}

      <div
        className={cn(
          "absolute inset-x-0 bottom-0 z-20 px-3 pb-3 pt-10 transition-all duration-300 sm:px-4 sm:pb-4",
          controlsVisible && !error
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-2 opacity-0",
        )}
      >
        <div className="rounded-2xl border border-white/10 bg-black/55 p-2.5 shadow-2xl backdrop-blur-md sm:p-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={togglePlay}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
              aria-label={uiState === "playing" ? "Pause" : "Lecture"}
            >
              {uiState === "playing" || uiState === "buffering" ? (
                <Pause className="h-4 w-4 fill-current" />
              ) : (
                <Play className="ml-0.5 h-4 w-4 fill-current" />
              )}
            </button>

            <button
              type="button"
              onClick={toggleMute}
              className="flex h-9 w-9 items-center justify-center rounded-full text-white/85 transition hover:bg-white/10"
              aria-label={muted ? "Activer le son" : "Couper le son"}
            >
              <VolumeIcon className="h-4 w-4" />
            </button>

            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(event) => handleVolumeChange(Number(event.target.value))}
              className="hidden h-1 w-20 cursor-pointer accent-amber-400 sm:block"
              aria-label="Volume"
            />

            <div className="ml-auto flex items-center gap-2">
              {qualities.length > 0 ? (
                <label className="hidden items-center gap-2 text-[10px] uppercase tracking-wider text-white/55 sm:flex">
                  Qualité
                  <select
                    value={
                      autoQuality
                        ? "auto"
                        : currentQuality
                          ? `${currentQuality.height}-${currentQuality.bitrate}`
                          : "auto"
                    }
                    onChange={(event) => handleQualityChange(event.target.value)}
                    className="rounded-full border border-white/15 bg-black/40 px-2.5 py-1.5 text-[10px] uppercase tracking-wider text-white outline-none"
                  >
                    <option value="auto">Auto</option>
                    {qualities.map((quality) => (
                      <option
                        key={`${quality.height}-${quality.bitrate}`}
                        value={`${quality.height}-${quality.bitrate}`}
                      >
                        {qualityLabel(quality)}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <button
                type="button"
                onClick={handleRetry}
                className="flex h-9 w-9 items-center justify-center rounded-full text-white/75 transition hover:bg-white/10"
                aria-label="Recharger"
              >
                <RefreshCw className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => void toggleFullscreen()}
                className="flex h-9 w-9 items-center justify-center rounded-full text-white/85 transition hover:bg-white/10"
                aria-label={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
              >
                {isFullscreen ? (
                  <Minimize className="h-4 w-4" />
                ) : (
                  <Maximize className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
