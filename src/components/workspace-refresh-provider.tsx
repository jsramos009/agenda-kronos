"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";

const REFRESH_DEBOUNCE_MS = 300;
const REFRESH_COOLDOWN_MS = 1_500;

export function WorkspaceRefreshProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [hasRefreshed, setHasRefreshed] = useState(false);
  const [isPending, startTransition] = useTransition();
  const timerRef = useRef<number | null>(null);
  const lastRefreshRef = useRef(0);
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (!isPending && inFlightRef.current) inFlightRef.current = false;
  }, [isPending]);

  useEffect(() => {
    const requestRefresh = () => {
      if (document.visibilityState === "hidden" || inFlightRef.current) return;
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        const now = Date.now();
        if (inFlightRef.current || now - lastRefreshRef.current < REFRESH_COOLDOWN_MS) return;
        inFlightRef.current = true;
        lastRefreshRef.current = now;
        setHasRefreshed(true);
        startTransition(() => router.refresh());
      }, REFRESH_DEBOUNCE_MS);
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") requestRefresh();
    };

    window.addEventListener("focus", requestRefresh);
    window.addEventListener("online", requestRefresh);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.removeEventListener("focus", requestRefresh);
      window.removeEventListener("online", requestRefresh);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      inFlightRef.current = false;
    };
  }, [router, startTransition]);

  return <>{children}<span className="sr-only" role="status" aria-live="polite">{hasRefreshed ? (isPending ? "Reconectando…" : "Atualizado") : ""}</span></>;
}
