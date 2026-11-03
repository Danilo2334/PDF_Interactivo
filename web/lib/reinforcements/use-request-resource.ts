"use client";

import { useCallback, useEffect, useState } from "react";
import { createRequestResource, type RequestResource } from "@/lib/reinforcements/request-resource";

export function useRequestResource<T>(url: string, active: boolean, parse: (body: unknown) => T, retainOnRefresh = false) {
  const [refresh, setRefresh] = useState(0);
  const key = `${url}:${refresh}`;
  const [state, setState] = useState<{ key: string; url: string; result: RequestResource<T> } | null>(null);
  useEffect(() => {
    const changed = (event: Event) => {
      const requestId: unknown = (event as CustomEvent).detail;
      if (typeof requestId === "string" && url.includes(`/reinforcement-requests/${requestId}/`)) setRefresh(value => value + 1);
    };
    window.addEventListener("reinforcement-review-updated", changed);
    return () => window.removeEventListener("reinforcement-review-updated", changed);
  }, [url]);
  useEffect(() => {
    if (!active) return;
    const reader = createRequestResource(url, parse, result => setState({ key, url, result }));
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
  // Editable review panels must stay mounted while refreshing this exact URL.
  // Never retain another request/document or suppress a failed access response.
  return { result: state && (state.key === key || retainOnRefresh && state.url === url) ? state.result : null,
    refresh: useCallback(() => setRefresh(value => value + 1), []) };
}
