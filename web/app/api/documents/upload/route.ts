import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validatePdfFile } from "@/lib/validations/pdf-file";

const STORAGE_BUCKET = "pdf-documents";

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { message: "Debes iniciar sesión para cargar documentos." },
      { status: 401 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { message: "No se recibió ningún archivo." },
      { status: 400 },
    );
  }

  const validation = await validatePdfFile(file);

  if (!validation.valid) {
    const statusByError = {
      EMPTY_FILE: 400,
      INVALID_EXTENSION: 415,
      INVALID_MIME_TYPE: 415,
      FILE_TOO_LARGE: 413,
      INVALID_SIGNATURE: 415,
      READ_ERROR: 400,
    } as const;

    return NextResponse.json(
      {
        message: validation.message,
        code: validation.code,
      },
      {
        status: statusByError[validation.code],
      },
    );
  }

  const documentId = crypto.randomUUID();
  const storagePath = `${user.id}/${documentId}.pdf`;
  const fileBuffer = await file.arrayBuffer();

  const { data: uploadedFile, error: uploadError } =
    await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: "application/pdf",
        upsert: false,
      });

  if (uploadError) {
    console.error("Error almacenando PDF:", uploadError);

    return NextResponse.json(
      { message: "No fue posible almacenar el documento." },
      { status: 500 },
    );
  }

  const { error: documentError } = await supabase
    .from("documents")
    .insert({
      id: documentId,
      owner_id: user.id,
      original_name: file.name,
      storage_path: uploadedFile.path,
      size_bytes: file.size,
      mime_type: "application/pdf",
      status: "uploaded",
    });

  if (documentError) {
    console.error("Error registrando documento:", documentError);

    await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([uploadedFile.path]);

    return NextResponse.json(
      {
        message:
          "No fue posible registrar el documento. El archivo parcial fue eliminado.",
      },
      { status: 500 },
    );
  }

  const projectId = crypto.randomUUID();
  const projectName =
    file.name.replace(/\.pdf$/i, "").trim() || "Proyecto sin título";

  const { error: projectError } = await supabase
    .from("projects")
    .insert({
      id: projectId,
      owner_id: user.id,
      document_id: documentId,
      name: projectName,
      status: "pending",
    });

  if (projectError) {
    console.error("Error creando proyecto:", projectError);

    await supabase
      .from("documents")
      .delete()
      .eq("id", documentId);

    await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([uploadedFile.path]);

    return NextResponse.json(
      {
        message:
          "No fue posible crear el proyecto. El documento relacionado fue eliminado.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    message: "Proyecto creado correctamente.",
    document: {
      id: documentId,
      name: file.name,
      size: file.size,
      path: uploadedFile.path,
    },
    project: {
      id: projectId,
      name: projectName,
      status: "pending",
    },
  });
}
