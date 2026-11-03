export function isSameOriginMutation(request: Request) {
  const target = new URL(request.url);
  // Next's internal request URL can use its bind hostname. The incoming Host
  // remains the browser's target; never use a caller-supplied forwarded host.
  const host = request.headers.get("host");
  if (host) {
    try {
      const incoming = new URL(`${target.protocol}//${host}`);
      if (incoming.host !== host || incoming.pathname !== "/" || incoming.username || incoming.password) return false;
      target.host = incoming.host;
    } catch { return false; }
  }
  return request.headers.get("origin") === target.origin;
}

export function databaseRolledBack(code?: string) {
  // Connection failures are ambiguous: never remove a PDF which might have
  // become current after a committed transaction whose response was lost.
  return code === "PT409" || code === "PGRST202" || Boolean(code && /^(22|23|40|42|P0)[A-Z0-9]{3}$/.test(code));
}
