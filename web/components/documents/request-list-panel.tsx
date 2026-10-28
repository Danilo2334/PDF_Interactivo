"use client";

import { useEffect, useId, useRef, useState } from "react";
import { REQUEST_STATUSES, REQUEST_STATUS_LABELS, REQUEST_STAGE_LABELS } from "@/lib/reinforcements/state";
import { useRequestResource } from "@/lib/reinforcements/use-request-resource";
import { ContextualAnalysisPanel } from "@/components/documents/contextual-analysis-panel";
import { RecommendationPanel } from "@/components/documents/recommendation-panel";
import { ExplanationPanel } from "@/components/documents/explanation-panel";
import { ExamplePanel } from "@/components/documents/example-panel";
import { requestListSchema, requestDetailSchema, type RequestFilter, type RequestRecord, type RequestSummary } from "@/lib/validations/request-list";

const parseList = (body: unknown) => requestListSchema.parse(body);
const parseDetail = (body: unknown) => requestDetailSchema.parse(body);
const date = (value: string) => new Date(value).toLocaleString("es-CO");
const buttonClass = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 disabled:opacity-50";

function revealHeading(heading: HTMLHeadingElement | null) {
  heading?.focus({ preventScroll: true });
  heading?.scrollIntoView({ block: "start" });
}

export function RequestState({ request }: { request: RequestSummary }) {
  return <div className="space-y-1 text-sm">
    <p className="font-semibold text-blue-900">{REQUEST_STATUS_LABELS[request.status]}</p>
    <p className="text-slate-700">{REQUEST_STAGE_LABELS[request.stage]}</p>
    {request.status === "processing" && <p role="status" className="flex items-center gap-2 text-slate-700">
      <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-blue-700 border-t-transparent motion-reduce:animate-none" />
      La operación continúa. Puedes seguir consultando el documento.
    </p>}
    {request.status === "error" && request.error_message && <p className="break-words text-red-700">{request.error_message}</p>}
  </div>;
}

function RequestDetailPanel({ projectId, documentId, requestId, active, focusVersion, onBack, onOpen }: {
  projectId: string; documentId: string; requestId: string; active: boolean; focusVersion: number;
  onBack: () => void; onOpen: (request: RequestRecord) => void;
}) {
  const [page, setPage] = useState(1);
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Move only after opening/reopening the detail, never on a polling response.
  useEffect(() => { if (active) revealHeading(headingRef.current); }, [active, focusVersion]);
  const url = `/api/projects/${projectId}/reinforcement-requests/${requestId}?documentId=${documentId}&page=${page}`;
  const resource = useRequestResource(url, active, parseDetail, true);
  const detail = resource.result?.value;
  // Reserve space while loading so the heading can reach the top of the viewport.
  return <section aria-label="Detalle de solicitud" className="mt-5 min-h-dvh space-y-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 ref={headingRef} tabIndex={-1} className="scroll-mt-4 rounded-sm font-semibold text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700">Detalle e historial</h3>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onBack} className={buttonClass}>Volver al listado</button>
        <button type="button" onClick={resource.refresh} className={buttonClass}>Actualizar detalle</button>
      </div>
    </div>
    {!resource.result && <p role="status">Cargando solicitud…</p>}
    {resource.result?.error && <p role="alert" className="text-red-700">{resource.result.error}</p>}
    {detail && <>
      <p className="break-all text-sm text-slate-700">Identificador: {detail.request.id}</p>
      <RequestState request={detail.request} />
      <p className="text-sm text-slate-700">Página {detail.request.page_number} · Propietario: tú · Actualizada: {date(detail.request.updated_at)}</p>
      <p className="font-medium text-slate-900">Contenido solicitado</p>
      <blockquote className="max-h-52 overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-white p-3 text-sm text-slate-800">{detail.request.selected_text}</blockquote>
      <p className="text-sm text-slate-800"><strong>Necesidad: </strong>{detail.request.need}</p>
      <button type="button" onClick={() => onOpen(detail.request)} className={buttonClass}>Ver selección en el PDF</button>
      <ContextualAnalysisPanel key={`${documentId}:${requestId}`} request={detail.request} active={active} onChanged={resource.refresh} />
      <RecommendationPanel key={`recommendations:${documentId}:${requestId}`} request={detail.request} active={active} onChanged={resource.refresh} />
      <ExplanationPanel key={`explanation:${documentId}:${requestId}`} request={detail.request} active={active} onChanged={resource.refresh} />
      <ExamplePanel key={`example:${documentId}:${requestId}`} request={detail.request} active={active} onChanged={resource.refresh} />
      <h4 className="font-semibold text-slate-900">Cambios registrados</h4>
      {detail.events.length === 0 ? <p className="text-sm">No hay eventos en esta página del historial.</p> : <ol className="space-y-3">
        {detail.events.map(event => <li key={event.id} className="rounded-lg bg-white p-3 text-sm text-slate-800">
          <p>{event.previous_status ? `${REQUEST_STATUS_LABELS[event.previous_status]} → ` : ""}{REQUEST_STATUS_LABELS[event.status]} · {REQUEST_STAGE_LABELS[event.stage]}</p>
          {event.previous_stage && event.previous_stage !== event.stage && <p>Etapa anterior: {REQUEST_STAGE_LABELS[event.previous_stage]}</p>}
          <p>{event.actor_kind === "owner" ? "Responsable: propietario" : event.actor_kind === "system" ? "Responsable: sistema" : "Registro inicial al habilitar el historial"}</p>
          <time dateTime={event.occurred_at}>{date(event.occurred_at)}</time>
          {event.event_kind === "baseline" && <p>Los cambios anteriores a este registro no están disponibles.</p>}
        </li>)}
      </ol>}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={page === 1} onClick={() => setPage(value => value - 1)} className={buttonClass}>Historial anterior</button>
        <span className="text-sm">Página {page}</span>
        <button type="button" disabled={page * detail.pageSize >= detail.historyTotal} onClick={() => setPage(value => value + 1)} className={buttonClass}>Más historial</button>
      </div>
    </>}
  </section>;
}

export function RequestListPanel({ projectId, documentId, active, onOpen }: {
  projectId: string; documentId: string; active: boolean; onOpen: (request: RequestRecord) => void;
}) {
  const filterId = useId();
  const [filter, setFilter] = useState<RequestFilter>("all");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailFocusVersion, setDetailFocusVersion] = useState(0);
  const listHeadingRef = useRef<HTMLHeadingElement>(null);
  const url = `/api/projects/${projectId}/reinforcement-requests?documentId=${documentId}&status=${filter}&page=${page}`;
  const resource = useRequestResource(url, active, parseList);
  const list = resource.result?.value;
  function changeFilter(value: RequestFilter) { setFilter(value); setPage(1); setSelectedId(null); }
  function openDetail(requestId: string) { setSelectedId(requestId); setDetailFocusVersion(value => value + 1); }
  return <div className="mt-6 space-y-4" data-document-id={documentId}>
    <h2 ref={listHeadingRef} tabIndex={-1} className="scroll-mt-4 rounded-sm text-xl font-semibold text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700">Solicitudes del documento</h2>
    <p className="text-sm text-slate-600">Consulta el avance y vuelve a la selección original. Los estados se actualizan mientras esta sección está visible.</p>
    <div className="flex flex-wrap items-end gap-3">
      <div><label htmlFor={filterId} className="mb-1 block text-sm font-medium text-slate-800">Estado</label>
        <select id={filterId} value={filter} onChange={event => changeFilter(event.target.value as RequestFilter)} className={buttonClass}>
          <option value="all">Todos los estados</option>
          {REQUEST_STATUSES.map(status => <option key={status} value={status}>{REQUEST_STATUS_LABELS[status]}</option>)}
        </select>
      </div>
      <button type="button" onClick={() => changeFilter("all")} className={buttonClass}>Restablecer filtro</button>
      <button type="button" onClick={resource.refresh} className={buttonClass}>Actualizar solicitudes</button>
    </div>
    {!resource.result && <p role="status">Consultando solicitudes…</p>}
    {resource.result?.error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{resource.result.error}</p>}
    {list && <>
      <p className="text-sm text-slate-700">{list.total} solicitudes · Página {page}</p>
      {list.items.length === 0 ? <p role="status" className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        {filter === "all" && page === 1 ? "Este documento todavía no tiene solicitudes." : "No hay solicitudes para este filtro y página."}
      </p> : <ul className="space-y-3">{list.items.map(request => <li key={request.id} className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
        <p className="font-semibold text-slate-900">Página {request.page_number}</p>
        <p className="text-sm text-slate-600">Propietario: tú · Creada: <time dateTime={request.created_at}>{date(request.created_at)}</time></p>
        <RequestState request={request} />
        <button type="button" onClick={() => openDetail(request.id)} aria-pressed={selectedId === request.id} className={buttonClass}>Ver solicitud e historial</button>
      </li>)}</ul>}
      <div className="flex flex-wrap gap-3">
        <button type="button" disabled={page === 1} onClick={() => setPage(value => value - 1)} className={buttonClass}>Solicitudes anteriores</button>
        <button type="button" disabled={page * list.pageSize >= list.total} onClick={() => setPage(value => value + 1)} className={buttonClass}>Más solicitudes</button>
      </div>
    </>}
    {selectedId && <RequestDetailPanel key={selectedId} projectId={projectId} documentId={documentId} requestId={selectedId} active={active}
      focusVersion={detailFocusVersion} onBack={() => revealHeading(listHeadingRef.current)} onOpen={onOpen} />}
  </div>;
}
