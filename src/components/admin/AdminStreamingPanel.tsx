"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  Copy,
  Eye,
  Loader2,
  MonitorPlay,
  Radio,
  RefreshCw,
} from "lucide-react";
import type { AdminStreamView } from "@/lib/streaming";
import { IvsPlayer } from "@/components/streaming/IvsPlayer";
import { adminCard } from "@/components/admin/admin-styles";
import { cn } from "@/lib/utils";

function CopyField({
  label,
  value,
  secret = false,
}: {
  label: string;
  value: string;
  secret?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">
          {label}
        </p>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[10px] uppercase tracking-wider text-zinc-600 transition hover:border-zinc-300"
        >
          {copied ? (
            <Check className="h-3 w-3 text-emerald-600" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
          {copied ? "Copié" : "Copier"}
        </button>
      </div>
      <p className="break-all font-mono text-xs text-zinc-800">
        {secret ? "•".repeat(Math.min(value.length, 28)) : value}
      </p>
      {secret ? (
        <p className="mt-2 break-all font-mono text-[11px] text-zinc-500">
          {value}
        </p>
      ) : null}
    </div>
  );
}

export function AdminStreamingPanel() {
  const [stream, setStream] = useState<AdminStreamView | null>(null);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [previewEnabled, setPreviewEnabled] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch("/api/admin/streaming", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Chargement impossible");
        return;
      }
      setStream(data.stream);
      setTitle(data.stream.title ?? "");
    } catch {
      setError("Connexion impossible");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => {
      void load();
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [load]);

  async function runAction(action: string, extra?: { title?: string }) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/streaming", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Action impossible");
        return;
      }
      setStream(data.stream);
      setTitle(data.stream.title ?? "");
      setMessage(
        action === "provision"
          ? "Canal IVS créé. Configurez OBS avec les infos ci-dessous."
          : action === "go-live"
            ? "Streaming public activé."
            : action === "end-live"
              ? "Streaming public désactivé."
              : "Titre mis à jour.",
      );
    } catch {
      setError("Connexion impossible");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className={cn(adminCard, "flex items-center justify-center gap-2 p-10")}>
        <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
        <span className="text-sm text-zinc-500">Chargement streaming…</span>
      </div>
    );
  }

  if (!stream) {
    return (
      <div className={cn(adminCard, "p-6 text-sm text-red-600")}>
        {error ?? "Streaming indisponible"}
      </div>
    );
  }

  const canPreview = Boolean(stream.playbackUrl);
  const canGoLive =
    stream.configured && !stream.isLive && stream.awsBroadcasting;

  return (
    <div className="space-y-5">
      <div className={cn(adminCard, "p-5 sm:p-6")}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-zinc-400">
              AWS IVS
            </p>
            <h2 className="mt-1 text-xl font-semibold text-zinc-900">
              {stream.event.title}
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Prévisualisez le flux OBS ici, puis ouvrez le live au public.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider",
                stream.isLive
                  ? "bg-red-100 text-red-700"
                  : "bg-zinc-100 text-zinc-600",
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  stream.isLive ? "animate-pulse bg-red-500" : "bg-zinc-400",
                )}
              />
              {stream.isLive ? "Public live" : "Public off"}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider",
                stream.awsBroadcasting
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-zinc-100 text-zinc-600",
              )}
            >
              <Radio className="h-3 w-3" />
              {stream.awsBroadcasting ? "OBS connecté" : "OBS offline"}
            </span>
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 px-3 py-1.5 text-[10px] uppercase tracking-wider text-zinc-600 transition hover:border-zinc-300"
            >
              <RefreshCw className="h-3 w-3" />
              Rafraîchir
            </button>
          </div>
        </div>

        {!stream.awsReady ? (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Ajoutez `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` et
            `AWS_REGION` (ou `AWS_DEFAULT_REGION`) dans les variables
            d&apos;environnement.
          </p>
        ) : null}

        {error ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </p>
        ) : null}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="min-w-0 flex-1 text-sm">
            <span className="mb-1.5 block text-[11px] uppercase tracking-[0.18em] text-zinc-400">
              Titre du live
            </span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none transition focus:border-zinc-400"
              placeholder="Guecho Rocambole — Live"
            />
          </label>
          <button
            type="button"
            disabled={busy || !title.trim()}
            onClick={() => void runAction("update-title", { title })}
            className="rounded-full border border-zinc-200 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-zinc-700 transition hover:border-zinc-300 disabled:opacity-40"
          >
            Enregistrer
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {!stream.configured ? (
            <button
              type="button"
              disabled={busy || !stream.awsReady}
              onClick={() => void runAction("provision")}
              className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-zinc-800 disabled:opacity-40"
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <MonitorPlay className="h-3.5 w-3.5" />
              )}
              Créer le canal IVS
            </button>
          ) : null}

          {stream.configured && !stream.isLive ? (
            <button
              type="button"
              disabled={busy || !canGoLive}
              title={
                !stream.awsBroadcasting
                  ? "Démarrez OBS et prévisualisez le flux avant d'ouvrir au public"
                  : undefined
              }
              onClick={() => void runAction("go-live", { title })}
              className="inline-flex items-center gap-2 rounded-full bg-red-600 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-red-500 disabled:opacity-40"
            >
              Passer en live public
            </button>
          ) : null}

          {stream.isLive ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void runAction("end-live")}
              className="inline-flex items-center gap-2 rounded-full border border-zinc-300 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-zinc-700 transition hover:border-zinc-400 disabled:opacity-40"
            >
              Couper le live public
            </button>
          ) : null}

          <a
            href="/streaming"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-zinc-200 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-zinc-600 transition hover:border-zinc-300"
          >
            Ouvrir la page publique
          </a>
        </div>

        {stream.configured && !stream.isLive && !stream.awsBroadcasting ? (
          <p className="mt-4 text-sm text-amber-700">
            Démarrez la diffusion OBS, puis utilisez la prévisualisation
            ci-dessous avant d&apos;ouvrir le live au public.
          </p>
        ) : null}

        {stream.awsBroadcasting ? (
          <p className="mt-4 text-sm text-zinc-500">
            Spectateurs AWS : {stream.awsViewerCount ?? 0}
            {stream.awsHealth ? ` · santé ${stream.awsHealth}` : ""}
            {stream.awsStartTime
              ? ` · démarré ${new Date(stream.awsStartTime).toLocaleString("fr-FR")}`
              : ""}
          </p>
        ) : null}
      </div>

      {stream.configured ? (
        <div className={cn(adminCard, "space-y-4 p-5 sm:p-6")}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-violet-700">
                <Eye className="h-3 w-3" />
                Preview admin uniquement
              </div>
              <h3 className="mt-3 text-sm font-semibold text-zinc-900">
                Prévisualisation du flux
              </h3>
              <p className="mt-1 text-sm text-zinc-500">
                Visible seulement ici. Le public ne voit rien tant que le live
                n&apos;est pas ouvert.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {!previewEnabled ? (
                <button
                  type="button"
                  disabled={!canPreview}
                  onClick={() => {
                    setPreviewEnabled(true);
                    setPreviewKey((key) => key + 1);
                  }}
                  className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-white transition hover:bg-violet-500 disabled:opacity-40"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Lancer le preview
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setPreviewKey((key) => key + 1)}
                    className="inline-flex items-center gap-2 rounded-full border border-zinc-200 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600 transition hover:border-zinc-300"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Recharger
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewEnabled(false)}
                    className="inline-flex items-center gap-2 rounded-full border border-zinc-200 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600 transition hover:border-zinc-300"
                  >
                    Arrêter
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="relative aspect-video overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-950">
            {previewEnabled && stream.playbackUrl ? (
              <IvsPlayer
                key={previewKey}
                playbackUrl={stream.playbackUrl}
                title="Preview admin"
                showLiveBadge={stream.awsBroadcasting}
                className="absolute inset-0"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
                <MonitorPlay className="h-8 w-8 text-zinc-500" />
                <p className="text-sm text-zinc-400">
                  {stream.awsBroadcasting
                    ? "Cliquez sur « Lancer le preview » pour vérifier l'image et le son."
                    : "En attente du signal OBS… Démarrez la diffusion, puis lancez le preview."}
                </p>
              </div>
            )}
          </div>

          {previewEnabled && !stream.awsBroadcasting ? (
            <p className="text-sm text-amber-700">
              Le lecteur est actif, mais AWS n&apos;indique pas encore de
              diffusion. Vérifiez OBS (clé / serveur RTMPS).
            </p>
          ) : null}
        </div>
      ) : null}

      {stream.configured ? (
        <div className={cn(adminCard, "space-y-3 p-5 sm:p-6")}>
          <h3 className="text-sm font-semibold text-zinc-900">
            Configuration OBS / Streamlabs
          </h3>
          <p className="text-sm text-zinc-500">
            Service : Custom → collez le serveur RTMPS et la clé de stream.
          </p>
          {stream.rtmpServer ? (
            <CopyField label="Serveur RTMPS" value={stream.rtmpServer} />
          ) : null}
          {stream.streamKeyValue ? (
            <CopyField
              label="Clé de stream"
              value={stream.streamKeyValue}
              secret
            />
          ) : null}
          {stream.playbackUrl ? (
            <CopyField label="URL de lecture (IVS)" value={stream.playbackUrl} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
