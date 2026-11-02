import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { MEDIA_BUCKET, mediaFileMetadata, mediaInputSchema, mediaRecordSchema, type MediaRecord } from "@/lib/validations/reinforcement-media";

const receiptSchema = z.object({ upload: z.object({ bucket: z.literal(MEDIA_BUCKET), path: z.string() }), pendingItem: mediaRecordSchema });
async function jsonStep(endpoint: string, body: unknown) {
  const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body), signal: AbortSignal.timeout(90000), cache: "no-store" }).catch(() => {
    throw new Error("No se pudo confirmar la carga. Reintenta sin cambiar los datos; no se duplicará la operación.");
  });
  const result = await response.json().catch(() => { throw new Error("No se pudo leer la confirmación. Reintenta sin cambiar los datos."); });
  if (!response.ok) throw new Error(typeof result.message === "string" ? result.message.slice(0, 300) : "No se pudo confirmar el recurso. Reintenta sin cambiar los datos.");
  return result;
}

function uploadFile(url: string, key: string, token: string, file: File, progress: (percent: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url); xhr.timeout = 120000;
    xhr.setRequestHeader("apikey", key);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = event => { if (event.lengthComputable) progress(Math.min(100, Math.round(event.loaded * 100 / event.total))); };
    xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("Transferencia sin confirmar."));
    xhr.onerror = xhr.ontimeout = xhr.onabort = () => reject(new Error("Transferencia sin confirmar."));
    xhr.send(file);
  });
}

export async function transferMediaFile(endpoint: string, metadata: z.infer<typeof mediaInputSchema>, file: File,
  onProgress: (message: string) => void, onPrepared: (item: MediaRecord) => void): Promise<MediaRecord> {
  const checked = mediaFileMetadata(file);
  if (checked.error !== undefined || checked.kind !== metadata.kind) throw new Error(checked.error ?? "El tipo de recurso no coincide con el archivo.");
  onProgress("Comprobando el archivo…");
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  const descriptor = { name: file.name, type: file.type, size: file.size, sha256: Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, "0")).join("") };
  const prepared = await jsonStep(endpoint, { action: "prepare-file", metadata, file: descriptor });
  const existing = mediaRecordSchema.safeParse(prepared.item);
  if (existing.success && existing.data.id === metadata.assetId && existing.data.status === "approved") return existing.data;
  const receipt = receiptSchema.safeParse(prepared);
  if (!receipt.success || receipt.data.pendingItem.id !== metadata.assetId || receipt.data.pendingItem.status !== "uploading")
    throw new Error("No se pudo preparar la transferencia privada.");
  onPrepared(receipt.data.pendingItem);

  const { data, error } = await createClient().auth.getSession();
  if (error || !data.session) throw new Error("Tu sesión no está disponible. Inicia sesión nuevamente antes de reintentar.");
  // Only the configured Supabase origin receives this user's token. Never use
  // an arbitrary URL from a prepare response as the upload destination.
  const base = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!);
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const expected = `${data.session.user.id}/${metadata.assetId}.${checked.extension}`;
  if (base.protocol !== "https:" || base.username || base.password || !key || receipt.data.upload.path !== expected)
    throw new Error("El destino de la transferencia privada no es válido.");
  const url = new URL(`/storage/v1/object/${MEDIA_BUCKET}/${expected.split("/").map(encodeURIComponent).join("/")}`, base.origin);
  onProgress("Transfiriendo archivo: 0 %");
  try { await uploadFile(url.href, key, data.session.access_token, file, percent => onProgress(`Transfiriendo archivo: ${percent} %`)); }
  catch {
    // A timeout, duplicate-object response or dropped response does not prove
    // the upload failed. The server checks the reserved object's actual bytes.
  }
  onProgress("Verificando y confirmando el archivo…");
  const completed = await jsonStep(endpoint, { action: "complete-file", metadata, file: descriptor });
  const result = mediaRecordSchema.safeParse(completed.item);
  if (!result.success || result.data.id !== metadata.assetId || result.data.status !== "approved")
    throw new Error("No se pudo confirmar la carga. Reintenta sin cambiar los datos; no se duplicará la operación.");
  return result.data;
}
