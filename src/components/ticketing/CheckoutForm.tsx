"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type { Value } from "react-phone-number-input";
import type { CartItem } from "@/types/ticketing";
import type { FlexPayPaymentType } from "@/lib/flexpaie";
import { ArrowLeft, CreditCard, Smartphone } from "lucide-react";
import { CardPaymentRedirect } from "./CardPaymentRedirect";
import { MobilePaymentPending } from "./MobilePaymentPending";
import { PaymentWaitingModal } from "./PaymentWaitingModal";
import { TelInput } from "./TelInput";

type CheckoutFormProps = {
  eventSlug: string;
  cartItems: CartItem[];
  disabled: boolean;
  compact?: boolean;
};

type CheckoutStep = "info" | "payment";

type CardRedirectState = {
  url: string;
  params: Record<string, string>;
};

type MobilePendingState = {
  orderId: string;
  flexPayOrderNumber: string;
  message: string;
};

export function CheckoutForm({
  eventSlug,
  cartItems,
  disabled,
  compact = false,
}: CheckoutFormProps) {
  const abortRef = useRef<AbortController | null>(null);
  const [step, setStep] = useState<CheckoutStep>("info");
  const [name, setName] = useState("");
  const [contactPhone, setContactPhone] = useState<Value>();
  const [email, setEmail] = useState("");
  const [paymentPhone, setPaymentPhone] = useState<Value>();
  const [paymentType, setPaymentType] = useState<FlexPayPaymentType>("1");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardRedirect, setCardRedirect] = useState<CardRedirectState | null>(
    null,
  );
  const [mobilePending, setMobilePending] =
    useState<MobilePendingState | null>(null);

  function handleContinueToPayment(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setStep("payment");
  }

  async function handleSubmitPayment(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMobilePending(null);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          eventSlug,
          customerName: name,
          customerEmail: paymentType === "2" ? email.trim() : "",
          customerPhone: contactPhone ?? "",
          paymentPhone:
            paymentType === "1" ? (paymentPhone ?? "") : undefined,
          paymentType,
          currency: cartItems[0]?.currency ?? "CDF",
          items: cartItems.map((item) => ({
            ticketTypeId: item.ticketTypeId,
            quantity: item.quantity,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Erreur lors de la commande");
        return;
      }

      if (data.mode === "card") {
        setCardRedirect({
          url: data.redirectUrl,
          params: data.redirectParams,
        });
        return;
      }

      if (data.mode === "mobile") {
        setMobilePending({
          orderId: data.orderId,
          flexPayOrderNumber: data.flexPayOrderNumber,
          message: data.message,
        });
      }
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") {
        setError("Paiement annulé.");
        return;
      }
      setError("Connexion impossible. Réessayez.");
    } finally {
      setSubmitting(false);
      abortRef.current = null;
    }
  }

  function handleCancelSubmit() {
    abortRef.current?.abort();
    setSubmitting(false);
  }

  function handleCancelMobilePending() {
    const pending = mobilePending;
    setMobilePending(null);
    setError(null);

    if (pending) {
      void fetch(`/api/orders/${pending.orderId}/cancel`, { method: "POST" });
    }
  }

  if (cardRedirect) {
    return (
      <CardPaymentRedirect
        url={cardRedirect.url}
        params={cardRedirect.params}
      />
    );
  }

  const inputClass = compact
    ? "w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none transition focus:border-amber-400/50 xl:px-3 xl:py-2.5 xl:text-xs"
    : "w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none transition focus:border-amber-400/50";

  const labelClass =
    "mb-2 block text-[11px] uppercase tracking-[0.22em] text-white/40";

  const canContinueToPayment = Boolean(name.trim() && contactPhone);
  const canSubmitPayment =
    paymentType === "1"
      ? Boolean(paymentPhone)
      : Boolean(email.trim() && email.includes("@"));

  return (
    <>
      {mobilePending ? (
        <MobilePaymentPending
          key={`${mobilePending.orderId}-${mobilePending.flexPayOrderNumber}`}
          {...mobilePending}
          onCancel={handleCancelMobilePending}
        />
      ) : null}

      <PaymentWaitingModal
        open={submitting}
        title="Préparation du paiement"
        message="Nous créons votre commande et contactons l'opérateur de paiement. Ne fermez pas cette page."
        onCancel={handleCancelSubmit}
      />

      <div
        className={
          compact
            ? "mt-4 flex flex-1 flex-col space-y-3 xl:space-y-3"
            : "mt-6 space-y-4"
        }
      >
        <div className="flex items-center gap-3">
          <span
            className={`text-[10px] uppercase tracking-[0.24em] ${
              step === "info" ? "text-amber-400" : "text-white/35"
            }`}
          >
            1. Informations
          </span>
          <span className="h-px flex-1 bg-white/10" aria-hidden />
          <span
            className={`text-[10px] uppercase tracking-[0.24em] ${
              step === "payment" ? "text-amber-400" : "text-white/35"
            }`}
          >
            2. Paiement
          </span>
        </div>

        {step === "info" ? (
          <form onSubmit={handleContinueToPayment} className="space-y-4">
            <div>
              <label htmlFor="checkout-name" className={labelClass}>
                Nom complet
              </label>
              <input
                id="checkout-name"
                type="text"
                required
                placeholder="Nom complet"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="checkout-contact-phone" className={labelClass}>
                Téléphone de contact
              </label>
              <p className="mb-2 text-xs leading-relaxed text-white/38">
                Ce numéro sera associé à vos billets et pour retrouver vos
                passes sur la page Mes billets.
              </p>
              <div id="checkout-contact-phone">
                <TelInput
                  value={contactPhone}
                  onChange={setContactPhone}
                  compact={compact}
                  placeholder="Téléphone de contact"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={disabled || !canContinueToPayment}
              className={
                compact
                  ? "flex w-full touch-manipulation items-center justify-center gap-2 rounded-full bg-amber-400 px-6 py-4 font-[family-name:var(--font-anton)] text-sm uppercase tracking-widest text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40 xl:px-4 xl:py-3 xl:text-xs"
                  : "flex w-full touch-manipulation items-center justify-center gap-2 rounded-full bg-amber-400 px-6 py-4 font-[family-name:var(--font-anton)] text-sm uppercase tracking-widest text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
              }
            >
              Suivant
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmitPayment} className="space-y-4">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setStep("info");
              }}
              className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-white/45 transition hover:text-white/75"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Modifier mes informations
            </button>

            <div>
              <p className={labelClass}>Moyen de paiement</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentType("1");
                    setError(null);
                  }}
                  className={`flex touch-manipulation items-center justify-center gap-2 rounded-xl border px-3 py-3 text-xs uppercase tracking-wider transition xl:gap-1.5 xl:px-2 xl:py-2.5 xl:text-[10px] ${
                    paymentType === "1"
                      ? "border-amber-400 bg-amber-400/10 text-amber-300"
                      : "border-white/10 text-white/50 hover:border-white/30"
                  }`}
                >
                  <Smartphone className="h-4 w-4 xl:h-3.5 xl:w-3.5" />
                  Mobile Money
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentType("2");
                    setError(null);
                  }}
                  className={`flex touch-manipulation items-center justify-center gap-2 rounded-xl border px-3 py-3 text-xs uppercase tracking-wider transition xl:gap-1.5 xl:px-2 xl:py-2.5 xl:text-[10px] ${
                    paymentType === "2"
                      ? "border-amber-400 bg-amber-400/10 text-amber-300"
                      : "border-white/10 text-white/50 hover:border-white/30"
                  }`}
                >
                  <CreditCard className="h-4 w-4 xl:h-3.5 xl:w-3.5" />
                  Carte
                </button>
              </div>
            </div>

            {paymentType === "1" ? (
              <div>
                <label htmlFor="checkout-payment-phone" className={labelClass}>
                  Numéro Mobile Money
                </label>
                <p className="mb-2 text-xs leading-relaxed text-white/38">
                  Le push de paiement sera envoyé sur ce numéro. Il peut être
                  différent de votre téléphone de contact.
                </p>
                <div id="checkout-payment-phone">
                  <TelInput
                    value={paymentPhone}
                    onChange={setPaymentPhone}
                    compact={compact}
                    placeholder="Numéro Mobile Money"
                    required
                  />
                </div>
              </div>
            ) : (
              <div>
                <label htmlFor="checkout-email" className={labelClass}>
                  Adresse e-mail
                </label>
                <p className="mb-2 text-xs leading-relaxed text-white/38">
                  Requise pour le paiement par carte. Vous pourrez aussi
                  retrouver vos billets avec cette adresse.
                </p>
                <input
                  id="checkout-email"
                  type="email"
                  required
                  placeholder="vous@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                />
              </div>
            )}

            {error ? (
              <p className="text-sm text-red-400 xl:text-xs">{error}</p>
            ) : null}

            <button
              type="submit"
              disabled={disabled || submitting || !canSubmitPayment}
              className={
                compact
                  ? "flex w-full touch-manipulation items-center justify-center gap-2 rounded-full bg-amber-400 px-6 py-4 font-[family-name:var(--font-anton)] text-sm uppercase tracking-widest text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40 xl:px-4 xl:py-3 xl:text-xs"
                  : "flex w-full touch-manipulation items-center justify-center gap-2 rounded-full bg-amber-400 px-6 py-4 font-[family-name:var(--font-anton)] text-sm uppercase tracking-widest text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
              }
            >
              Procéder au paiement
            </button>
          </form>
        )}

        <p className="text-center text-xs text-white/30 xl:text-[10px]">
          Paiement sécurisé — Mobile Money & cartes
        </p>
        <p className="text-center text-xs text-white/30 xl:text-[10px]">
          <Link
            href="/mes-billets"
            className="underline decoration-white/20 underline-offset-2 transition hover:text-white/50"
          >
            Retrouver mes billets
          </Link>
        </p>
      </div>
    </>
  );
}
