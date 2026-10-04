import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Panel | PDF Interactivo",
  description: "Panel privado para gestionar documentos interactivos.",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) {
    redirect("/login");
  }

  const email =
    typeof data.claims.email === "string"
      ? data.claims.email
      : "usuario registrado";

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <p className="text-xl font-bold text-blue-900">PDF Interactivo</p>
          <p className="text-sm text-slate-600">{email}</p>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <p className="font-semibold text-blue-700">Panel del propietario</p>
        <h1 className="mt-2 text-4xl font-bold text-slate-900">
          Bienvenido a tus proyectos
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-600">
          Tu sesión está activa. Desde este panel podrás cargar, gestionar y
          enriquecer tus documentos PDF.
        </p>

        <div className="mt-10 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">
            Aún no tienes documentos
          </h2>
          <p className="mt-2 text-slate-600">
            La carga de archivos se incorporará en la siguiente épica del producto.
          </p>
        </div>
      </section>
    </main>
  );
}
