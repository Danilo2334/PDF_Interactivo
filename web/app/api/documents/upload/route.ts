import { createHash } from "node:crypto";
import { PDFDocument } from "pdf-lib";
import { z } from "zod";
import { checkPermission } from "@/lib/auth/access";
import { isSameOriginMutation } from "@/lib/documents/mutation-request";
import { signUploadProof, uploadFingerprint } from "@/lib/documents/upload-proof";
import { withOperationDiagnostics } from "@/lib/diagnostics/operation";
import { createClient } from "@/lib/supabase/server";
import { validatePdfFile } from "@/lib/validations/pdf-file";
import { directPdfUpload } from "@/lib/documents/direct-pdf-transfer";

const receiptSchema = z.object({ state: z.enum(["pending", "completed", "gone"]),
  project: z.object({ id: z.uuid(), name: z.string(), status: z.string() }).optional(),
  document: z.object({ id: z.uuid(), name: z.string(), size: z.number(), pageCount: z.number() }).optional() });
const reply = (message: string, status: number, code: string) => Response.json({ message, code }, { status });

async function upload(request: Request) {
  if (!isSameOriginMutation(request)) return reply("Solicitud no permitida.", 403, "ORIGIN_REJECTED");
  const access = await checkPermission("documents.manage.own");
  if (!access.ok) return reply(access.message, access.status, "ACCESS_REJECTED");
  if (request.headers.get("Content-Type")?.startsWith("application/json"))
    return directPdfUpload(request, await createClient(), access.userId);
  let form: FormData;
  try { form = await request.formData(); } catch { return reply("No fue posible leer la carga. Selecciona el PDF y reintenta.", 400, "INVALID_UPLOAD"); }
  const operation = z.uuid().safeParse(form.get("operationId"));
  if (!operation.success) return reply("Selecciona de nuevo el PDF para iniciar una carga válida.", 400, "INVALID_UPLOAD");
  const file = form.get("file");
  if (!(file instanceof File)) return reply("Selecciona el PDF que deseas cargar.", 400, "INVALID_UPLOAD");
  const validation = await validatePdfFile(file);
  if (!validation.valid) return reply(validation.message, validation.code === "FILE_TOO_LARGE" ? 413 : 422, "INVALID_PDF");
  let bytes: ArrayBuffer, pageCount: number;
  try {
    bytes = await file.arrayBuffer();
    const pdf = await PDFDocument.load(bytes, { ignoreEncryption: false, updateMetadata: false, throwOnInvalidObject: true });
    pageCount = pdf.getPageCount();
    if (pageCount < 1) return reply("El PDF no contiene páginas válidas. Selecciona otro archivo.", 422, "INVALID_PDF");
  } catch { return reply("El PDF está dañado, incompleto o no puede leerse. Selecciona otro archivo.", 422, "INVALID_PDF"); }
  const db = await createClient();
  const proof = { userId: access.userId, operationId: operation.data, fingerprint: uploadFingerprint(file, bytes),
    originalName: file.name, sizeBytes: file.size, pageCount };
  async function change(action: "prepare" | "commit") {
    const { data, error } = await db.rpc("recover_document_upload", signUploadProof({ ...proof, action }));
    if (error) return { response: reply(error.code === "PT409"
      ? "Esta carga corresponde a otro archivo. Selecciona el PDF nuevamente."
      : "No fue posible confirmar el guardado. Conserva el archivo seleccionado y reintenta la misma carga.",
      error.code === "PT409" ? 409 : 503, error.code === "PT409" ? "UPLOAD_CONFLICT" : "UPLOAD_UNAVAILABLE") };
    const parsed = receiptSchema.safeParse(data);
    if (!parsed.success) return { response: reply("No se pudo confirmar la carga. Reintenta con el mismo archivo.", 503, "UPLOAD_UNAVAILABLE") };
    if (parsed.data.state === "gone") return { response: reply("Este proyecto fue eliminado o está en eliminación. La carga anterior no se volverá a crear.", 410, "UPLOAD_GONE") };
    if (parsed.data.state === "completed" && parsed.data.project && parsed.data.document)
      return { response: Response.json({ ...parsed.data, message: "Carga confirmada. Los reintentos conservan el mismo proyecto." }) };
    return {};
  }
  const previous = await change("prepare");
  if (previous.response) return previous.response;
  const path = `${access.userId}/${operation.data}.pdf`;
  const storage = db.storage.from("pdf-documents");
  const { error } = await storage.upload(path, bytes, { contentType: "application/pdf", upsert: false });
  if (error) {
    // Recover an ambiguous transfer only if the stored bytes are identical.
    const stored = await storage.download(path);
    if (stored.error || !stored.data) return reply("No se confirmó la transferencia. Reintenta; se conserva el archivo seleccionado.", 503, "UPLOAD_UNAVAILABLE");
    const recovered = await stored.data.arrayBuffer();
    if (recovered.byteLength !== bytes.byteLength || createHash("sha256").update(Buffer.from(recovered)).digest("hex") !==
      createHash("sha256").update(Buffer.from(bytes)).digest("hex"))
      return reply("La carga anterior contiene otro archivo. Selecciona nuevamente el PDF.", 409, "UPLOAD_CONFLICT");
  }
  // Atomic records + receipt. Never delete bytes on an ambiguous response:
  // another request may have committed the same operation.
  const completed = await change("commit");
  return completed.response ?? reply("No se confirmó el guardado. Reintenta la misma carga.", 503, "UPLOAD_UNAVAILABLE");
}

export const POST = withOperationDiagnostics("pdf.upload", upload);
