"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, Loader2 } from "lucide-react";
import { FLEXPAY_CANCEL_BUTTON_DELAY_MS } from "@/lib/flexpaie-polling";
import { cn } from "@/lib/utils";

type PaymentWaitingModalProps = {
  open: boolean;
  title: string;
  message: string;
  reference?: string;
  phase?: "waiting" | "failed";
  showCancelAfterMs?: number;
  cancelLabel?: string;
  onCancel?: () => void;
  className?: string;
};

export function PaymentWaitingModal({
  open,
  title,
  message,
  reference,
  phase = "waiting",
  showCancelAfterMs = FLEXPAY_CANCEL_BUTTON_DELAY_MS,
  cancelLabel = "Annuler",
  onCancel,
  className,
}: PaymentWaitingModalProps) {
  const [mounted, setMounted] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const isFailed = phase === "failed";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setShowCancel(false);
      return;
    }

    if (isFailed) {
      setShowCancel(Boolean(onCancel));
      return;
    }

    if (!onCancel) return;

    const timer = window.setTimeout(() => {
      setShowCancel(true);
    }, showCancelAfterMs);

    return () => window.clearTimeout(timer);
  }, [open, onCancel, showCancelAfterMs, isFailed]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6",
        className,
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-waiting-title"
      aria-describedby="payment-waiting-message"
      aria-busy={!isFailed}
    >
      <div
        className="absolute inset-0 bg-[#050505]/88 backdrop-blur-sm"
        aria-hidden
      />

      <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#0a0a0a] p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border bg-white/5",
              isFailed ? "border-red-400/30" : "border-white/10",
            )}
            aria-hidden
          >
            {isFailed ? (
              <AlertCircle className="h-5 w-5 text-red-400" />
            ) : (
              <Loader2 className="h-5 w-5 animate-spin text-[#feac00]" />
            )}
          </div>

          <div className="min-w-0 flex-1 pt-0.5">
            <p
              className={cn(
                "text-[11px] uppercase tracking-[0.28em]",
                isFailed ? "text-red-400/80" : "text-white/40",
              )}
            >
              {isFailed ? "Échec" : "Paiement"}
            </p>
            <h2
              id="payment-waiting-title"
              className="mt-1 font-[family-name:var(--font-anton)] text-2xl uppercase leading-[0.95] text-white sm:text-[1.65rem]"
            >
              {title}
            </h2>
          </div>
        </div>

        <p
          id="payment-waiting-message"
          className="mt-5 text-sm leading-relaxed text-white/55"
        >
          {message}
        </p>

        {reference ? (
          <div className="mt-5 flex items-center justify-between gap-4 border-t border-white/10 pt-4">
            <span className="shrink-0 text-[11px] uppercase tracking-[0.22em] text-white/40">
              Référence
            </span>
            <span className="truncate font-mono text-sm text-white/75">
              {reference}
            </span>
          </div>
        ) : null}

        {!isFailed ? (
          <div className="mt-6 overflow-hidden rounded-full bg-white/10">
            <div className="payment-waiting-bar h-0.5 w-2/5 rounded-full bg-[#feac00]" />
          </div>
        ) : null}

        {showCancel && onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="mt-6 w-full rounded-full border border-white/15 px-6 py-3 text-xs font-medium uppercase tracking-widest text-white/65 transition hover:border-white/25 hover:text-white"
          >
            {cancelLabel}
          </button>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
