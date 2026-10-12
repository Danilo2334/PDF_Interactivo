"use client";

import { useId, useState } from "react";
import { PdfViewer } from "@/components/documents/pdf-viewer";
import type { Reinforcement } from "@/lib/types/reinforcement";

type WorkspaceProps = {
  projectId: string;
  documentId: string;
  reinforcements: Reinforcement[];
  reinforcementsError: boolean;
};

const sections = [
  { id: "pdf", label: "PDF original" },
  { id: "reinforcements", label: "Refuerzos" },
] as const;

export function ProjectWorkspace({
  projectId,
  documentId,
  reinforcements,
  reinforcementsError,
}: WorkspaceProps) {
  const [activeSection, setActiveSection] =
    useState<"pdf" | "reinforcements">("pdf");

  const workspaceId = useId();

  return (
    <div className="mt-8 min-w-0">
      <div
        role="group"
        aria-label="Secciones del proyecto"
        className="flex flex-wrap gap-2 border-b border-slate-200 pb-3"
      >
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            aria-pressed={activeSection === section.id}
            aria-controls={`${workspaceId}-${section.id}`}
            onClick={() => setActiveSection(section.id)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${
              activeSection === section.id
                ? "bg-blue-700 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {section.label}
          </button>
        ))}
      </div>

      <div
        id={`${workspaceId}-pdf`}
        hidden={activeSection !== "pdf"}
      >
        <PdfViewer projectId={projectId} />
      </div>

      <section
        id={`${workspaceId}-reinforcements`}
        hidden={activeSection !== "reinforcements"}
        data-document-id={documentId}
        className="mt-6"
      >
        <h2 className="text-xl font-semibold text-slate-900">
          Refuerzos del documento
        </h2>

        <p className="mt-2 text-sm text-slate-600">
          El contenido adicional se muestra aquí y conserva la
          referencia a su página. Tu PDF original permanece intacto.
        </p>

        {reinforcementsError ? (
          <p
            role="alert"
            className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-700"
          >
            No fue posible consultar los refuerzos. Recarga la página
            para intentarlo nuevamente.
          </p>
        ) : reinforcements.length === 0 ? (
          <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
            Este documento todavía no tiene refuerzos.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {reinforcements.map((reinforcement) => (
              <article
                key={reinforcement.id}
                data-page-number={reinforcement.page_number}
                className="rounded-lg border border-slate-200 bg-white p-5"
              >
                <p className="text-sm font-medium text-blue-700">
                  Página {reinforcement.page_number}
                </p>

                <h3 className="mt-2 break-words font-semibold text-slate-900">
                  {reinforcement.title}
                </h3>

                {typeof reinforcement.content.text === "string" && (
                  <p className="mt-3 whitespace-pre-wrap break-words text-sm text-slate-700">
                    {reinforcement.content.text}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
