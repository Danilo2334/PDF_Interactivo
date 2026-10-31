import { z } from "zod";
export const IMAGE_LIMIT = 5 * 1024 * 1024, VIDEO_LIMIT = 20 * 1024 * 1024;
export const MEDIA_BUCKET = "reinforcement-media";
export const MEDIA_DOMAINS = ["es.wikipedia.org", "en.wikipedia.org", "www.khanacademy.org", "es.khanacademy.org", "www.youtube.com", "youtube.com", "youtu.be"] as const;
export function allowedMediaUrl(value: string): string | null {
  try {
    if (value.length > 2000 || /[\u0000-\u0020\\]/.test(value)) return null;
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port || !MEDIA_DOMAINS.some(host => host === url.hostname)) return null;
    if (["youtu.be", "youtube.com", "www.youtube.com"].includes(url.hostname)) {
      const video = url.hostname === "youtu.be" ? url.pathname.slice(1) : url.pathname === "/watch" ? url.searchParams.get("v") : null;
      if (!video || !/^[a-zA-Z0-9_-]{11}$/.test(video)) return null;
      return "https://www.youtube.com/watch?v=" + video;
    }
    if (!/^\/wiki\/[^?#]+$/.test(url.pathname) && url.hostname.endsWith("wikipedia.org")) return null;
    if (url.search || url.hash) return null;
    return url.href;
  } catch { return null; }
}
export function mediaFileMetadata(file: { name: string; type: string; size: number }) {
  if (!file.size) return { error: "El archivo está vacío." } as const;
  if (!file.name || file.name.length > 120 || /[\/\\\u0000-\u001f]/.test(file.name)) return { error: "Usa un nombre de archivo válido de hasta 120 caracteres." } as const;
  const ext = file.name.split(".").at(-1)?.toLowerCase();
  const mime = ext === "png" ? "image/png" : ["jpg", "jpeg"].includes(ext ?? "") ? "image/jpeg" : ext === "mp4" ? "video/mp4" : null;
  if (!mime || file.type !== mime) return { error: "Solo se permiten PNG, JPEG o MP4 con extensión y tipo MIME coincidentes." } as const;
  const kind = mime.startsWith("image/") ? "image" : "video";
  if (file.size > (kind === "image" ? IMAGE_LIMIT : VIDEO_LIMIT)) return { error: kind === "image" ? "La imagen supera los 5 MB." : "El video supera los 20 MB." } as const;
  return { kind, mime, extension: mime === "image/jpeg" ? "jpg" : ext! } as const;
}
export const mediaInputSchema = z.object({ documentId: z.string().uuid(), reinforcementId: z.string().uuid(),
  approvedVersionId: z.string().uuid(), assetId: z.string().uuid(), title: z.string().trim().min(3).max(160),
  approved: z.literal(true), kind: z.enum(["image", "video", "link"]), url: z.string().max(2000).optional() }).strict();
export const mediaRecordSchema = z.object({ id: z.string().uuid(), reinforcement_id: z.string().uuid(),
  approved_version_id: z.string().uuid(), kind: z.enum(["image", "video", "link"]), title: z.string().min(3).max(160),
  file_name: z.string().nullable(), mime_type: z.string().nullable(), size_bytes: z.number().int().nonnegative(),
  url: z.string().nullable(), status: z.enum(["uploading", "approved", "removed"]), created_at: z.string(), approved_at: z.string().nullable() });
export type MediaRecord = z.infer<typeof mediaRecordSchema>;
