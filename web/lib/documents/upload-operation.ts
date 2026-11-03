type Storage = Pick<globalThis.Storage, "getItem" | "setItem" | "removeItem">;
const key = (ownerId: string) => `pdf-upload-operation:${ownerId}`;

export async function chooseUploadOperation(file: File, ownerId: string, storage: Storage | null) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const name = new TextEncoder().encode(JSON.stringify([file.name, file.size]));
  const input = new Uint8Array(name.length + bytes.length); input.set(name); input.set(bytes, name.length);
  const fingerprint = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", input)), n => n.toString(16).padStart(2, "0")).join("");
  try {
    const previous = JSON.parse(storage?.getItem(key(ownerId)) ?? "null");
    if (previous?.fingerprint === fingerprint && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(previous.operationId)) return previous.operationId as string;
  } catch { /* unavailable or corrupt browser storage never blocks a PDF */ }
  const operationId = crypto.randomUUID();
  try { storage?.setItem(key(ownerId), JSON.stringify({ fingerprint, operationId })); } catch { /* in-memory retry still works */ }
  return operationId;
}

export function clearUploadOperation(ownerId: string, storage: Storage | null) {
  try { storage?.removeItem(key(ownerId)); } catch { /* optional local recovery */ }
}
