"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FLEXPAY_MOBILE_FIRST_POLL_DELAY_MS,
  FLEXPAY_MOBILE_MAX_WAIT_MS,
  FLEXPAY_MOBILE_POLL_INTERVAL_MS,
  type FlexPayCheckState,
} from "@/lib/flexpaie-polling";
import { PaymentWaitingModal } from "./PaymentWaitingModal";

type MobilePaymentPendingProps = {
  orderId: string;
  flexPayOrderNumber: string;
  message: string;
  onCancel?: () => void;
};

type CheckResponse = {
  state?: FlexPayCheckState;
  status?: string;
  message?: string;
};

export function MobilePaymentPending({
  orderId,
  flexPayOrderNumber,
  message,
  onCancel,
}: MobilePaymentPendingProps) {
  const router = useRouter();
  const [statusMessage, setStatusMessage] = useState(message);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let active = true;
    const startedAt = Date.now();

    function scheduleNextPoll(delay = FLEXPAY_MOBILE_POLL_INTERVAL_MS) {
      if (!active) return;
      window.setTimeout(poll, delay);
    }

    async function poll() {
      if (!active) return;

      if (Date.now() - startedAt >= FLEXPAY_MOBILE_MAX_WAIT_MS) {
        router.push(`/confirmation/${orderId}`);
        return;
      }

      if (Date.now() - startedAt >= 60_000) {
        setStatusMessage(
          "Confirmation en cours. Si le montant a été débité, ne quittez pas — vos billets seront débloqués dès validation.",
        );
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const params = new URLSearchParams({
          orderNumber: flexPayOrderNumber,
          orderId,
        });
        const response = await fetch(`/api/payments/flexpaie/check?${params}`, {
          signal: controller.signal,
        });
        const data = (await response.json()) as CheckResponse;

        if (!active) return;

        const state =
          data.state ??
          (data.status === "0" ? "success" : ("pending" as FlexPayCheckState));

        if (state === "success") {
          router.push(`/confirmation/${orderId}`);
          return;
        }

        if (state === "cancelled") {
          if (onCancel) {
            onCancel();
          } else {
            router.push(`/confirmation/${orderId}?status=cancel`);
          }
          return;
        }

        if (response.status === 503) {
          setStatusMessage(
            "Finalisation du paiement en cours. Ne fermez pas cette page.",
          );
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      }

      scheduleNextPoll();
    }

    scheduleNextPoll(FLEXPAY_MOBILE_FIRST_POLL_DELAY_MS);

    return () => {
      active = false;
      abortRef.current?.abort();
    };
  }, [flexPayOrderNumber, onCancel, orderId, router]);

  function handleClose() {
    abortRef.current?.abort();

    if (onCancel) {
      onCancel();
      return;
    }

    router.push(`/confirmation/${orderId}?status=cancel`);
  }

  return (
    <PaymentWaitingModal
      open
      title="Validez sur votre téléphone"
      message={statusMessage}
      reference={flexPayOrderNumber}
      onCancel={handleClose}
      cancelLabel="Annuler"
    />
  );
}
