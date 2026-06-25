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

function SiteLoaderAutoReady() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  useSiteLoaderReady(!isHome);
  return null;
}

export function SiteLoaderProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [loaderVisible, setLoaderVisible] = useState(true);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [pageReady, setPageReady] = useState(false);

  useLayoutEffect(() => {
    setLoaderVisible(true);
    setMinTimeElapsed(false);
    setPageReady(false);
  }, [pathname]);

  useEffect(() => {
    const timer = window.setTimeout(() => setMinTimeElapsed(true), 1200);
    const fallback = window.setTimeout(() => setPageReady(true), 8000);

    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(fallback);
    };
  }, [pathname]);

  const handleLoaderExit = useCallback(() => {
    setLoaderVisible(false);
  }, []);

  const loaderReady = minTimeElapsed && pageReady;

  const value = useMemo(
    () => ({
      setPageReady,
    }),
    [],
  );

  return (
    <SiteLoaderContext.Provider value={value}>
      {loaderVisible ? (
        <LandingLoader ready={loaderReady} onExitComplete={handleLoaderExit} />
      ) : null}
      <SiteLoaderAutoReady />
      {children}
    </SiteLoaderContext.Provider>
  );
}
