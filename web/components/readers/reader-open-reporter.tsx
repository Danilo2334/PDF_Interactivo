"use client";
import { useEffect, useRef, useState } from "react";
export function ReaderOpenReporter({ endpoint, ready, privateTest }: { endpoint: string; ready: boolean; privateTest: boolean }) {
  const [operationId] = useState(() => crypto.randomUUID());
  const reported = useRef(false);
  useEffect(() => {
    if (!ready || privateTest) return;
    const controller = new AbortController();
    let sending = false;
    async function record() {
      if (reported.current || sending || document.visibilityState !== "visible" || controller.signal.aborted) return;
      sending = true;
      const send = async () => {
        for (let attempt = 0; attempt < 2 && !controller.signal.aborted; attempt++) {
          try {
            const response = await fetch(endpoint + "/visits", { method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ operationId }), cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]) });
            if (response.ok) { reported.current = true; return; }
            if (response.status < 500) return;
          } catch { if (controller.signal.aborted) return; }
        }
      };
      try {
        // Serializing the first cookie creation also covers two newly opened tabs.
        if (navigator.locks) await navigator.locks.request("pdf-interactivo-reader-open", { signal: controller.signal }, send);
        else await send();
      } catch { /* Visit reporting must never block reading. */ }
      finally { sending = false; }
    }
    void record();
    document.addEventListener("visibilitychange", record);
    return () => { controller.abort(); document.removeEventListener("visibilitychange", record); };
  }, [endpoint, ready, privateTest, operationId]);
  return null;
}
