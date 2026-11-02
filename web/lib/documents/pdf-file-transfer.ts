import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { validatePdfFile } from "@/lib/validations/pdf-file";

export type PdfTransferProgress = { phase: "preparing" | "uploading" | "verifying"; percent?: number };
export class PdfTransferError extends Error {
  constructor(message: string, public status = 0) { super(message); }
}
const completedSchema = z.object({ state: z.literal("completed"), message: z.string(),
  project: z.object({ id: z.uuid() }).optional(), documentId: z.uuid().optional() });
const pendingSchema = z.object({ state: z.literal("pending"), upload: z.object({ bucket: z.literal("pdf-documents"), path: z.string() }) });
async function step(endpoint: string, body: unknown) {
  let response: Response;
  try { response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body), signal: AbortSignal.timeout(90000), cache: "no-store" }); }
  catch { throw new PdfTransferError("No se pudo confirmar la operación. Reintenta con el mismo PDF; se conservará la misma identidad."); }
  const result = await response.json().catch(() => { throw new PdfTransferError("No se pudo leer la confirmación. Conserva el PDF y reintenta."); });
  if (!response.ok) throw new PdfTransferError(typeof result.message === "string" ? result.message.slice(0, 500) : "No se pudo confirmar la operación. Reintenta.", response.status);
  return result;
}
function upload(url: string, key: string, token: string, file: File, progress: (value: PdfTransferProgress) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest(); xhr.open("POST", url); xhr.timeout = 180000;
    xhr.setRequestHeader("apikey", key); xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("Content-Type", "application/pdf"); xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = event => { if (event.lengthComputable && event.total > 0)
      progress({ phase: "uploading", percent: Math.min(100, Math.floor(event.loaded * 100 / event.total)) }); };
    xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("Transferencia sin confirmar"));
    xhr.onerror = xhr.onabort = xhr.ontimeout = () => reject(new Error("Transferencia sin confirmar")); xhr.send(file);
  });
}
export async function transferPdfFile({ endpoint, operationId, file, documentId, onProgress }: {
  endpoint: string; operationId: string; file: File; documentId?: string; onProgress: (value: PdfTransferProgress) => void;
}) {
  const validation = await validatePdfFile(file); if (!validation.valid) throw new PdfTransferError(validation.message, 422);
  onProgress({ phase: "preparing", percent: 0 });
  const hash = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  const metadata = { operationId, file: { name: file.name, type: file.type, size: file.size,
    sha256: Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, "0")).join("") },
    ...(documentId ? { documentId, confirmed: true } : {}) };
  function completed(value: unknown) {
    const result = completedSchema.safeParse(value);
    return result.success && (documentId ? result.data.documentId === operationId : result.data.project?.id === operationId) ? result.data : null;
  }
  const prepared = await step(endpoint, { ...metadata, action: "prepare" });
  const cached = completed(prepared); if (cached) return cached;
  const pending = pendingSchema.safeParse(prepared); if (!pending.success) throw new PdfTransferError("No se pudo preparar la transferencia privada del PDF.");
  const { data, error } = await createClient().auth.getSession();
  if (error || !data.session) throw new PdfTransferError("Tu sesión no está disponible. Inicia sesión antes de reintentar.", 401);
  const base = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!), key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const expectedPath = `${data.session.user.id}/${operationId}.pdf`;
  if (base.protocol !== "https:" || base.username || base.password || !key || pending.data.upload.path !== expectedPath)
    throw new PdfTransferError("El destino del PDF privado no es válido.");
  const url = new URL(`/storage/v1/object/pdf-documents/${expectedPath.split("/").map(encodeURIComponent).join("/")}`, base.origin);
  onProgress({ phase: "uploading", percent: 0 });
  try { await upload(url.href, key, data.session.access_token, file, onProgress); }
  catch { /* The response may be lost or the identical object already stored. Verify in the server before deciding. */ }
  onProgress({ phase: "verifying" });
  const saved = completed(await step(endpoint, { ...metadata, action: "complete" }));
  if (!saved) throw new PdfTransferError("No se confirmó el guardado. Reintenta con el mismo PDF y la misma operación.");
  return saved;
}
