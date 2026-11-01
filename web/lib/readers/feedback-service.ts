import "server-only";
import { getCurrentAccess } from "@/lib/auth/access";
import { isSameOriginMutation } from "@/lib/documents/mutation-request";
import { readSmallJson, reply } from "@/lib/reinforcements/request-service";
import { loadReader, ReaderUnavailable } from "@/lib/readers/repository";
import { getReaderSession } from "@/lib/readers/session";
import { readerObjectId } from "@/lib/readers/model";
import { publicationOrigin } from "@/lib/publications/proof";
import { signReaderFeedback } from "@/lib/readers/feedback-proof";
import { readerFeedbackInputSchema, readerFeedbackStatusSchema } from "@/lib/validations/reader-feedback";

export async function readerFeedback(request: Request, token: string, reinforcementId: string, submit: boolean) {
  if (submit && !isSameOriginMutation(request)) return reply({ message: "Origen de la solicitud no permitido." }, 403);
  try {
    const context = await loadReader(request, token);
    if (context.privateTest) return submit ? reply({ message: "La prueba privada no registra opiniones de lectores." }, 403) : reply({ enabled: false, receipt: null });
    const access = await getCurrentAccess();
    if (!access.ok && access.status === 503) return reply({ message: "No fue posible comprobar el acceso. Reintenta." }, 503);
    if (access.ok && access.userId === context.ownerId) return submit ? reply({ message: "La vista del propietario no registra opiniones de lectores." }, 403) : reply({ enabled: false, receipt: null });
    const session = getReaderSession(request, token);
    if (context.snapshot.requireIdentification && !session?.identified) return reply({ message: "Completa primero la identificación solicitada." }, 403);
    if (!session) return reply({ message: "Actualiza la lectura para recuperar tu sesión antes de opinar." }, 428);
    const item = context.snapshot.items.find(i => readerObjectId(context.hash, "r", i.id) === reinforcementId);
    if (!item) return reply({ message: "El refuerzo no está disponible en esta publicación." }, 404);
    let data;
    if (submit) {
      const input = await readSmallJson(request, 10000); if (input.response) return input.response;
      const parsed = readerFeedbackInputSchema.safeParse(input.body);
      if (!parsed.success) return reply({ message: "Elige una valoración y escribe, si quieres, hasta 1000 caracteres de comentario." }, 400);
      if (parsed.data.pageNumber !== item.pageNumber) return reply({ message: "El refuerzo no corresponde a esta página." }, 409);
      data = parsed.data;
    }
    const proof = signReaderFeedback({ action: submit ? "submit" : "status", publicationId: context.id, publicationHash: context.hash,
      publicationToken: token, accessVersion: context.accessVersion, origin: publicationOrigin(), readerId: session.reader,
      identified: session.identified, reinforcementId: item.id, pageNumber: item.pageNumber, ...data });
    const result = await context.db.rpc("change_reader_reinforcement_feedback", proof);
    if (result.error) {
      const code = result.error.code, status = code === "PT404" ? 404 : code === "PT409" || code === "23505" ? 409 : code === "23514" || code === "22P02" ? 400 : code === "42501" ? 403 : 503;
      return reply({ message: status === 409 ? "Ya existe una opinión para este refuerzo o el envío cambió. Consulta la opinión guardada." : status === 404 ? "La publicación o el refuerzo ya no están disponibles." : "No se pudo confirmar la opinión. Reintenta sin cambiar la valoración o consulta si quedó guardada." }, status);
    }
    return reply(readerFeedbackStatusSchema.parse({ enabled: true, receipt: result.data }));
  } catch (error) { return reply({ message: error instanceof ReaderUnavailable ? error.message : "No fue posible confirmar la opinión. Reintenta o consulta si quedó guardada." }, error instanceof ReaderUnavailable ? error.status : 503); }
}
