"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useRef,
  type ReactElement,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

type TicketArcScrollerProps = {
  children: ReactNode;
  className?: string;
};

const MOBILE_MQ = "(max-width: 639px)";
const LOOP_CLONES = 2;

function getCenteredIndex(scrollEl: HTMLElement) {
  const items = scrollEl.querySelectorAll<HTMLElement>("[data-carousel-item]");
  const centerX =
    scrollEl.getBoundingClientRect().left + scrollEl.clientWidth / 2;

  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  items.forEach((item, index) => {
    const rect = item.getBoundingClientRect();
    const itemCenter = rect.left + rect.width / 2;
    const distance = Math.abs(itemCenter - centerX);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });

  return bestIndex;
}

function scrollItemToCenter(
  scrollEl: HTMLElement,
  index: number,
  behavior: ScrollBehavior = "auto",
) {
  const item = scrollEl.querySelectorAll<HTMLElement>("[data-carousel-item]")[index];
  if (!item) return;

  item.scrollIntoView({
    behavior,
    inline: "center",
    block: "nearest",
  });
}

function updateActiveItem(scrollEl: HTMLElement) {
  const centeredIndex = getCenteredIndex(scrollEl);
  scrollEl.querySelectorAll<HTMLElement>("[data-carousel-item]").forEach((item, index) => {
    item.dataset.carouselActive = index === centeredIndex ? "true" : "false";
  });
}

function wrapLoopChild(
  child: ReactNode,
  key: string,
  cloneSide: "lead" | "trail" | null,
) {
  if (!isValidElement(child)) return child;

  const element = child as ReactElement<{
    id?: string;
    cloneSide?: "lead" | "trail" | null;
  }>;

  return cloneElement(element, {
    key,
    id: cloneSide ? undefined : element.props.id,
    cloneSide,
  });
}

function buildLoopedChildren(children: ReactNode) {
  const childArray = Children.toArray(children);
  if (childArray.length < 2) return childArray;

  const lead = childArray
    .slice(-LOOP_CLONES)
    .map((child, index) => wrapLoopChild(child, `carousel-lead-${index}`, "lead"));
  const trail = childArray
    .slice(0, LOOP_CLONES)
    .map((child, index) => wrapLoopChild(child, `carousel-trail-${index}`, "trail"));

  return [...lead, ...childArray, ...trail];
}

export function TicketArcScroller({
  children,
  className,
}: TicketArcScrollerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const jumpingRef = useRef(false);
  const scrollEndTimerRef = useRef<number | null>(null);
  const initializedRef = useRef(false);

  const realCount = Children.count(children);
  const mobileItems =
    realCount >= 2 ? buildLoopedChildren(children) : Children.toArray(children);

  const handleLoopJump = useCallback(() => {
    const scrollEl = scrollRef.current;
    if (
      !scrollEl ||
      !window.matchMedia(MOBILE_MQ).matches ||
      realCount < 2 ||
      jumpingRef.current
    ) {
      return;
    }

    const centeredIndex = getCenteredIndex(scrollEl);
    const lead = LOOP_CLONES;
    const trailStart = lead + realCount;

    if (centeredIndex < lead) {
      jumpingRef.current = true;
      scrollItemToCenter(scrollEl, centeredIndex + realCount, "auto");
      window.setTimeout(() => {
        jumpingRef.current = false;
        updateActiveItem(scrollEl);
      }, 80);
      return;
    }

    if (centeredIndex >= trailStart) {
      jumpingRef.current = true;
      scrollItemToCenter(scrollEl, centeredIndex - realCount, "auto");
      window.setTimeout(() => {
        jumpingRef.current = false;
        updateActiveItem(scrollEl);
      }, 80);
    }
  }, [realCount]);

  const scheduleLoopCheck = useCallback(() => {
    if (jumpingRef.current) return;

    if (scrollEndTimerRef.current !== null) {
      window.clearTimeout(scrollEndTimerRef.current);
    }
    scrollEndTimerRef.current = window.setTimeout(() => {
      scrollEndTimerRef.current = null;
      handleLoopJump();
    }, 160);
  }, [handleLoopJump]);

  const initScrollPosition = useCallback(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl || !window.matchMedia(MOBILE_MQ).matches || realCount < 2) {
      return;
    }
    scrollItemToCenter(scrollEl, LOOP_CLONES, "auto");
    updateActiveItem(scrollEl);
  }, [realCount]);

  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    const mq = window.matchMedia(MOBILE_MQ);

    const onResize = () => {
      if (!mq.matches) return;
      initScrollPosition();
    };

    const onScroll = () => {
      if (jumpingRef.current) return;
      updateActiveItem(scrollEl);
      scheduleLoopCheck();
    };

    const onScrollEnd = () => {
      if (!jumpingRef.current) {
        handleLoopJump();
        updateActiveItem(scrollEl);
      }
    };

    scrollEl.addEventListener("scroll", onScroll, { passive: true });
    scrollEl.addEventListener("scrollend", onScrollEnd);
    window.addEventListener("resize", onResize);
    mq.addEventListener("change", onResize);

    if (mq.matches && !initializedRef.current) {
      initializedRef.current = true;
      requestAnimationFrame(() => {
        requestAnimationFrame(initScrollPosition);
      });
    }

    return () => {
      scrollEl.removeEventListener("scroll", onScroll);
      scrollEl.removeEventListener("scrollend", onScrollEnd);
      window.removeEventListener("resize", onResize);
      mq.removeEventListener("change", onResize);
      if (scrollEndTimerRef.current !== null) {
        window.clearTimeout(scrollEndTimerRef.current);
      }
    };
  }, [scheduleLoopCheck, handleLoopJump, initScrollPosition]);

  return (
    <div
      ref={scrollRef}
      className={cn(
        "ticket-carousel scrollbar-hide -mx-4 flex snap-x snap-mandatory gap-3",
        "max-sm:touch-pan-x max-sm:overflow-x-auto",
        "max-sm:px-[max(1rem,calc(50%-min(31vw,92.5px)))]",
        "max-sm:pb-2 max-sm:pt-2",
        "max-sm:[scroll-padding-inline:calc(50%-min(31vw,92.5px))]",
        "sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:items-stretch sm:overflow-visible sm:gap-4 sm:px-0 sm:pb-0 sm:pt-0 lg:grid-cols-4 xl:flex-1",
        className,
      )}
    >
      {mobileItems}
    </div>
  );
}

export function TicketArcItem({
  children,
  className,
  id,
  cloneSide = null,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  cloneSide?: "lead" | "trail" | null;
}) {
  return (
    <div
      id={id}
      data-carousel-item
      data-carousel-clone={cloneSide ?? undefined}
      aria-hidden={cloneSide ? true : undefined}
      className={cn(
        "w-[min(62vw,185px)] shrink-0 snap-center",
        "max-sm:[&[data-carousel-active=true]_.ticket-type-card]:ring-2 max-sm:[&[data-carousel-active=true]_.ticket-type-card]:ring-white/40",
        "sm:w-auto sm:min-w-0",
        cloneSide && "sm:!hidden",
        className,
      )}
    >
      {children}
    </div>
  );
}
