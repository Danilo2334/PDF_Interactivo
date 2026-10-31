export function isSameOriginMutation(request: Request) {
  return request.headers.get("origin") === new URL(request.url).origin;
}

export function databaseRolledBack(code?: string) {
  // Connection failures are ambiguous: never remove a PDF which might have
  // become current after a committed transaction whose response was lost.
  return code === "PT409" || code === "PGRST202" || Boolean(code && /^(22|23|40|42|P0)[A-Z0-9]{3}$/.test(code));
}
