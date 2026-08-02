"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Value } from "react-phone-number-input";
import {
  CheckCircle2,
  ChevronRight,
  CircleX,
  Loader2,
} from "lucide-react";
import { SecureLivePlayer } from "@/components/streaming/SecureLivePlayer";
import { TelInput } from "@/components/ticketing/TelInput";
import { cn } from "@/lib/utils";

type StreamStatus = {
  isLive: boolean;
  title: string | null;
  eventTitle: string;
  eventSlug: string;
  hasChannel: boolean;
};

type AccessPayload = {
  isLive: boolean;
  hasPlayback?: boolean;
  title: string | null;
  eventTitle: string;
  ticketCode: string;
  attendeeName: string | null;
  sessionId: string | null;
  /** Kept so restore reuses phone failover across tickets. */
  phone?: string | null;
};

const ACCESS_STORAGE_KEY = "guecho-stream-access";
const STATUS_TIMEOUT_MS = 12_000;
const ACCESS_TIMEOUT_MS = 45_000;
const HEARTBEAT_MS = 30_000;

type StreamingGateProps = {
  initialStatus?: StreamStatus | null;
  /** Fired when the live player is shown / hidden. */
  onPlaybackActive?: (active: boolean) => void;
};

async function fetchStreamStatus(signal?: AbortSignal): Promise<StreamStatus> {
  const response = await fetch("/api/streaming/status", {
    cache: "no-store",
    signal,
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? "Statut indisponible");
  }
  return data as StreamStatus;
}

export function StreamingGate({
  initialStatus = null,
  onPlaybackActive,
}: StreamingGateProps) {
  const searchParams = useSearchParams();
  const autoCode = searchParams.get("code")?.trim().toUpperCase() ?? "";
  const [status, setStatus] = useState<StreamStatus | null>(initialStatus);
  const [ticketCode, setTicketCode] = useState(() => autoCode);
  const [phone, setPhone] = useState<Value>();
  const [access, setAccess] = useState<AccessPayload | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Avoid flashing the form/CTA before URL or session restore finishes. */
  const [booting, setBooting] = useState(true);

  const playbackActive = Boolean(
    access?.isLive && access.hasPlayback && access.sessionId,
  );

  useEffect(() => {
    onPlaybackActive?.(playbackActive);
  }, [playbackActive, onPlaybackActive]);

  useEffect(() => {
    let cancelled = false;
    const codeParam =
      searchParams.get("code")?.trim().toUpperCase() ?? "";
    const errorParam = searchParams.get("error")?.trim() ?? "";

    async function boot() {
      if (errorParam && !codeParam) {
        if (!cancelled) {
          setError(errorParam);
          setBooting(false);
        }
        return;
      }

      if (codeParam) {
        await requestAccess({ ticketCode: codeParam });
        if (!cancelled) setBooting(false);
        return;
      }

      try {
        const raw = sessionStorage.getItem(ACCESS_STORAGE_KEY);
        if (raw) {
          const saved = JSON.parse(raw) as AccessPayload;
          if (saved?.sessionId && (saved.phone || saved.ticketCode)) {
            await requestAccess({
              phone: saved.phone ?? undefined,
              ticketCode: saved.phone ? undefined : saved.ticketCode,
              sessionId: saved.sessionId,
            });
            if (!cancelled) setBooting(false);
            return;
          }
          sessionStorage.removeItem(ACCESS_STORAGE_KEY);
        }
      } catch {
        // ignore
      }

      if (!cancelled) setBooting(false);
    }

    void boot();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  useEffect(() => {
    let cancelled = false;

    async function loadStatus() {
      const controller = new AbortController();
      const timeout = window.setTimeout(
        () => controller.abort(),
        STATUS_TIMEOUT_MS,
      );

      try {
        const data = await fetchStreamStatus(controller.signal);
        if (!cancelled) {
          setStatus(data);
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
      } finally {
        window.clearTimeout(timeout);
      }
    }

    void loadStatus();
    const timer = window.setInterval(loadStatus, 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!access || access.isLive) return;
    if (!status?.isLive) return;
    void requestAccess({
      ticketCode: access.ticketCode,
      sessionId: access.sessionId,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.isLive]);

  // Keep viewer session alive while waiting or watching.
  // Do NOT release on pagehide — mobile Safari fires it on tab switch / sleep
  // and that was freeing seats for extra devices. Seats expire via TTL only.
  useEffect(() => {
    if (!access?.sessionId || !access.ticketCode) return;

    let cancelled = false;

    async function beat() {
      try {
        const response = await fetch("/api/streaming/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: access!.sessionId,
            ticketCode: access!.ticketCode,
          }),
        });
        if (!response.ok && !cancelled) {
          const data = await response.json().catch(() => ({}));
          setError(data.error ?? "Session expirée");
          setAccess(null);
          sessionStorage.removeItem(ACCESS_STORAGE_KEY);
        }
      } catch {
        // transient network errors: retry on next beat
      }
    }

    void beat();
    const timer = window.setInterval(beat, HEARTBEAT_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [access?.sessionId, access?.ticketCode]);

  async function requestAccess(payload: {
    ticketCode?: string;
    phone?: string;
    sessionId?: string | null;
  }) {
    setSubmitting(true);
    setError(null);
    const controller = new AbortController();
    const timeout = window.setTimeout(
      () => controller.abort(),
      ACCESS_TIMEOUT_MS,
    );

    let existingSessionId = payload.sessionId ?? null;
    let savedPhone: string | null = null;
    try {
      const raw = sessionStorage.getItem(ACCESS_STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as AccessPayload;
        if (!existingSessionId) existingSessionId = saved.sessionId ?? null;
        savedPhone = saved.phone ?? null;
      }
    } catch {
      // ignore
    }

    const phoneUsed = payload.phone?.trim() || savedPhone || null;

    try {
      const response = await fetch("/api/streaming/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketCode: payload.ticketCode?.trim().toUpperCase(),
          phone: payload.phone?.trim(),
          sessionId: existingSessionId ?? undefined,
        }),
        signal: controller.signal,
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Accès refusé");
        setAccess(null);
        sessionStorage.removeItem(ACCESS_STORAGE_KEY);
        return;
      }
      if (!data.sessionId) {
        setError("Impossible de réserver une place de visionnage");
        setAccess(null);
        sessionStorage.removeItem(ACCESS_STORAGE_KEY);
        return;
      }
      const nextAccess: AccessPayload = {
        ...data,
        phone: phoneUsed,
      };
      setAccess(nextAccess);
      if (data.ticketCode) setTicketCode(data.ticketCode);
      try {
        sessionStorage.setItem(ACCESS_STORAGE_KEY, JSON.stringify(nextAccess));
      } catch {
        // ignore quota / private mode
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError(
          "Le serveur met trop de temps à répondre. Vérifiez votre connexion et réessayez.",
        );
      } else {
        setError("Connexion impossible — réessayez");
      }
    } finally {
      window.clearTimeout(timeout);
      setSubmitting(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const form = event.currentTarget;
    const codeField = form.elements.namedItem(
      "ticketCode",
    ) as HTMLInputElement | null;
    const code = (codeField?.value ?? ticketCode)
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "");

    const phoneField = form.querySelector<HTMLInputElement>(
      "#stream-phone input",
    );
    const phoneFromDom = phoneField?.value?.trim() ?? "";
    const phoneValue = (phone?.trim() || phoneFromDom).trim();
    const phoneDigits = phoneValue.replace(/\D/g, "");

    if (code.length >= 4) {
      setTicketCode(code);
      void requestAccess({ ticketCode: code });
      return;
    }

    if (phoneDigits.length >= 8) {
      void requestAccess({ phone: phoneValue });
      return;
    }

    setError("Entrez un code billet ou un numéro de téléphone");
  }

  async function resetAccess() {
    if (access?.sessionId && access.ticketCode) {
      try {
        await fetch("/api/streaming/session", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: access.sessionId,
            ticketCode: access.ticketCode,
          }),
        });
      } catch {
        // ignore
      }
    }
    setAccess(null);
    setError(null);
    sessionStorage.removeItem(ACCESS_STORAGE_KEY);
  }

  const isLive = Boolean(status?.isLive);
  const eventTitle = status?.eventTitle ?? "le spectacle";

  if (access?.isLive && access.hasPlayback && access.sessionId) {
    return (
      <div className="relative h-dvh w-full bg-black">
        <SecureLivePlayer
          title={access.title ?? access.eventTitle}
          className="absolute inset-0 h-full w-full"
          onExit={() => void resetAccess()}
          onSessionLost={(message) => {
            setError(message);
            setAccess(null);
            sessionStorage.removeItem(ACCESS_STORAGE_KEY);
          }}
        />
      </div>
    );
  }

  if (access) {
    return (
      <div className="mx-auto flex min-h-[55dvh] max-w-3xl flex-col items-center justify-center px-2 text-center">
        <CheckCircle2 className="h-10 w-10 text-amber-400" strokeWidth={1.75} />
        <h1 className="mt-6 font-[family-name:var(--font-anton)] text-4xl uppercase leading-[0.95] text-white sm:text-5xl">
          Accès validé
        </h1>
        <p className="mt-4 max-w-lg text-base text-white/80 sm:text-lg">
          Billet {access.ticketCode}
          {access.attendeeName ? ` · ${access.attendeeName}` : ""}.
        </p>
        <p className="mt-2 max-w-md text-sm text-white/55">
          Place réservée (2 max par billet). Le player s’ouvrira automatiquement
          dès le démarrage du live.
        </p>
        <div className="mt-8 inline-flex items-center gap-2 text-sm text-white/70">
          <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
          {isLive ? "Connexion au live…" : "En attente du live"}
        </div>
        <button
          type="button"
          onClick={() => void resetAccess()}
          className="mt-8 text-sm text-white/55 underline-offset-4 transition hover:text-white hover:underline"
        >
          Changer d&apos;accès
        </button>
      </div>
    );
  }

  // Don't flash the form+CTA before URL / session restore finishes.
  if (booting) {
    return (
      <div className="mx-auto flex min-h-[55dvh] max-w-3xl flex-col items-center justify-center px-2 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-amber-400" />
        <h1 className="mt-6 font-[family-name:var(--font-anton)] text-4xl uppercase leading-[0.95] text-white sm:text-5xl">
          Connexion au live
        </h1>
        <p className="mt-4 max-w-md text-base text-white/70">
          {ticketCode
            ? `Billet ${ticketCode} — ouverture du player…`
            : "Préparation de votre accès…"}
        </p>
      </div>
    );
  }

  const codeFilled = ticketCode.trim().length > 0;
  const phoneFilled = Boolean(phone && phone.replace(/\D/g, "").length >= 8);

  return (
    <div className="mx-auto w-full max-w-3xl px-1 pt-2 text-center sm:px-2">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/70">
        {isLive ? "En direct maintenant" : "Streaming Guecho"}
      </p>
      <h1 className="mt-3 font-[family-name:var(--font-anton)] text-3xl uppercase leading-[0.95] text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.85)] sm:text-4xl md:text-[2.75rem]">
        {isLive ? "Le live a commencé" : "Regardez le live en direct"}
      </h1>
      <p className="relative z-20 mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/85 drop-shadow-[0_1px_8px_rgba(0,0,0,0.9)] sm:text-[15px]">
        Où que vous soyez — validez votre billet streaming avec le code ou le
        numéro de la commande.
      </p>

      {!isLive ? (
        <p className="relative z-20 mt-1.5 text-[11px] text-amber-200/90">
          Pas encore en direct — votre place sera prête dès l’ouverture.
        </p>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="stream-nf-form relative z-20 mx-auto mt-8 w-full max-w-xl text-left"
      >
        <div className="relative">
          <input
            id="stream-ticket-code"
            name="ticketCode"
            value={ticketCode}
            onChange={(event) => {
              setTicketCode(
                event.target.value.toUpperCase().replace(/\s+/g, ""),
              );
              setError(null);
            }}
            onInput={(event) => {
              setTicketCode(
                event.currentTarget.value.toUpperCase().replace(/\s+/g, ""),
              );
              setError(null);
            }}
            placeholder=" "
            autoComplete="one-time-code"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            inputMode="text"
            enterKeyHint="go"
            aria-invalid={Boolean(error)}
            className={cn(
              "peer stream-nf-input h-[58px] w-full rounded-[4px] border bg-black/75 px-4 pb-2 pt-5 font-mono text-base tracking-[0.12em] text-white outline-none transition",
              error && !phoneFilled
                ? "border-[#e87c03] focus:border-[#e87c03]"
                : "border-white/55 focus:border-white",
            )}
          />
          <label
            htmlFor="stream-ticket-code"
            className={cn(
              "pointer-events-none absolute left-4 text-white/60 transition-all",
              codeFilled
                ? "top-1.5 text-[11px]"
                : "top-1/2 -translate-y-1/2 text-base peer-focus:top-1.5 peer-focus:translate-y-0 peer-focus:text-[11px]",
            )}
          >
            Code billet streaming
          </label>
        </div>

        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/25" />
          <span className="text-xs uppercase tracking-[0.2em] text-white/50">
            ou
          </span>
          <div className="h-px flex-1 bg-white/25" />
        </div>

        <div
          id="stream-phone"
          className={cn(
            "stream-nf-phone rounded-[4px] border bg-black/75 px-3 py-1 transition",
            error && phoneFilled
              ? "border-[#e87c03]"
              : "border-white/55 focus-within:border-white",
          )}
        >
          <p className="mb-0.5 px-1 pt-1.5 text-[11px] text-white/55">
            Téléphone de la commande
          </p>
          <TelInput
            value={phone}
            onChange={(value) => {
              setPhone(value);
              setError(null);
            }}
            placeholder=" "
            required={false}
          />
        </div>

        {error ? (
          <p
            role="alert"
            className="mt-3 flex items-start gap-2 text-sm text-[#e87c03]"
          >
            <CircleX className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="mt-5 flex min-h-[58px] w-full touch-manipulation items-center justify-center gap-2 rounded-[4px] bg-[#feac00] px-6 text-xl font-semibold text-black shadow-[0_8px_28px_rgba(254,172,0,0.5)] transition hover:bg-[#ffb820] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <>
              <span>
                {isLive ? "Regarder le live" : "Valider mon accès"}
              </span>
              <ChevronRight className="h-7 w-7" strokeWidth={2.5} />
            </>
          )}
        </button>

        {submitting ? (
          <p className="mt-4 flex items-center justify-center gap-2 text-sm text-white/70">
            <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
            Vérification de votre accès…
          </p>
        ) : (
          <p className="mt-3 text-center text-xs text-white/45">
            2 appareils par billet — plusieurs billets sur le même numéro
            cumulent les places.
          </p>
        )}
      </form>
    </div>
  );
}
