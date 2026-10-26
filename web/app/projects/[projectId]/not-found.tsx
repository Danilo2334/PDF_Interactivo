import Link from "next/link";

export default function ProjectNotFound() {
  return <main className="min-h-screen bg-slate-50 px-6 py-12">
    <section className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-8">
      <h1 className="text-2xl font-bold text-slate-900">Documento no disponible</h1>
      <p className="mt-3 text-slate-700">El proyecto no existe o ya no tienes acceso a su contenido.</p>
      <Link href="/documents" className="mt-6 inline-block rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white">Volver a Mis documentos</Link>
    </section>
  </main>;
}
