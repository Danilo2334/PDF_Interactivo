import "server-only";
import { createHash } from "node:crypto";
import { PDFDocument } from "pdf-lib";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { readSmallJson } from "@/lib/reinforcements/request-service";
import { signUploadProof, uploadFingerprintFromDigest } from "@/lib/documents/upload-proof";
import { databaseRolledBack } from "@/lib/documents/mutation-request";
import { validatePdfFile } from "@/lib/validations/pdf-file";
import { pdfTransferSchema, pdfReplacementTransferSchema, type PdfTransfer } from "@/lib/validations/pdf-transfer";

type Db = Awaited<ReturnType<typeof createClient>>;
const bucket = "pdf-documents";
const receiptSchema = z.object({ state: z.enum(["pending", "completed", "gone"]),
  project: z.object({ id: z.uuid(), name: z.string(), status: z.string() }).optional(),
  document: z.object({ id: z.uuid(), name: z.string(), size: z.number(), pageCount: z.number().positive().optional() }).optional() });
const reply = (message: string, status: number, code = "UPLOAD_UNAVAILABLE") => Response.json({ message, code }, { status });
const completedReplacement = (id: string, pageCount: number) => Response.json({ state: "completed", documentId: id, pageCount,
  message: "PDF reemplazado correctamente. Los refuerzos anteriores conservan su versión original." });

async function discardUncommitted(db: Db, path: string, operationId: string) {
  const existing = await db.from("documents").select("id").eq("id", operationId).maybeSingle();
  if (existing.error || existing.data) return !existing.error;
  const removed = await db.storage.from(bucket).remove([path]);
  return !removed.error;
}
async function rejectStoredPdf(db: Db, path: string, operationId: string, response: Response) {
  if (response.status < 500 && !await discardUncommitted(db, path, operationId))
    return reply("El PDF no se pudo validar y la limpieza temporal sigue pendiente. No se cambió el documento vigente. Reintenta o comunica la referencia.", 503);
  return response;
}

async function checkedStoredPdf(db: Db, path: string, file: PdfTransfer["file"]) {
  const stored = await db.storage.from(bucket).download(path);
  if (stored.error || !stored.data) return { response: reply("No se confirmó la transferencia. Conserva el PDF y reintenta la misma operación.", 503) };
  if (stored.data.size !== file.size || stored.data.type !== "application/pdf")
    return { response: reply("El archivo almacenado no coincide con el seleccionado. Selecciona nuevamente el PDF.", 409, "UPLOAD_CONFLICT") };
  const bytes = await stored.data.arrayBuffer();
  if (createHash("sha256").update(Buffer.from(bytes)).digest("hex") !== file.sha256)
    return { response: reply("La huella del archivo transferido no coincide. Selecciona nuevamente el PDF.", 409, "UPLOAD_CONFLICT") };
  const validation = await validatePdfFile(new File([bytes], file.name, { type: file.type }));
  if (!validation.valid) return { response: reply(validation.message, 422, "INVALID_PDF") };
  try {
    const pdf = await PDFDocument.load(bytes, { ignoreEncryption: false, updateMetadata: false, throwOnInvalidObject: true });
    const pageCount = pdf.getPageCount();
    if (pageCount > 0) return { pageCount };
  } catch { /* Do not expose parser errors or private content. */ }
  return { response: reply("El PDF está dañado, incompleto, cifrado o no contiene páginas válidas. Selecciona otro archivo.", 422, "INVALID_PDF") };
}

export async function directPdfUpload(request: Request, db: Db, userId: string) {
  const input = await readSmallJson(request, 4096); if (input.response) return input.response;
  const parsed = pdfTransferSchema.safeParse(input.body);
  if (!parsed.success) return reply("Revisa el nombre, tipo, tamaño y operación del PDF (máximo 20 MB).", 400, "INVALID_UPLOAD");
  const { operationId, file, action } = parsed.data;
  const proof = { userId, operationId, fingerprint: uploadFingerprintFromDigest(file, file.sha256), originalName: file.name, sizeBytes: file.size };
  async function change(step: "prepare" | "commit", pageCount: number) {
    const saved = await db.rpc("recover_document_upload", signUploadProof({ ...proof, action: step, pageCount }));
    if (saved.error) return { response: reply(saved.error.code === "PT409"
      ? "Esta operación corresponde a otro archivo. Selecciona el PDF nuevamente."
      : "No se pudo confirmar el guardado. Reintenta con el mismo PDF.", saved.error.code === "PT409" ? 409 : 503,
      saved.error.code === "PT409" ? "UPLOAD_CONFLICT" : "UPLOAD_UNAVAILABLE") };
    const receipt = receiptSchema.safeParse(saved.data);
    if (!receipt.success) return { response: reply("No se pudo verificar el guardado. Reintenta con el mismo PDF.", 503) };
    if (receipt.data.state === "gone") return { response: reply("Este proyecto fue eliminado o está en eliminación. La carga anterior no se volverá a crear.", 410, "UPLOAD_GONE") };
    if (receipt.data.state === "completed" && receipt.data.project && receipt.data.document)
      return { response: Response.json({ ...receipt.data, message: "Carga confirmada. Los reintentos conservan el mismo proyecto." }) };
    return {};
  }
  // Zero means unknown during reservation, never a fabricated PDF page count.
  // Only commit, after actual server-side parsing, can create document records.
  const previous = await change("prepare", 0); if (previous.response) return previous.response;
  const path = `${userId}/${operationId}.pdf`;
  if (action === "prepare") return Response.json({ state: "pending", upload: { bucket, path } });
  const checked = await checkedStoredPdf(db, path, file);
  if (checked.response) return rejectStoredPdf(db, path, operationId, checked.response);
  const saved = await change("commit", checked.pageCount!);
  return saved.response ?? reply("No se confirmó el guardado. Reintenta con el mismo PDF.", 503);
}

export async function directPdfReplacement(request: Request, projectId: string, db: Db, userId: string) {
  const input = await readSmallJson(request, 4096); if (input.response) return input.response;
  const parsed = pdfReplacementTransferSchema.safeParse(input.body);
  if (!parsed.success || !z.uuid().safeParse(projectId).success) return reply("Confirma el reemplazo y revisa los datos del PDF (máximo 20 MB).", 400, "INVALID_UPLOAD");
  const { documentId, operationId, file, action } = parsed.data;
  if (documentId === operationId) return reply("El reemplazo debe tener una identidad nueva.", 400, "INVALID_UPLOAD");
  async function currentProject() {
    return db.from("projects").select("document_id,status").eq("id", projectId).eq("owner_id", userId).maybeSingle();
  }
  async function matchingDocument() {
    const record = await db.from("documents").select("id,original_name,size_bytes,storage_path").eq("id", operationId).eq("owner_id", userId).maybeSingle();
    return !record.error && record.data?.original_name === file.name && record.data?.size_bytes === file.size
      && record.data?.storage_path === `${userId}/${operationId}.pdf`;
  }
  const current = await currentProject();
  if (current.error) return reply("No fue posible consultar el proyecto.", 503);
  if (!current.data) return reply("El documento no está disponible.", 404, "ACCESS_REJECTED");
  if (current.data.status === "deleting" || ![documentId, operationId].includes(current.data.document_id))
    return reply("El documento cambió. Recarga antes de confirmar otro reemplazo.", 409, "UPLOAD_CONFLICT");
  const path = `${userId}/${operationId}.pdf`;
  if (action === "prepare" && current.data.document_id === documentId)
    return Response.json({ state: "pending", upload: { bucket, path } });
  const checked = await checkedStoredPdf(db, path, file);
  if (checked.response) return rejectStoredPdf(db, path, operationId, checked.response);
  if (current.data.document_id === operationId)
    return await matchingDocument() ? completedReplacement(operationId, checked.pageCount!)
      : reply("La operación corresponde a otro archivo. Selecciona nuevamente el PDF.", 409, "UPLOAD_CONFLICT");
  const saved = await db.rpc("replace_project_pdf", { p_project_id: projectId, p_expected_document_id: documentId,
    p_document_id: operationId, p_original_name: file.name, p_storage_path: path, p_size_bytes: file.size });
  if (!saved.error) return completedReplacement(operationId, checked.pageCount!);
  // A concurrent identical request may have committed while this call waited.
  // Never delete bytes on an unknown outcome or an existing document identity.
  const recovered = await currentProject();
  if (!recovered.error && recovered.data?.status !== "deleting" && recovered.data?.document_id === operationId && await matchingDocument())
    return completedReplacement(operationId, checked.pageCount!);
  if (databaseRolledBack(saved.error.code)) {
    if (!await discardUncommitted(db, path, operationId))
      return reply("El PDF vigente se conserva. La limpieza del reemplazo temporal no se confirmó; reintenta o comunica la referencia.", 503);
  }
  const conflict = ["PT409", "40001"].includes(saved.error.code ?? "");
  return reply(conflict ? "El documento cambió. Recarga antes de confirmar otro reemplazo."
    : "No se pudo confirmar el reemplazo. Reintenta sin cambiar el PDF ni la operación.", conflict ? 409 : 503, conflict ? "UPLOAD_CONFLICT" : "UPLOAD_UNAVAILABLE");
}
