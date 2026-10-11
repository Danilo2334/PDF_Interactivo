import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Proyecto | PDF Interactivo",
};

type ProjectPageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function ProjectPage({
  params,
}: ProjectPageProps) {
  const { projectId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, document_id, name, status, created_at")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .single();

  if (!project) {
    notFound();
  }

  const { data: document } = await supabase
    .from("documents")
    .select("original_name, size_bytes, status")
    .eq("id", project.document_id)
    .eq("owner_id", user.id)
    .single();

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto max-w-4xl rounded-xl border border-slate-200 bg-white p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
          Proyecto creado
        </p>

        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          {project.name}
        </h1>

        <dl className="mt-8 space-y-4">
          <div>
            <dt className="font-semibold text-slate-900">
              Estado inicial
            </dt>
            <dd className="text-slate-600">{project.status}</dd>
          </div>

          <div>
            <dt className="font-semibold text-slate-900">
              Documento relacionado
            </dt>
            <dd className="break-all text-slate-600">
              {document?.original_name ?? "Documento no disponible"}
            </dd>
          </div>

          <div>
            <dt className="font-semibold text-slate-900">
              Tamaño
            </dt>
            <dd className="text-slate-600">
              {document
                ? `${(document.size_bytes / (1024 * 1024)).toFixed(2)} MB`
                : "No disponible"}
            </dd>
          </div>
        </dl>
      </div>
    </main>
  );
}
