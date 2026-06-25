"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { CurrencySwitcher } from "@/components/layout/CurrencySwitcher";
import { Logo } from "@/components/brand/Logo";
import { DEFAULT_EVENT_SLUG } from "@/lib/site-config";

gsap.registerPlugin(useGSAP);

type SiteHeaderProps = {
  eventTitle?: string;
  ticketHref?: string;
};

export function SiteHeader({
  eventTitle,
  ticketHref = `/evenement/${DEFAULT_EVENT_SLUG}#billetterie`,
}: SiteHeaderProps) {
  const headerRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      gsap.fromTo(
        ".header-item",
        { y: -20, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.1,
          ease: "power3.out",
          clearProps: "transform",
        },
      );
    },
    { scope: headerRef },
  );

  useEffect(() => {
    const onScroll = () => {
      if (!headerRef.current) return;
      headerRef.current.dataset.scrolled = window.scrollY > 40 ? "true" : "false";
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      ref={headerRef}
      data-scrolled="false"
      className="fixed inset-x-0 top-0 z-50 border-b border-transparent px-6 py-4 transition data-[scrolled=true]:border-white/10 data-[scrolled=true]:bg-black/70 data-[scrolled=true]:backdrop-blur-xl md:py-5"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <Logo href="/" size="md" className="header-item" priority />
        {eventTitle && (
          <p className="header-item hidden text-xs uppercase tracking-[0.25em] text-white/50 md:block">
            {eventTitle}
          </p>
        )}
        <div className="header-item flex items-center gap-3">
          <CurrencySwitcher />
          <Link
            href={ticketHref}
            className="rounded-full bg-[#feac00] px-5 py-2.5 font-[family-name:var(--font-anton)] text-xs uppercase tracking-widest text-black transition hover:bg-[#ffb820]"
          >
            Billetterie
          </Link>
        </div>
      </div>
    </header>
  );
}
