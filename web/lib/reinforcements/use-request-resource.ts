"use client";

import { useCallback, useEffect, useState } from "react";
import { createRequestResource, type RequestResource } from "@/lib/reinforcements/request-resource";

export function useRequestResource<T>(url: string, active: boolean, parse: (body: unknown) => T) {
  const [refresh, setRefresh] = useState(0);
  const key = `${url}:${refresh}`;
  const [state, setState] = useState<{ key: string; result: RequestResource<T> } | null>(null);
  useEffect(() => {
    if (!active) return;
    const reader = createRequestResource(url, parse, result => setState({ key, result }));
    let cancelled = false;
    let timer: number | undefined;
    async function poll() {
      if (document.visibilityState === "visible") await reader.load();
      // Wait for the response before scheduling: slow requests must not be
      // aborted repeatedly by the refresh interval.
      if (!cancelled) timer = window.setTimeout(() => { void poll(); }, 10_000);
    }
    void poll();
    return () => { cancelled = true; window.clearTimeout(timer); reader.dispose(); };
  }, [url, key, active, parse]);
  return { result: state?.key === key ? state.result : null, refresh: useCallback(() => setRefresh(value => value + 1), []) };
}
