export type RequestResource<T> = { value: T; error?: never } | { value?: never; error: string };

// Abort superseded requests and also guard the response generation: transports
// and test doubles can finish after cancellation or a document/filter change.
export function createRequestResource<T>(url: string, parse: (value: unknown) => T,
  publish: (result: RequestResource<T>) => void, transport: typeof fetch = fetch) {
  let generation = 0, disposed = false;
  let controller: AbortController | null = null;
  return {
    async load() {
      if (disposed) return;
      controller?.abort(); controller = new AbortController();
      const current = ++generation;
      try {
        const response = await transport(url, { cache: "no-store", signal: controller.signal });
        const body = await response.json();
        if (!response.ok) throw new Error(typeof body.message === "string" ? body.message : "No fue posible consultar las solicitudes.");
        const value = parse(body);
        if (!disposed && current === generation) publish({ value });
      } catch (error) {
        if (!disposed && current === generation) publish({ error: error instanceof Error && error.name === "Error" ? error.message
          : "No fue posible actualizar esta vista. Comprueba tu conexión e inténtalo de nuevo." });
      }
    },
    dispose() { disposed = true; generation++; controller?.abort(); },
  };
}
