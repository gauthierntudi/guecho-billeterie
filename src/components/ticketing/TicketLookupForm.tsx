"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type { Value } from "react-phone-number-input";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Loader2, Mail, Pencil, Search, Smartphone, Ticket } from "lucide-react";
import type { SupportedCurrency } from "@/lib/pricing";
import { EVENT_DATE, EVENT_TIME, EVENT_VENUE } from "@/lib/event-meta";
import { EventMetaChip } from "./EventMetaChip";
import { TicketPassList } from "./TicketPassList";
import type { TicketPassItem } from "./TicketPassCard";
import { formatPrice, cn } from "@/lib/utils";
import { TelInput } from "./TelInput";

gsap.registerPlugin(useGSAP);

export type LookupOrder = {
  id: string;
  orderNumber: string;
  customerName: string;
  eventTitle: string;
  eventSlug: string;
  eventStartsAt: string;
  venue: string;
  totalAmount: number;
  currency: SupportedCurrency;
  tickets: TicketPassItem[];
};

type LookupMode = "phone" | "email";

export function TicketLookupForm() {
  const resultsRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<LookupMode>("phone");
  const [phone, setPhone] = useState<Value>();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<LookupOrder[] | null>(null);
  const [editingSearch, setEditingSearch] = useState(true);
  const [lastQuery, setLastQuery] = useState("");
  const [lastLookupMode, setLastLookupMode] = useState<LookupMode>("phone");

  const totalTickets =
    orders?.reduce((sum, order) => sum + order.tickets.length, 0) ?? 0;

  useGSAP(
    () => {
      if (!orders?.length) return;

      gsap.fromTo(
        ".lookup-result-block",
        { y: 28, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.65,
          stagger: 0.1,
          ease: "power3.out",
          clearProps: "transform",
        },
      );
    },
    { scope: resultsRef, dependencies: [orders] },
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setOrders(null);
    setEditingSearch(false);
    const query = mode === "phone" ? (phone ?? "") : email.trim();
    setLastQuery(query);
    setLastLookupMode(mode);

    try {
      const response = await fetch("/api/tickets/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "phone" ? { phone: phone ?? "" } : { email: email.trim() },
        ),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Recherche impossible. Réessayez.");
        setEditingSearch(true);
        return;
      }

      setOrders(data.orders ?? []);
    } catch {
      setError("Connexion impossible. Réessayez.");
      setEditingSearch(true);
    } finally {
      setSubmitting(false);
    }
  }

  function handleResetSearch() {
    setOrders(null);
    setError(null);
    setEditingSearch(true);
    setLastQuery("");
  }

  return (
    <div className="space-y-8">
      <form
        onSubmit={handleSubmit}
        className="max-w-xl rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur sm:p-6"
      >
        {editingSearch || !orders ? (
          <>
            <div className="flex items-start gap-4">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-amber-400/25 bg-amber-400/10"
                aria-hidden
              >
                {mode === "phone" ? (
                  <Smartphone className="h-5 w-5 text-amber-300" />
                ) : (
                  <Mail className="h-5 w-5 text-amber-300" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.28em] text-amber-400/90">
                  Accès billetterie
                </p>
                <h2 className="mt-1 font-[family-name:var(--font-anton)] text-xl uppercase leading-[0.95] text-white sm:text-2xl">
                  Retrouver vos billets
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-white/50">
                  Utilisez votre téléphone de contact ou l&apos;email utilisé
                  lors du paiement par carte.
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setMode("phone");
                  setError(null);
                }}
                className={cn(
                  "rounded-xl border px-3 py-2.5 text-[10px] uppercase tracking-wider transition",
                  mode === "phone"
                    ? "border-amber-400 bg-amber-400/10 text-amber-300"
                    : "border-white/10 text-white/50 hover:border-white/30",
                )}
              >
                Téléphone
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("email");
                  setError(null);
                }}
                className={cn(
                  "rounded-xl border px-3 py-2.5 text-[10px] uppercase tracking-wider transition",
                  mode === "email"
                    ? "border-amber-400 bg-amber-400/10 text-amber-300"
                    : "border-white/10 text-white/50 hover:border-white/30",
                )}
              >
                E-mail
              </button>
            </div>

            <div className="mt-4">
              {mode === "phone" ? (
                <>
                  <label
                    htmlFor="ticket-lookup-phone"
                    className="mb-2 block text-[11px] uppercase tracking-[0.22em] text-white/40"
                  >
                    Téléphone de contact
                  </label>
                  <div id="ticket-lookup-phone">
                    <TelInput
                      value={phone}
                      onChange={setPhone}
                      placeholder="Téléphone de contact"
                      required
                    />
                  </div>
                </>
              ) : (
                <>
                  <label
                    htmlFor="ticket-lookup-email"
                    className="mb-2 block text-[11px] uppercase tracking-[0.22em] text-white/40"
                  >
                    Adresse e-mail
                  </label>
                  <input
                    id="ticket-lookup-email"
                    type="email"
                    required
                    placeholder="vous@exemple.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none transition focus:border-amber-400/50"
                  />
                </>
              )}
            </div>

            <ul className="mt-4 space-y-1.5 text-xs leading-relaxed text-white/38">
              <li className="flex gap-2">
                <span className="text-amber-400/70" aria-hidden>
                  —
                </span>
                <span>QR codes en ligne — billets spectacle téléchargeables en PNG</span>
              </li>
              <li className="flex gap-2">
                <span className="text-amber-400/70" aria-hidden>
                  —
                </span>
                <span>Commandes payées uniquement</span>
              </li>
            </ul>
          </>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-white/40">
                {lastLookupMode === "phone"
                  ? "Téléphone recherché"
                  : "E-mail recherché"}
              </p>
              <p className="mt-1 font-mono text-sm text-white/80">{lastQuery}</p>
            </div>
            <button
              type="button"
              onClick={handleResetSearch}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-[10px] font-medium uppercase tracking-widest text-white/60 transition hover:border-white/20 hover:text-white"
            >
              <Pencil className="h-3.5 w-3.5" />
              Modifier
            </button>
          </div>
        )}

        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-300"
          >
            {error}
          </p>
        ) : null}

        {editingSearch || !orders ? (
          <button
            type="submit"
            disabled={
              submitting ||
              (mode === "phone" ? !phone : !email.trim() || !email.includes("@"))
            }
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-amber-400 px-6 py-4 font-[family-name:var(--font-anton)] text-sm uppercase tracking-widest text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Retrouver mes billets
          </button>
        ) : null}
      </form>

      {orders !== null ? (
        <div ref={resultsRef} className="space-y-8">
          {orders.length === 0 ? (
            <div className="lookup-result-block rounded-2xl border border-white/10 bg-white/5 px-6 py-14 text-center backdrop-blur sm:px-10">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5">
                <Ticket className="h-6 w-6 text-white/35" />
              </div>
              <p className="mt-5 font-[family-name:var(--font-anton)] text-2xl uppercase leading-[0.95] text-white">
                Aucun billet trouvé
              </p>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-white/50">
                Aucune commande payée n&apos;est associée à ces informations.
                Vérifiez votre téléphone de contact ou votre e-mail de
                paiement.
              </p>
              <button
                type="button"
                onClick={handleResetSearch}
                className="mt-8 inline-flex items-center justify-center rounded-full border border-white/15 px-6 py-3 text-xs font-medium uppercase tracking-widest text-white/70 transition hover:border-white/25 hover:text-white"
              >
                Nouvelle recherche
              </button>
            </div>
          ) : (
            <>
              <div className="lookup-result-block flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-amber-400">
                    Résultats
                  </p>
                  <h2 className="mt-2 font-[family-name:var(--font-anton)] text-3xl uppercase leading-[0.95] text-white md:text-4xl">
                    {totalTickets} billet{totalTickets > 1 ? "s" : ""}
                  </h2>
                  <p className="mt-2 text-sm text-white/45">
                    {orders.length} commande{orders.length > 1 ? "s" : ""}{" "}
                    payée{orders.length > 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              {orders.map((order, index) => (
                <section
                  key={order.id}
                  className={cn(
                    "lookup-result-block",
                    index > 0 && "border-t border-white/10 pt-12",
                  )}
                >
                  <div className="flex flex-col gap-8 xl:flex-row xl:items-start xl:gap-5">
                    <aside className="w-full shrink-0 xl:sticky xl:top-28 xl:w-[320px]">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur sm:p-6">
                        <p className="text-[11px] uppercase tracking-[0.28em] text-white/40">
                          {order.orderNumber}
                        </p>
                        <h3 className="mt-3 font-[family-name:var(--font-anton)] text-xl uppercase leading-[0.95] text-white md:text-2xl">
                          {order.eventTitle}
                        </h3>
                        <p className="mt-2 text-sm text-white/45">
                          {order.customerName}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <EventMetaChip tone="amber">{EVENT_DATE}</EventMetaChip>
                          <EventMetaChip tone="sky">{EVENT_TIME}</EventMetaChip>
                          <EventMetaChip tone="navy">{EVENT_VENUE}</EventMetaChip>
                        </div>

                        <div className="mt-5 space-y-2 border-t border-white/10 pt-4 text-sm">
                          <div className="flex items-center justify-between gap-3 text-white/55">
                            <span>Billets</span>
                            <span className="text-white/80">
                              {order.tickets.length}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-3">
                            <span className="text-xs uppercase tracking-widest text-white/50">
                              Total
                            </span>
                            <span className="font-[family-name:var(--font-anton)] text-xl uppercase leading-none text-amber-300">
                              {formatPrice(order.totalAmount, order.currency)}
                            </span>
                          </div>
                        </div>

                        <Link
                          href={`/evenement/${order.eventSlug}`}
                          className="mt-5 inline-flex w-full items-center justify-center rounded-full border border-white/10 px-5 py-3 text-[10px] font-medium uppercase tracking-widest text-white/60 transition hover:border-white/25 hover:text-white"
                        >
                          Voir l&apos;événement
                        </Link>
                      </div>
                    </aside>

                    <div className="min-w-0 flex-1">
                      <TicketPassList tickets={order.tickets} />
                    </div>
                  </div>
                </section>
              ))}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
