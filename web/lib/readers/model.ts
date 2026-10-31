import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import { quizContentSchema } from "@/lib/validations/quiz";
import { reinforcementContentSchema } from "@/lib/validations/reinforcement-request";
import { allowedMediaUrl } from "@/lib/validations/reinforcement-media";
import { readerViewSchema } from "@/lib/validations/reader";
import { visualContentSchema } from "@/lib/validations/visual";
import { summaryContentSchema } from "@/lib/validations/summary";
const uuid = z.string().uuid();
const media = z.object({ id: uuid, reinforcement_id: uuid, approved_version_id: uuid, document_id: uuid, owner_id: uuid,
  kind: z.enum(["image", "video", "link"]), title: z.string(), status: z.literal("approved"), storage_path: z.string().nullable(), url: z.string().nullable(), mime_type: z.string().nullable(), size_bytes: z.number().int().nonnegative() });
const item = z.object({ id: uuid, requestId: uuid, sourceVersionId: uuid, pageNumber: z.number().int().positive(), title: z.string(),
  content: z.record(z.string(), z.unknown()), selection: reinforcementContentSchema.shape.fragment, initialExpanded: z.boolean(), media: z.array(media),
  quiz: z.object({ id: uuid, version: z.number().int().positive(), content: quizContentSchema }).nullable() });
export const readerSnapshotSchema = z.object({ schemaVersion: z.literal(1), name: z.string(), requireIdentification: z.boolean().default(false),
  document: z.object({ id: uuid, storagePath: z.string(), name: z.string(), sizeBytes: z.number().int().positive() }), items: z.array(item).max(500) });
export type ReaderSnapshot = z.infer<typeof readerSnapshotSchema>;
export function readerObjectId(hash: string, type: "r" | "m" | "q", privateId: string) { return type + "_" + createHash("sha256").update(hash + ":" + type + ":" + privateId).digest("hex").slice(0, 32); }
export function readerProjection(snapshot: ReaderSnapshot, hash: string, privateTest: boolean) {
  return readerViewSchema.parse({ name: snapshot.name, version: 1, privateTest, items: snapshot.items.map(i => {
    // Explicit projection: no request, owner, document or version UUID; no quiz key or grading explanation.
    let selection: Record<string, unknown> | null = null;
    if (i.selection) { const { documentId: _documentId, ...fragment } = i.selection; void _documentId; selection = fragment; }
    return { id: readerObjectId(hash, "r", i.id), title: i.title, pageNumber: i.pageNumber, initialExpanded: i.initialExpanded,
      text: typeof i.content.text === "string" ? i.content.text : "", type: typeof i.content.type === "string" ? i.content.type : "explanation",
      visual: i.content.type === "visual" ? visualContentSchema.parse(i.content.visual) : null,
      summary: i.content.type === "summary" ? summaryContentSchema.parse(i.content.summary) : null,
      selection, media: i.media.map(m => ({ id: readerObjectId(hash, "m", m.id), kind: m.kind, title: m.title, url: m.kind === "link" ? allowedMediaUrl(m.url ?? "") : null })),
      quiz: i.quiz ? { id: readerObjectId(hash, "q", i.quiz.id), title: i.quiz.content.title, allowRetries: i.quiz.content.allowRetries,
        questions: i.quiz.content.questions.map(q => ({ prompt: q.prompt, options: [...q.options] })) } : null };
  }) });
}
export function validateSnapshotSources(snapshot: ReaderSnapshot, ownerId: string, documentId: string) {
  const safePath = (path: string) => path.startsWith(ownerId + "/") && !/[\\\u0000-\u001f]/.test(path) && !path.split("/").some(p => p === ".." || p === ".");
  if (snapshot.document.id !== documentId || !safePath(snapshot.document.storagePath)) throw Error("Foreign document snapshot");
  for (const i of snapshot.items) {
    if (i.selection && (i.selection.documentId !== documentId || i.selection.pageNumber !== i.pageNumber)) throw Error("Foreign selection");
    for (const m of i.media) if (m.owner_id !== ownerId || m.document_id !== documentId || m.reinforcement_id !== i.id || m.approved_version_id !== i.sourceVersionId || m.kind !== "link" && (!m.storage_path || !safePath(m.storage_path))) throw Error("Foreign media snapshot");
  }
}
