import type { Metadata } from "next";
import { PdfFileSelector } from "@/components/documents/pdf-file-selector";
import { requireActiveUser } from "@/lib/auth/require-active-user";

export const metadata: Metadata = {
  title: "Cargar PDF | PDF Interactivo",
};

export default async function UploadPdfPage() {
  await requireActiveUser();

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
          Nuevo documento
        </p>

        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          Cargar documento PDF
        </h1>

        <p className="mb-8 mt-3 text-slate-600">
          Selecciona el documento que utilizarás para crear la experiencia
          interactiva.
        </p>

        <PdfFileSelector />
      </div>
    </main>
  );
}
