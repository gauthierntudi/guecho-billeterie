"use client";

import { useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { TicketType } from "@prisma/client";
import { TicketTypeCard } from "./TicketTypeCard";
import { TicketArcScroller, TicketArcItem } from "./TicketArcScroller";
import { CheckoutForm } from "./CheckoutForm";
import type { CartItem } from "@/types/ticketing";
import { useCurrency } from "@/contexts/CurrencyContext";
import { getTicketPrice } from "@/lib/pricing";
import { EVENT_DATE, EVENT_TIME } from "@/lib/event-meta";
import { cn, formatPrice } from "@/lib/utils";

gsap.registerPlugin(useGSAP, ScrollTrigger);

type TicketSelectorProps = {
  eventSlug: string;
  spectacleTickets: TicketType[];
  streamingTickets: TicketType[];
  leadSection?: boolean;
};

export function TicketSelector({
  eventSlug,
  spectacleTickets,
  streamingTickets,
  leadSection = false,
}: TicketSelectorProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const { currency } = useCurrency();

  useGSAP(
    () => {
      const titleTween = {
        y: 0,
        opacity: 1,
        duration: 0.8,
        ease: "power3.out",
        clearProps: "transform",
      };

      if (leadSection) {
        gsap.fromTo(
          ".ticket-section-title",
          { y: 40, opacity: 0 },
          { ...titleTween, delay: 0.15 },
        );
      } else {
        gsap.fromTo(".ticket-section-title", { y: 40, opacity: 0 }, {
          ...titleTween,
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 85%",
            once: true,
          },
        });
      }

      const cards = sectionRef.current?.querySelectorAll(
        ".ticket-type-card, .checkout-panel",
      );
      if (cards?.length) {
        gsap.fromTo(
          cards,
          { y: 36, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.55,
            stagger: 0.08,
            ease: "power3.out",
            clearProps: "transform",
            scrollTrigger: {
              trigger: sectionRef.current,
              start: leadSection ? "top 90%" : "top 85%",
              once: true,
            },
          },
        );
      }
    },
    { scope: sectionRef, dependencies: [leadSection] },
  );

  const allTickets = useMemo(
    () => [...spectacleTickets, ...streamingTickets],
    [spectacleTickets, streamingTickets],
  );

  const cartItems: CartItem[] = useMemo(() => {
    return allTickets
      .filter((ticket) => (cart[ticket.id] ?? 0) > 0)
      .map((ticket) => ({
        ticketTypeId: ticket.id,
        tier: ticket.tier,
        category: ticket.category,
        name: ticket.name,
        price: getTicketPrice(ticket, currency),
        currency,
        quantity: cart[ticket.id],
      }));
  }, [allTickets, cart, currency]);

  const total = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  function updateQuantity(ticketTypeId: string, quantity: number) {
    const ticket = allTickets.find((item) => item.id === ticketTypeId);
    if (!ticket) return;

    const available = ticket.quantity - ticket.soldCount;
    const clamped = Math.min(Math.max(0, quantity), available);

    setCart((prev) => {
      const next = { ...prev };
      if (clamped <= 0) {
        delete next[ticketTypeId];
      } else {
        next[ticketTypeId] = clamped;
      }
      return next;
    });
  }

  return (
    <section
      ref={sectionRef}
      id="billetterie"
      className={cn(
        "px-4 pb-16 sm:px-6 sm:pb-24",
        leadSection ? "pt-24 sm:pt-28 md:pt-32" : "border-t border-white/10 py-16 sm:py-24",
      )}
    >
      <div className="mx-auto w-full max-w-[90rem]">
        <div className="ticket-section-title mb-8 sm:mb-10 md:mb-14">
          <p className="text-[10px] uppercase tracking-[0.35em] text-amber-400 sm:text-xs">
            Billetterie
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-anton)] text-3xl uppercase leading-[0.95] sm:mt-4 sm:text-4xl md:text-5xl">
            {EVENT_DATE}
            <span className="mt-2 block text-amber-300/90">{EVENT_TIME}</span>
          </h2>
          <p className="mt-3 max-w-xl text-sm text-white/45 sm:mt-4">
            Sélectionnez vos billets spectacle ou streaming et ajustez les
            quantités avant de passer au paiement.
          </p>
        </div>

        <div className="flex flex-col gap-8 xl:flex-row xl:items-start xl:gap-5">
          <TicketArcScroller className="ticket-grid min-w-0">
            {allTickets.map((ticket) => (
              <TicketArcItem key={ticket.id} id={`ticket-${ticket.id}`}>
                <TicketTypeCard
                  ticket={ticket}
                  quantity={cart[ticket.id] ?? 0}
                  onQuantityChange={(qty) => updateQuantity(ticket.id, qty)}
                />
              </TicketArcItem>
            ))}
          </TicketArcScroller>

          <aside className="checkout-panel w-full shrink-0 xl:w-[360px] xl:sticky xl:top-28">
            <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur sm:p-6">
              <h3 className="font-[family-name:var(--font-anton)] text-sm uppercase tracking-[0.3em] text-white/50">
                Récapitulatif
              </h3>

              {cartItems.length === 0 ? (
                <p className="mt-4 text-sm text-white/40">
                  Aucun billet sélectionné.
                </p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {cartItems.map((item) => (
                    <li
                      key={item.ticketTypeId}
                      className="flex items-start justify-between gap-3 text-sm"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          document
                            .getElementById(`ticket-${item.ticketTypeId}`)
                            ?.scrollIntoView({
                              behavior: "smooth",
                              block: "center",
                            })
                        }
                        className="text-left text-white/90 underline-offset-2 hover:underline"
                      >
                        {item.name} × {item.quantity}
                      </button>
                      <span className="shrink-0 text-white/70">
                        {formatPrice(item.price * item.quantity, currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
                <span className="font-[family-name:var(--font-anton)] text-sm uppercase tracking-widest text-white/50">
                  Total
                </span>
                <span className="font-[family-name:var(--font-anton)] text-2xl uppercase leading-none text-amber-300">
                  {formatPrice(total, currency)}
                </span>
              </div>

              <CheckoutForm
                eventSlug={eventSlug}
                cartItems={cartItems}
                disabled={cartItems.length === 0}
                compact
              />
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
