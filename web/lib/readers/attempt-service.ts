import "server-only";
import { readSmallJson } from "@/lib/reinforcements/request-service";
import { isSameOriginMutation } from "@/lib/documents/mutation-request";
import { quizAttemptInputSchema, quizAttemptReceiptSchema, quizAttemptStatusSchema } from "@/lib/validations/quiz-attempt";
import { readerObjectId } from "@/lib/readers/model";
import { loadReader, ReaderUnavailable } from "@/lib/readers/repository";
import { getReaderSession } from "@/lib/readers/session";
import { signQuizAttempt } from "@/lib/readers/attempt-proof";
import { publicationOrigin } from "@/lib/publications/proof";
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "Cross-Origin-Resource-Policy": "same-origin" } });
export async function readerQuizAttempt(request: Request, token: string, quizId: string, submit: boolean) {
  if (submit && !isSameOriginMutation(request)) return reply({ message: "Origen de la solicitud no permitido." }, 403);
  try {
    const context = await loadReader(request, token), session = getReaderSession(request, token);
    if (context.snapshot.requireIdentification && !session?.identified) return reply({ message: "Completa primero la identificación solicitada." }, 403);
    if (!session) return reply({ message: "Actualiza la lectura para recuperar tu sesión antes de responder." }, 428);
    const quiz = context.snapshot.items.find(i => i.quiz && readerObjectId(context.hash, "q", i.quiz.id) === quizId)?.quiz;
    if (!quiz) return reply({ message: "Este mini quiz no está disponible en esta versión." }, 404);
    let data;
    if (submit) {
      const input = await readSmallJson(request, 1000); if (input.response) return input.response;
      const parsed = quizAttemptInputSchema.safeParse(input.body);
      if (!parsed.success || parsed.data.answers.length !== quiz.content.questions.length || parsed.data.answers.some((a, i) => a >= quiz.content.questions[i].options.length)) return reply({ message: "Responde todas las preguntas con una opción válida." }, 400);
      data = parsed.data;
    }
    const proof = signQuizAttempt({ action: submit ? "submit" : "status", privateTest: context.privateTest, publicationId: context.id, publicationHash: context.hash,
      quizVersionId: quiz.id, readerId: context.privateTest ? context.ownerId : session.reader, identified: session.identified,
      ...(context.privateTest ? { userId: context.ownerId } : { publicationToken: token, origin: publicationOrigin() }), ...data });
    const result = await context.db.rpc(context.privateTest ? "change_quiz_practice" : "change_quiz_reader_attempt", proof);
    if (result.error) {
      const code = result.error.code, status = code === "PT404" ? 404 : code === "PT409" || code === "23505" ? 409 : code === "PT429" ? 429 : code === "23514" ? 400 : code === "42501" ? 403 : 503;
      return reply({ message: status === 409 ? "El intento ya está registrado o no se permiten reintentos. Actualiza el resultado antes de continuar." : status === 429 ? "Has enviado varios intentos. Espera unos minutos antes de volver a intentarlo." : status === 404 ? "La publicación o el quiz ya no están disponibles." : "No se pudo confirmar el intento. Reintenta sin cambiar las respuestas." }, status);
    }
    if (submit) return reply({ receipt: quizAttemptReceiptSchema.parse(result.data) });
    return reply(quizAttemptStatusSchema.parse(result.data));
  } catch (error) { return reply({ message: error instanceof ReaderUnavailable ? error.message : "No fue posible comprobar el intento. Reintenta sin cambiar las respuestas." }, error instanceof ReaderUnavailable ? error.status : 503); }
}
