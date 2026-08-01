"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Value } from "react-phone-number-input";
import {
  CheckCircle2,
  Loader2,
  MonitorPlay,
  Ticket,
} from "lucide-react";
import { IvsPlayer } from "@/components/streaming/IvsPlayer";
import { TelInput } from "@/components/ticketing/TelInput";

type StreamStatus = {
  isLive: boolean;
  title: string | null;
  eventTitle: string;
  eventSlug: string;
  hasChannel: boolean;
};

type AccessPayload = {
  isLive: boolean;
  playbackUrl: string | null;
  title: string | null;
  eventTitle: string;
  ticketCode: string;
  attendeeName: string | null;
};

const ACCESS_STORAGE_KEY = "guecho-stream-access";
const STATUS_TIMEOUT_MS = 12_000;
const ACCESS_TIMEOUT_MS = 45_000;

type StreamingGateProps = {
  initialStatus?: StreamStatus | null;
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

export function StreamingGate({ initialStatus = null }: StreamingGateProps) {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<StreamStatus | null>(initialStatus);
  const [ticketCode, setTicketCode] = useState(
    () => searchParams.get("code")?.toUpperCase() ?? "",
  );
  const [phone, setPhone] = useState<Value>();
  const [access, setAccess] = useState<AccessPayload | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");

    try {
      const raw = sessionStorage.getItem(ACCESS_STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as AccessPayload;
        if (saved?.ticketCode) {
          setAccess(saved);
          return;
        }
      }
    } catch {
      // ignore
    }

    if (code) {
      void requestAccess({ ticketCode: code });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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
        // Keep existing status/errors; status poll must not wipe access errors.
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
    void requestAccess({ ticketCode: access.ticketCode });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.isLive]);

  async function requestAccess(payload: {
    ticketCode?: string;
    phone?: string;
  }) {
    setSubmitting(true);
    setError(null);
    const controller = new AbortController();
    const timeout = window.setTimeout(
      () => controller.abort(),
      ACCESS_TIMEOUT_MS,
    );

    try {
      const response = await fetch("/api/streaming/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketCode: payload.ticketCode?.trim().toUpperCase(),
          phone: payload.phone?.trim(),
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
      setAccess(data);
      if (data.ticketCode) setTicketCode(data.ticketCode);
      try {
        sessionStorage.setItem(ACCESS_STORAGE_KEY, JSON.stringify(data));
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
    // Read from DOM too: mobile autofill often skips React onChange.
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

  function resetAccess() {
    setAccess(null);
    setError(null);
    sessionStorage.removeItem(ACCESS_STORAGE_KEY);
  }

  const isLive = Boolean(status?.isLive);
  const eventTitle = status?.eventTitle ?? "le spectacle";

  if (access?.isLive && access.playbackUrl) {
    return (
      <div className="-mx-4 space-y-4 sm:mx-0 sm:space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3 px-4 sm:px-0">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-amber-300">
              En direct
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-anton)] text-3xl uppercase leading-[0.95] text-white md:text-4xl">
              {access.title ?? access.eventTitle}
            </h1>
            <p className="mt-2 text-sm text-white/45">
              Billet {access.ticketCode}
              {access.attendeeName ? ` · ${access.attendeeName}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={resetAccess}
            className="rounded-full border border-amber-400/25 px-4 py-2 text-[10px] uppercase tracking-widest text-amber-100/70 transition hover:border-amber-300/50 hover:text-amber-100"
          >
            Changer d&apos;accès
          </button>
        </div>

        <div className="relative aspect-video overflow-hidden bg-black shadow-[0_0_80px_-20px_rgba(251,191,36,0.45)] sm:rounded-2xl sm:border sm:border-amber-400/20">
          <IvsPlayer
            playbackUrl={access.playbackUrl}
            title={access.title ?? access.eventTitle}
            className="absolute inset-0"
          />
        </div>
      </div>
    );
  }

  if (access) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 px-6 py-10 text-center backdrop-blur">
          <CheckCircle2 className="mx-auto h-8 w-8 text-amber-300" />
          <p className="mt-4 font-[family-name:var(--font-anton)] text-2xl uppercase text-white">
            Accès validé
          </p>
          <p className="mx-auto mt-3 max-w-sm text-sm text-white/55">
            Billet {access.ticketCode}
            {access.attendeeName ? ` · ${access.attendeeName}` : ""}. Le player
            s’ouvrira automatiquement dès le démarrage du live.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-black/30 px-4 py-2 text-[10px] uppercase tracking-[0.22em] text-amber-100/60">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-300" />
            {isLive ? "Connexion au live…" : "En attente du live"}
          </div>
          <button
            type="button"
            onClick={resetAccess}
            className="mt-6 block w-full rounded-full border border-amber-400/20 px-4 py-3 text-[10px] uppercase tracking-widest text-amber-100/60 transition hover:border-amber-300/40 hover:text-amber-100"
          >
            Changer d&apos;accès
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/10 px-4 py-1.5">
          <span className="relative flex h-2 w-2">
            <span
              className={`absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-60 ${isLive ? "animate-ping" : ""}`}
            />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
          </span>
          <span className="text-[10px] uppercase tracking-[0.35em] text-amber-100">
            {isLive ? "Live en cours" : "Streaming"}
          </span>
        </div>
        <h1 className="mt-5 font-[family-name:var(--font-anton)] text-4xl uppercase leading-[0.95] text-white md:text-5xl">
          Accès live
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-white/55">
          Entrez le code de votre billet Access Streaming ou le numéro de
          téléphone associé à la commande pour regarder {eventTitle}.
        </p>
      </div>

      {!isLive ? (
        <div className="mb-5 rounded-2xl border border-amber-400/15 bg-amber-500/5 px-5 py-4 text-sm text-white/55 backdrop-blur">
          <p className="font-[family-name:var(--font-anton)] text-lg uppercase text-amber-100">
            Pas encore en direct
          </p>
          <p className="mt-1.5 text-sm text-white/50">
            Vous pouvez déjà valider votre accès. Le live s’ouvrira dès le
            démarrage officiel.
          </p>
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="relative z-20 rounded-2xl border border-amber-400/25 bg-black/80 p-5 shadow-[0_0_40px_-12px_rgba(251,191,36,0.35)] sm:p-6"
      >
        <p className="mb-4 text-[11px] uppercase tracking-[0.22em] text-amber-100/45">
          Remplissez l&apos;un des deux champs
        </p>

        <label
          htmlFor="stream-ticket-code"
          className="mb-2 block text-[11px] uppercase tracking-[0.22em] text-amber-100/40"
        >
          Code billet streaming
        </label>
        <div className="relative">
          <Ticket className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-200/35" />
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
            placeholder="XXXXXXXXXXXX"
            autoComplete="one-time-code"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            inputMode="text"
            enterKeyHint="go"
            className="w-full rounded-xl border border-amber-400/15 bg-black/40 py-3.5 pl-10 pr-4 font-mono text-sm tracking-[0.14em] text-white outline-none transition focus:border-amber-400/50"
          />
        </div>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-amber-400/15" />
          <span className="text-[10px] uppercase tracking-[0.28em] text-amber-100/40">
            ou
          </span>
          <div className="h-px flex-1 bg-amber-400/15" />
        </div>

        <label
          htmlFor="stream-phone"
          className="mb-2 block text-[11px] uppercase tracking-[0.22em] text-amber-100/40"
        >
          Téléphone de contact
        </label>
        <div id="stream-phone" className="relative z-20">
          <TelInput
            value={phone}
            onChange={(value) => {
              setPhone(value);
              setError(null);
            }}
            placeholder="Téléphone associé à la commande"
            required={false}
          />
        </div>
        <p className="mt-2 text-xs text-white/40">
          Numéro saisi lors de l’achat du billet streaming.
        </p>

        {submitting ? (
          <p className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-sm text-amber-100">
            <Loader2 className="h-4 w-4 animate-spin" />
            Vérification de votre accès…
          </p>
        ) : null}

        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm text-red-200"
          >
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="mt-5 flex min-h-12 w-full touch-manipulation items-center justify-center gap-2 rounded-full bg-amber-400 px-6 py-4 font-[family-name:var(--font-anton)] text-sm uppercase tracking-widest text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MonitorPlay className="h-4 w-4" />
          )}
          {submitting
            ? "Validation…"
            : isLive
              ? "Regarder le live"
              : "Valider mon accès"}
        </button>
      </form>
    </div>
  );
}
