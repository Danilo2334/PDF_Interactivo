import "server-only";
import { readSmallJson } from "@/lib/reinforcements/request-service";
import { isSameOriginMutation } from "@/lib/documents/mutation-request";
import { readerIdentitySchema } from "@/lib/validations/reader";
import { readerProjection, readerObjectId } from "@/lib/readers/model";
import { hasReaderSession, getReaderSession, createReaderSession, attachReaderCookie } from "@/lib/readers/session";
import { loadReader, ReaderUnavailable } from "@/lib/readers/repository";
const safeHeaders = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow", "Cross-Origin-Resource-Policy": "same-origin" };
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: safeHeaders });
const failure = (error: unknown) => reply({ message: error instanceof ReaderUnavailable ? error.message : "No fue posible consultar esta experiencia. Reintenta." }, error instanceof ReaderUnavailable ? error.status : 503);
export async function getReader(request: Request, token: string) {
  try {
    const context = await loadReader(request, token);
    if (context.snapshot.requireIdentification && !hasReaderSession(request, token)) return reply({ state: "identification_required", name: context.snapshot.name, version: context.version, privateTest: context.privateTest });
    const view = readerProjection(context.snapshot, context.hash, context.privateTest); view.version = context.version;
    const response = reply({ state: "ready", view });
    if (!getReaderSession(request, token)) attachReaderCookie(response, request, token, createReaderSession(token, { name: "", email: "" }));
    return response;
  } catch (error) { return failure(error); }
}
export async function identifyReader(request: Request, token: string) {
  if (!isSameOriginMutation(request)) return reply({ message: "Origen de la solicitud no permitido." }, 403);
  try {
    const context = await loadReader(request, token); // Identification cannot make a private/expired publication readable.
    if (!context.snapshot.requireIdentification) return reply({ identified: true });
    const input = await readSmallJson(request, 1500); if (input.response) return input.response;
    const parsed = readerIdentitySchema.safeParse(input.body); if (!parsed.success) return reply({ message: "Indica un nombre de al menos dos caracteres o un correo válido." }, 400);
    const response = reply({ identified: true });
    attachReaderCookie(response, request, token, createReaderSession(token, parsed.data, Date.now(), getReaderSession(request, token)));
    return response;
  } catch (error) { return failure(error); }
}
export async function getReaderAsset(request: Request, token: string, assetId: string) {
  try {
    const context = await loadReader(request, token);
    if (context.snapshot.requireIdentification && !hasReaderSession(request, token)) return reply({ message: "Completa la identificación solicitada para consultar esta experiencia." }, 403);
    let path = context.snapshot.document.storagePath, bucket = "pdf-documents", mime = "application/pdf", size = context.snapshot.document.sizeBytes;
    if (assetId !== "pdf") {
      const media = context.snapshot.items.flatMap(i => i.media).find(m => readerObjectId(context.hash, "m", m.id) === assetId);
      if (!media || media.kind === "link" || !media.storage_path || !media.mime_type || !["image/png", "image/jpeg", "video/mp4"].includes(media.mime_type)) throw new ReaderUnavailable();
      path = media.storage_path; bucket = "reinforcement-media"; mime = media.mime_type; size = media.size_bytes;
    }
    const range = request.headers.get("range");
    if (range && !/^bytes=(?:\d+-\d*|-\d+)$/.test(range)) return new Response(null, { status: 416, headers: { ...safeHeaders, "Content-Range": `bytes */${size}` } });
    const signed = await context.db.storage.from(bucket).createSignedUrl(path, 30); if (signed.error) throw new ReaderUnavailable(503); const signedUrl = signed.data?.signedUrl;
    if (!signedUrl) throw new ReaderUnavailable(503);
    const response = await fetch(signedUrl, { headers: range ? { Range: range } : {}, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(30000) });
    if (response.status === 416) return new Response(null, { status: 416, headers: { ...safeHeaders, "Content-Range": `bytes */${size}` } });
    if (![200, 206].includes(response.status) || !response.body) throw new ReaderUnavailable(503);
    const headers = new Headers({ ...safeHeaders, "Content-Type": mime, "Content-Disposition": "inline", "Accept-Ranges": "bytes" });
    for (const name of ["Content-Length", "Content-Range"]) if (response.headers.has(name)) headers.set(name, response.headers.get(name)!);
    return new Response(response.body, { status: response.status, headers });
  } catch (error) { return failure(error); }
}
