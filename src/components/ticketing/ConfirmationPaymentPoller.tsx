"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  FLEXPAY_CONFIRMATION_POLL_MAX_MS,
  FLEXPAY_MOBILE_FIRST_POLL_DELAY_MS,
  FLEXPAY_MOBILE_POLL_INTERVAL_MS,
  type FlexPayCheckState,
} from "@/lib/flexpaie-polling";

type ConfirmationPaymentPollerProps = {
  orderId: string;
  flexPayOrderNumber: string;
};

type CheckResponse = {
  state?: FlexPayCheckState;
};

export function ConfirmationPaymentPoller({
  orderId,
  flexPayOrderNumber,
}: ConfirmationPaymentPollerProps) {
  const router = useRouter();
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

      if (Date.now() - startedAt >= FLEXPAY_CONFIRMATION_POLL_MAX_MS) {
        return;
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

        if (data.state === "success") {
          router.refresh();
          return;
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
  }, [flexPayOrderNumber, orderId, router]);

  return null;
}
