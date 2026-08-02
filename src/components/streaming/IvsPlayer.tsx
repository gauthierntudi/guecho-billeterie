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
  ArrowLeft,
  Loader2,
  Maximize,
  Minimize,
  Pause,
  Play,
  Radio,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SEEK_STEP_SECONDS = 10;

type IvsPlayerProps = {
  playbackUrl: string;
  className?: string;
  title?: string;
  autoPlay?: boolean;
  muted?: boolean;
  showLiveBadge?: boolean;
  /** Netflix-style top-left back / leave action */
  onExit?: () => void;
  exitLabel?: string;
};

type PlayerUiState =
  | "loading"
  | "ready"
  | "playing"
  | "paused"
  | "buffering"
  | "ended"
  | "error";

function formatClock(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

function qualityLabel(quality: Quality) {
  if (quality.height > 0) return `${quality.height}p`;
  if (quality.name) return quality.name;
  return `${Math.round(quality.bitrate / 1000)} kbps`;
}

function isFiniteDuration(duration: number) {
  return Number.isFinite(duration) && duration > 0 && duration < 1 << 30;
}

export function IvsPlayer({
  playbackUrl,
  className,
  title,
  autoPlay = true,
  muted: initialMuted = false,
  showLiveBadge = true,
  onExit,
  exitLabel = "Quitter",
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
  const [cssFullscreen, setCssFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [latency, setLatency] = useState<number | null>(null);
  const [qualities, setQualities] = useState<Quality[]>([]);
  const [currentQuality, setCurrentQuality] = useState<Quality | null>(null);
  const [autoQuality, setAutoQuality] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

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
    let tickTimer: number | null = null;

    async function setup() {
      setUiState("loading");
      setError(null);
      setQualities([]);
      setCurrentQuality(null);
      setLatency(null);
      setPosition(0);
      setDuration(0);

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

        tickTimer = window.setInterval(() => {
          if (!player || cancelled) return;
          setLatency(player.getLiveLatency());
          setPosition(player.getPosition());
          setDuration(player.getDuration());
          if (player.getState() === IVS.PlayerState.PLAYING) {
            setQualities(player.getQualities());
          }
        }, 500);
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
      if (tickTimer) window.clearInterval(tickTimer);
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
    const video = videoRef.current;

    function syncFullscreenState() {
      const doc = document as Document & {
        webkitFullscreenElement?: Element | null;
      };
      const nativeFs = Boolean(
        document.fullscreenElement || doc.webkitFullscreenElement,
      );
      const videoFs = Boolean(
        video &&
          (
            video as HTMLVideoElement & {
              webkitDisplayingFullscreen?: boolean;
            }
          ).webkitDisplayingFullscreen,
      );
      setIsFullscreen(nativeFs || videoFs || cssFullscreen);
    }

    function onFullscreenChange() {
      syncFullscreenState();
    }

    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener(
      "webkitfullscreenchange",
      onFullscreenChange as EventListener,
    );
    video?.addEventListener("webkitbeginfullscreen", onFullscreenChange);
    video?.addEventListener("webkitendfullscreen", onFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener(
        "webkitfullscreenchange",
        onFullscreenChange as EventListener,
      );
      video?.removeEventListener("webkitbeginfullscreen", onFullscreenChange);
      video?.removeEventListener("webkitendfullscreen", onFullscreenChange);
    };
  }, [cssFullscreen]);

  useEffect(() => {
    if (!cssFullscreen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [cssFullscreen]);

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
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container || !video) return;

    const doc = document as Document & {
      webkitFullscreenElement?: Element | null;
      webkitExitFullscreen?: () => Promise<void> | void;
    };
    const containerEl = container as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
    };
    const videoEl = video as HTMLVideoElement & {
      webkitEnterFullscreen?: () => void;
      webkitExitFullscreen?: () => void;
      webkitDisplayingFullscreen?: boolean;
    };

    const inNativeFs = Boolean(
      document.fullscreenElement || doc.webkitFullscreenElement,
    );
    const inVideoFs = Boolean(videoEl.webkitDisplayingFullscreen);

    try {
      if (cssFullscreen) {
        setCssFullscreen(false);
        setIsFullscreen(false);
        return;
      }

      if (inNativeFs) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else {
          await doc.webkitExitFullscreen?.();
        }
        setIsFullscreen(false);
        return;
      }

      if (inVideoFs) {
        videoEl.webkitExitFullscreen?.();
        setIsFullscreen(false);
        return;
      }

      if (typeof containerEl.requestFullscreen === "function") {
        await containerEl.requestFullscreen();
        setIsFullscreen(true);
        return;
      }

      if (typeof containerEl.webkitRequestFullscreen === "function") {
        await containerEl.webkitRequestFullscreen();
        setIsFullscreen(true);
        return;
      }

      if (typeof videoEl.webkitEnterFullscreen === "function") {
        videoEl.webkitEnterFullscreen();
        setIsFullscreen(true);
        return;
      }
    } catch {
      // Fall through to CSS fullscreen.
    }

    setCssFullscreen(true);
    setIsFullscreen(true);
  }

  function seekBy(deltaSeconds: number) {
    const player = playerRef.current;
    if (!player) return;

    const pos = player.getPosition();
    const dur = player.getDuration();
    if (!Number.isFinite(pos)) return;

    let next = pos + deltaSeconds;
    if (next < 0) next = 0;

    if (isFiniteDuration(dur)) {
      next = Math.min(next, Math.max(0, dur - 0.25));
    }

    try {
      player.seekTo(next);
      player.play();
      setUiState("playing");
      revealControls();
    } catch {
      // Live edge / buffer limits can reject some seeks.
    }
  }

  function seekToRatio(ratio: number) {
    const player = playerRef.current;
    if (!player || !isFiniteDuration(duration)) return;
    const next = Math.max(0, Math.min(duration - 0.25, duration * ratio));
    try {
      player.seekTo(next);
      player.play();
      setUiState("playing");
      revealControls();
    } catch {
      // ignore
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

  const VolumeIcon =
    muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  const showOverlaySpinner = uiState === "loading" || uiState === "buffering";
  const showBigPlay =
    uiState === "paused" || uiState === "ended" || uiState === "ready";
  const showChrome = controlsVisible || showOverlaySpinner || uiState === "error";
  const progressable = isFiniteDuration(duration);
  const progressRatio = progressable
    ? Math.min(1, Math.max(0, position / duration))
    : uiState === "playing" || uiState === "buffering"
      ? 1
      : 0;

  return (
    <div
      ref={containerRef}
      className={cn(
        "group relative h-full w-full overflow-hidden bg-black select-none",
        cssFullscreen && "fixed inset-0 z-[200] h-dvh w-screen rounded-none",
        className,
      )}
      onPointerMove={handlePointerMove}
      onPointerLeave={() => {
        if (uiState === "playing" && !cssFullscreen) setControlsVisible(false);
      }}
    >
      <video
        ref={videoRef}
        className="h-full w-full bg-black object-contain"
        playsInline
        onClick={togglePlay}
      />

      {/* Netflix-style edge vignettes */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/80 transition-opacity duration-300",
          showChrome ? "opacity-100" : "opacity-0",
        )}
      />

      {/* Top bar */}
      <div
        className={cn(
          "absolute inset-x-0 top-0 z-20 flex items-center justify-between px-3 pt-3 transition-opacity duration-300 sm:px-5 sm:pt-4",
          showChrome ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <div className="flex items-center gap-2">
          {onExit ? (
            <button
              type="button"
              onClick={onExit}
              className="flex h-10 w-10 items-center justify-center text-white/95 transition hover:text-white"
              aria-label={exitLabel}
            >
              <ArrowLeft className="h-6 w-6" strokeWidth={1.75} />
            </button>
          ) : null}
          {showLiveBadge ? (
            <span className="inline-flex items-center gap-1.5 rounded-sm bg-[#e50914] px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
              Live
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {latency !== null ? (
            <span className="hidden text-[11px] text-white/55 sm:inline">
              {latency.toFixed(1)}s
            </span>
          ) : null}
          <button
            type="button"
            onClick={handleRetry}
            className="flex h-10 w-10 items-center justify-center text-white/90 transition hover:text-white"
            aria-label="Recharger"
          >
            <RefreshCw className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* Center title (Netflix pause / chrome) */}
      {title && showChrome && !error ? (
        <div className="pointer-events-none absolute inset-x-0 top-[3.5%] z-10 flex justify-center px-6 text-center sm:top-[5%]">
          <p className="max-w-xl font-[family-name:var(--font-anton)] text-lg uppercase leading-[0.95] text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.85)] sm:text-xl md:text-2xl">
            {title}
          </p>
        </div>
      ) : null}

      {showOverlaySpinner ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-9 w-9 animate-spin text-white" />
          <p className="text-xs uppercase tracking-[0.22em] text-white/60">
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
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/60">
            <Play className="ml-1 h-8 w-8 fill-current" />
          </span>
        </button>
      ) : null}

      {error ? (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-black/80 px-6 text-center">
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
            className="inline-flex items-center gap-2 rounded-sm bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-white/90"
          >
            <RefreshCw className="h-4 w-4" />
            Réessayer
          </button>
        </div>
      ) : null}

      {/* Bottom Netflix controls */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 z-20 px-3 pb-3 pt-16 transition-all duration-300 sm:px-5 sm:pb-5",
          controlsVisible && !error
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-3 opacity-0",
        )}
      >
        {/* Progress / live edge */}
        <div className="mb-3 flex items-center gap-3">
          <button
            type="button"
            className="group/progress relative h-1 flex-1 rounded-full bg-white/30"
            aria-label="Progression"
            onClick={(event) => {
              if (!progressable) return;
              const rect = event.currentTarget.getBoundingClientRect();
              const ratio = (event.clientX - rect.left) / rect.width;
              seekToRatio(ratio);
            }}
          >
            <span
              className="absolute inset-y-0 left-0 rounded-full bg-white transition group-hover/progress:bg-[#e50914]"
              style={{ width: `${progressRatio * 100}%` }}
            />
            <span
              className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-[#e50914] opacity-0 shadow transition group-hover/progress:opacity-100"
              style={{ left: `calc(${progressRatio * 100}% - 7px)` }}
            />
          </button>
          <span className="min-w-[2.75rem] text-right text-xs tabular-nums text-white/80">
            {progressable
              ? formatClock(Math.max(0, duration - position))
              : "LIVE"}
          </span>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <div className="flex items-center gap-0.5 sm:gap-1">
            <button
              type="button"
              onClick={togglePlay}
              className="flex h-11 w-11 items-center justify-center text-white transition hover:text-white/80"
              aria-label={uiState === "playing" ? "Pause" : "Lecture"}
            >
              {uiState === "playing" || uiState === "buffering" ? (
                <Pause className="h-6 w-6 fill-current" />
              ) : (
                <Play className="ml-0.5 h-6 w-6 fill-current" />
              )}
            </button>

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                seekBy(-SEEK_STEP_SECONDS);
              }}
              className="relative flex h-11 w-11 items-center justify-center text-white transition hover:text-white/80"
              aria-label={`Reculer de ${SEEK_STEP_SECONDS}s`}
            >
              <RotateCcw className="h-5 w-5" />
              <span className="pointer-events-none absolute text-[8px] font-bold">
                {SEEK_STEP_SECONDS}
              </span>
            </button>

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                seekBy(SEEK_STEP_SECONDS);
              }}
              className="relative flex h-11 w-11 items-center justify-center text-white transition hover:text-white/80"
              aria-label={`Avancer de ${SEEK_STEP_SECONDS}s`}
            >
              <RotateCw className="h-5 w-5" />
              <span className="pointer-events-none absolute text-[8px] font-bold">
                {SEEK_STEP_SECONDS}
              </span>
            </button>

            <button
              type="button"
              onClick={toggleMute}
              className="flex h-11 w-11 items-center justify-center text-white transition hover:text-white/80"
              aria-label={muted ? "Activer le son" : "Couper le son"}
            >
              <VolumeIcon className="h-5 w-5" />
            </button>

            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(event) =>
                handleVolumeChange(Number(event.target.value))
              }
              className="hidden h-1 w-24 cursor-pointer accent-white sm:block"
              aria-label="Volume"
            />
          </div>

          <p className="mx-2 hidden min-w-0 flex-1 truncate text-center text-sm text-white/85 md:block">
            {title ?? "Guecho Rocambole — Live"}
          </p>

          <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
            {qualities.length > 0 ? (
              <label className="hidden items-center sm:flex">
                <select
                  value={
                    autoQuality
                      ? "auto"
                      : currentQuality
                        ? `${currentQuality.height}-${currentQuality.bitrate}`
                        : "auto"
                  }
                  onChange={(event) => handleQualityChange(event.target.value)}
                  className="cursor-pointer appearance-none bg-transparent px-2 py-2 text-xs text-white/85 outline-none"
                  aria-label="Qualité"
                >
                  <option value="auto" className="bg-black text-white">
                    Auto
                  </option>
                  {qualities.map((quality) => (
                    <option
                      key={`${quality.height}-${quality.bitrate}`}
                      value={`${quality.height}-${quality.bitrate}`}
                      className="bg-black text-white"
                    >
                      {qualityLabel(quality)}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                void toggleFullscreen();
              }}
              className="flex h-11 w-11 items-center justify-center text-white transition hover:text-white/80"
              aria-label={
                isFullscreen ? "Quitter le plein écran" : "Plein écran"
              }
            >
              {isFullscreen ? (
                <Minimize className="h-5 w-5" />
              ) : (
                <Maximize className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
