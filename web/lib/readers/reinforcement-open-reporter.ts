// A bounded, in-memory queue. Neither reading nor opening a panel awaits analytics.
export function createReinforcementOpenReporter(endpoint: string, privateTest: boolean) {
  const controller = new AbortController();
  const queue: { operationId: string; items: { id: string; pageNumber: number }[] }[] = [];
  let visitId: string | null = null, sending = false, excluded = privateTest;
  async function flush() {
    if (sending || !visitId || excluded || controller.signal.aborted) return;
    sending = true;
    try {
      while (queue.length && !controller.signal.aborted) {
        const input = queue.shift()!;
        for (let attempt = 0; attempt < 2 && !controller.signal.aborted; attempt++) {
          try {
            const response = await fetch(endpoint + "/reinforcement-opens", { method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...input, visitId }), cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]) });
            if (response.ok || response.status < 500) break;
          } catch { if (controller.signal.aborted) break; }
        }
      }
    } finally { sending = false; }
  }
  return {
    opened(items: { id: string; pageNumber: number }[]) {
      if (excluded || !items.length || queue.length >= 50 || controller.signal.aborted) return;
      queue.push({ operationId: crypto.randomUUID(), items }); void flush();
    },
    acceptedVisit(id: string | null) { visitId = id; excluded = privateTest || id === null; if (excluded) queue.length = 0; else void flush(); },
    close() { controller.abort(); queue.length = 0; },
  };
}
