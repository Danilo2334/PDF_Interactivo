import { NextResponse } from "next/server";
import { getCurrentAccess } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const access = await getCurrentAccess();

  if (!access.ok) {
    return NextResponse.json(
      { message: access.message },
      {
        status: access.status,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  }

  const { projectId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { message: "Debes iniciar sesión para visualizar el documento." },
      { status: 401 },
    );
  }

  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!uuidPattern.test(projectId)) {
    return NextResponse.json(
      { message: "Proyecto no encontrado." },
      { status: 404 },
    );
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("document_id")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (projectError) {
    console.error("Error consultando proyecto:", projectError);
    return NextResponse.json(
      { message: "No fue posible consultar el proyecto." },
      { status: 500 },
    );
  }

  if (!project) {
    return NextResponse.json(
      { message: "Proyecto no encontrado." },
      { status: 404 },
    );
  }

  const { data: document, error: documentError } = await supabase
    .from("documents")
    .select("storage_path")
    .eq("id", project.document_id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (documentError) {
    console.error("Error consultando documento:", documentError);
    return NextResponse.json(
      { message: "No fue posible consultar el documento." },
      { status: 500 },
    );
  }

  if (!document) {
    return NextResponse.json(
      { message: "Documento no encontrado." },
      { status: 404 },
    );
  }

  const { data: file, error: downloadError } = await supabase.storage
    .from("pdf-documents")
    .download(document.storage_path);

  if (downloadError || !file) {
    console.error("Error obteniendo PDF:", downloadError);
    return NextResponse.json(
      { message: "No fue posible obtener el PDF. Inténtalo nuevamente." },
      { status: 500 },
    );
  }

  return new Response(file, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
