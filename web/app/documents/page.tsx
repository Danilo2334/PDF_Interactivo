import Link from "next/link";
import { ViewTiming } from "@/components/diagnostics/view-timing";
import { requireActiveUser } from "@/lib/auth/require-active-user";
import { hasPermission } from "@/lib/auth/permissions";
import { RenameDocumentForm } from "@/components/documents/rename-document-form";
import { DeleteDocumentForm } from "@/components/documents/delete-document-form";
import {
  getOwnerProjects,
  getPendingProjectDeletions,
  type PendingProjectDeletion,
  type OwnerProject,
} from "@/lib/data/projects";

const projectStates = {
  pending: {
    label: "Pendiente",
    style: "bg-amber-100 text-amber-800",
  },
  processing: {
    label: "En proceso",
    style: "bg-blue-100 text-blue-800",
  },
  ready: {
    label: "Listo",
    style: "bg-green-100 text-green-800",
  },
  failed: {
    label: "Error",
    style: "bg-red-100 text-red-800",
  },
  deleting: { label: "Eliminación pendiente", style: "bg-red-100 text-red-800" },
} satisfies Record<
  OwnerProject["status"],
  { label: string; style: string }
>;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(new Date(value));
}

export default async function DocumentsPage() {
  const { role } = await requireActiveUser();
  const canRename = hasPermission(role, "documents.manage.own");

  let projects: OwnerProject[] = [];
  let pendingDeletions: PendingProjectDeletion[] = [];
  let loadError = false;

  try {
    [projects, pendingDeletions] = await Promise.all([getOwnerProjects(), getPendingProjectDeletions()]);
  } catch {
    loadError = true;
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/dashboard"
          className="text-sm font-medium text-blue-700 hover:underline"
        >
          Volver al panel
        </Link>

        <header className="mb-6 mt-6">
          <h1 className="text-3xl font-bold text-slate-900">
            Mis documentos
          </h1>

          <p className="mt-2 text-slate-600">
            Proyectos ordenados por su última modificación.
          </p>
        </header>

        {!loadError && (
          <ViewTiming metric="listado" items={projects.length} />
        )}

        {!loadError && pendingDeletions.length > 0 && <section aria-label="Eliminaciones pendientes" className="mb-6 space-y-3">
          {pendingDeletions.map(job => <div key={job.project_id} role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5">
            <h2 className="font-semibold text-red-900">Eliminación pendiente de limpieza</h2>
            <p className="mt-2 text-sm text-red-800">El contenido ya no está disponible. Reintenta para terminar de eliminar los archivos y datos vinculados.</p>
            {canRename && <DeleteDocumentForm projectId={job.project_id} documentId={job.document_id} name="Eliminación pendiente" retry />}
          </div>)}
        </section>}

        {loadError ? (
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800"
          >
            No fue posible cargar tus documentos. Inténtalo nuevamente.
          </p>
        ) : projects.length === 0 ? (
          <section className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <h2 className="text-xl font-semibold text-slate-900">
              {pendingDeletions.length ? "No hay documentos disponibles" : "Aún no tienes documentos"}
            </h2>

            <p className="mt-2 text-slate-600">
              {pendingDeletions.length ? "Completa las limpiezas pendientes indicadas arriba o carga un nuevo PDF." : "Carga tu primer PDF para crear un proyecto y comenzar."}
            </p>

            <Link
              href="/documents/upload"
              className="mt-5 inline-block rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800"
            >
              Cargar mi primer PDF
            </Link>
          </section>
        ) : (
          <>
            <p className="mb-4 text-sm text-slate-600">
              Total de proyectos: {projects.length}
            </p>

            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => {
                const state = projectStates[project.status];

                return (
                  <li
                    key={project.id}
                    className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <h2 className="break-words text-lg font-semibold text-slate-900">
                      {project.name}
                    </h2>

                    <span
                      className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold ${state.style}`}
                    >
                      {state.label}
                    </span>

                    <dl className="mt-5 space-y-3 text-sm">
                      <div>
                        <dt className="font-medium text-slate-700">
                          Fecha de creación
                        </dt>
                        <dd className="mt-1 text-slate-600">
                          <time dateTime={project.created_at}>
                            {formatDate(project.created_at)}
                          </time>
                        </dd>
                      </div>

                      <div>
                        <dt className="font-medium text-slate-700">
                          Última modificación
                        </dt>
                        <dd className="mt-1 text-slate-600">
                          <time dateTime={project.updated_at}>
                            {formatDate(project.updated_at)}
                          </time>
                        </dd>
                      </div>
                    </dl>
                    <Link
                      href={`/projects/${project.id}`}
                      aria-label={`Abrir proyecto: ${project.name}`}
                      className="mt-5 inline-block rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                    >
                      Abrir proyecto
                    </Link>
                    {canRename && (
                      <RenameDocumentForm projectId={project.id} currentName={project.name} />
                    )}
                    {canRename && <DeleteDocumentForm projectId={project.id} documentId={project.document_id} name={project.name} />}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </main>
  );
}
