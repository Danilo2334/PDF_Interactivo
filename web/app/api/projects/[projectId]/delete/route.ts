import { revalidatePath } from "next/cache";
import { z } from "zod";
import { checkPermission } from "@/lib/auth/access";
import { deleteOwnedProject } from "@/lib/documents/delete-project";
import { isSameOriginMutation } from "@/lib/documents/mutation-request";
import { createClient } from "@/lib/supabase/server";

const confirmation = z.object({ projectId: z.uuid(), documentId: z.uuid(), confirmed: z.literal(true) });
function respond(message: string, status: number) {
  return Response.json({ message }, { status, headers: { "Cache-Control": "private, no-store" } });
}
export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  if (!isSameOriginMutation(request)) return respond("Solicitud no permitida.", 403);
  const access = await checkPermission("documents.manage.own");
  if (!access.ok) return respond(access.message, access.status);
  let body: unknown;
  try { body = await request.json(); } catch { return respond("No fue posible leer la confirmación.", 400); }
  const { projectId } = await params;
  const parsed = confirmation.safeParse({ ...(typeof body === "object" && body !== null ? body : {}), projectId });
  if (!parsed.success) return respond("Confirma la eliminación del documento vigente antes de continuar.", 400);
  const client = await createClient();
  let result;
  try { result = await deleteOwnedProject(client, { projectId, documentId: parsed.data.documentId, ownerId: access.userId }); }
  catch { return respond("No se pudo confirmar la eliminación. Revisa Mis documentos antes de reintentar.", 503); }
  revalidatePath("/documents");
  revalidatePath(`/projects/${projectId}`);
  return respond(result.message, result.status);
}
