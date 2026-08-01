"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { LandingLoader } from "@/components/landing/LandingLoader";

type SiteLoaderContextValue = {
  setPageReady: (ready: boolean) => void;
};

const SiteLoaderContext = createContext<SiteLoaderContextValue | null>(null);

export function useSiteLoaderReady(ready: boolean) {
  const context = useContext(SiteLoaderContext);

  useEffect(() => {
    if (!context) return;
    context.setPageReady(ready);
    return () => context.setPageReady(false);
  }, [context, ready]);
}

export function SiteLoaderProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [loaderVisible, setLoaderVisible] = useState(isHome);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [pageReady, setPageReady] = useState(false);

  useLayoutEffect(() => {
    // Full-page loader only on the home route. Other pages (streaming, etc.)
    // were getting stuck behind a black overlay on mobile when the exit
    // animation failed or pageReady raced to false.
    if (!isHome) {
      setLoaderVisible(false);
      setMinTimeElapsed(true);
      setPageReady(true);
      return;
    }

    setLoaderVisible(true);
    setMinTimeElapsed(false);
    setPageReady(false);
  }, [pathname, isHome]);

  useEffect(() => {
    if (!isHome) return;

    const timer = window.setTimeout(() => setMinTimeElapsed(true), 1200);
    const fallback = window.setTimeout(() => setPageReady(true), 8000);
    // Hard dismiss if GSAP exit never completes (common on some mobile browsers).
    const hardDismiss = window.setTimeout(() => setLoaderVisible(false), 10_000);

    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(fallback);
      window.clearTimeout(hardDismiss);
    };
  }, [pathname, isHome]);

  const handleLoaderExit = useCallback(() => {
    setLoaderVisible(false);
  }, []);

  const loaderReady = isHome && minTimeElapsed && pageReady;

  const value = useMemo(
    () => ({
      setPageReady,
    }),
    [],
  );

  return (
    <SiteLoaderContext.Provider value={value}>
      {isHome && loaderVisible ? (
        <LandingLoader ready={loaderReady} onExitComplete={handleLoaderExit} />
      ) : null}
      {children}
    </SiteLoaderContext.Provider>
  );
}
