import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MAX_FILE_SIZE = 20 * 1024 * 1024;

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

  await file.arrayBuffer();

  return NextResponse.json({
    message: "Transferencia completada correctamente.",
    file: {
      name: file.name,
      size: file.size,
    },
  });
}
