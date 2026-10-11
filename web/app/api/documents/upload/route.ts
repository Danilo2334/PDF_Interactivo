import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MAX_FILE_SIZE = 20 * 1024 * 1024;
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

  const isPdf =
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf");

  if (!isPdf) {
    return NextResponse.json(
      { message: "El archivo debe estar en formato PDF." },
      { status: 415 },
    );
  }

  if (file.size === 0) {
    return NextResponse.json(
      { message: "El archivo PDF está vacío." },
      { status: 400 },
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { message: "El archivo no puede superar los 20 MB." },
      { status: 413 },
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

  return NextResponse.json({
    message: "Documento almacenado de forma segura.",
    document: {
      id: documentId,
      name: file.name,
      size: file.size,
      path: uploadedFile.path,
    },
  });
}
