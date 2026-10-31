"use client";
import Image from "next/image";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { PdfViewer } from "@/components/documents/pdf-viewer";
import { VisualResource } from "@/components/documents/visual-resource";
import { SummaryResource } from "@/components/documents/summary-resource";
import { readerReplySchema, type ReaderItem, type ReaderView } from "@/lib/validations/reader";
import type { FragmentSelection } from "@/lib/pdf/fragment-selection";
function ReaderCard({ item, endpoint, onSource }: { item: ReaderItem; endpoint: string; onSource: () => void }) {
  const [expanded, setExpanded] = useState(item.initialExpanded), id = useId();
  return <article className="min-w-0 space-y-3 rounded-xl border border-slate-200 bg-white p-4">
    <p className="text-sm text-blue-800">Página {item.pageNumber} · Contenido aprobado</p>
    <h3><button type="button" aria-expanded={expanded} aria-controls={`${id}-content`} onClick={() => setExpanded(v => !v)} className="w-full rounded-lg py-2 text-left font-semibold break-words focus-visible:outline-2 focus-visible:outline-blue-700">{item.title} <span aria-hidden="true">{expanded ? "−" : "+"}</span></button></h3>
    <div id={`${id}-content`} hidden={!expanded} className="space-y-4">
      {item.type === "visual" && item.visual ? <VisualResource value={item.visual} title={item.title} description={item.text} /> : item.type === "summary" && item.summary ? <SummaryResource value={item.summary} /> : <p className="whitespace-pre-wrap break-words text-sm">{item.text}</p>}
      <button type="button" onClick={onSource} className="rounded-lg border border-blue-300 px-3 py-2 text-sm">Ver {item.selection?.kind === "area" ? "zona" : item.selection?.kind === "text" ? "selección de texto" : "página"} original · Página {item.pageNumber}</button>
      {item.media.length > 0 && <section aria-label={`Recursos de ${item.title}`} className="space-y-3"><h4 className="font-semibold">Recursos multimedia</h4>{item.media.map(m => <div key={m.id} className="space-y-2 rounded-lg border p-3"><p className="break-words text-sm font-semibold">{m.title}</p>
        {m.kind === "link" ? m.url ? <a href={m.url} target="_blank" rel="noopener noreferrer" className="block break-all text-sm text-blue-800 underline">Consultar recurso (abre otra pestaña)</a> : <p>Enlace no disponible.</p>
          : m.kind === "image" ? <Image src={`${endpoint}/assets/${m.id}`} alt={m.title} width={640} height={360} unoptimized className="h-auto max-h-80 w-full object-contain" />
            : <video src={`${endpoint}/assets/${m.id}`} aria-label={m.title} controls playsInline preload="metadata" className="max-h-80 w-full" />}</div>)}</section>}
      {item.quiz && <section aria-label={`Mini quiz: ${item.quiz.title}`} className="space-y-3 border-t pt-3"><h4 className="font-semibold">{item.quiz.title}</h4>
        <ol className="list-decimal space-y-3 pl-5">{item.quiz.questions.map((q, n) => <li key={n}><p className="break-words text-sm">{q.prompt}</p><ul className="mt-2 list-disc space-y-1 pl-4">{q.options.map((option, index) => <li key={index} className="break-words text-sm">{option}</li>)}</ul></li>)}</ol>
        <p className="text-sm text-slate-600">El envío de respuestas todavía no está habilitado en esta experiencia.</p></section>}
    </div>
  </article>;
}
function Reading({ view, endpoint }: { view: ReaderView; endpoint: string }) {
  const [page, setPage] = useState(1), [panel, setPanel] = useState(false), [navigation, setNavigation] = useState<{ page: number; fragment: FragmentSelection | null; key: number }>({ page: 1, fragment: null, key: 0 });
  const pdf = useRef<HTMLDivElement>(null), content = useRef<HTMLElement>(null), position = useRef<{ x: number; y: number; page: number; horizontal: number } | null>(null);
  const reportPage = useCallback((page: number) => setPage(page), []);
  function openPanel(currentPage = page) { const figure = pdf.current?.querySelector<HTMLElement>(`[data-pdf-page="${currentPage}"]`); position.current = { x: window.scrollX, y: window.scrollY, page: currentPage, horizontal: figure?.scrollLeft ?? 0 }; setPage(currentPage); setPanel(true); }
  useLayoutEffect(() => {
    if (panel) { content.current?.scrollIntoView({ block: "start", behavior: "instant" }); content.current?.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true }); }
    else if (position.current) { const p = position.current, figure = pdf.current?.querySelector<HTMLElement>(`[data-pdf-page="${p.page}"]`); if (figure) figure.scrollLeft = p.horizontal; window.scrollTo({ left: p.x, top: p.y, behavior: "instant" }); }
  }, [panel]);
  return <>
    <div role="group" aria-label="Secciones de lectura" className="flex flex-wrap gap-2"><button type="button" aria-pressed={!panel} onClick={() => setPanel(false)} className="rounded-lg border px-3 py-2">PDF original</button><button type="button" aria-pressed={panel} onClick={() => openPanel()} className="rounded-lg border px-3 py-2">Refuerzos</button></div>
    <div ref={pdf} hidden={panel}><PdfViewer key={endpoint} projectId="reader" sourceUrl={`${endpoint}/assets/pdf`} visible={!panel} initialPage={navigation.page} initialFragment={navigation.fragment} navigationKey={navigation.key}
      onVisiblePageChange={reportPage} onOpenReinforcements={openPanel} /></div>
    <section ref={content} hidden={!panel} aria-label={`Refuerzos de la página ${page}`} className="space-y-4"><button type="button" onClick={() => setPanel(false)} className="rounded-lg border px-3 py-2">Cerrar refuerzos y volver al PDF</button><h2 className="text-xl font-semibold">Refuerzos de la página {page}</h2>
      {!view.items.some(i => i.pageNumber === page) && <p>Esta página no tiene refuerzos publicados para consultar.</p>}
      {view.items.filter(i => i.pageNumber === page).map(item => <ReaderCard key={item.id} item={item} endpoint={endpoint} onSource={() => { position.current = null; setNavigation(p => ({ page: item.pageNumber, fragment: item.selection as FragmentSelection | null, key: p.key + 1 })); setPanel(false); }} />)}
    </section>
  </>;
}
export function ReaderExperience({ token, endpointOverride }: { token: string; endpointOverride?: string }) {
  const id = useId(), endpoint = endpointOverride ?? `/api/read/${encodeURIComponent(token)}`;
  const [view, setView] = useState<ReaderView | null>(null), [gate, setGate] = useState<{ name: string; privateTest: boolean } | null>(null);
  const [name, setName] = useState(""), [email, setEmail] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState(""), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void (async () => { try { const response = await fetch(endpoint, { cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(30000)]) }), body = await response.json();
      if (!response.ok) throw Error(body.message ?? "Esta experiencia no está disponible para lectura.");
      const checked = readerReplySchema.safeParse(body); if (!checked.success) throw Error("No fue posible validar esta versión. Reintenta la lectura."); const parsed = checked.data;
      if (controller.signal.aborted) return;
      if (parsed.state === "ready") { setView(parsed.view); setGate(null); } else { setView(null); setGate(parsed); }
      setError("");
    } catch (e) { if (!controller.signal.aborted) { setView(null); setGate(null); setError(e instanceof Error && e.name === "TimeoutError" ? "La lectura tardó demasiado. Reintenta." : e instanceof TypeError ? "No fue posible conectar con la experiencia. Revisa tu conexión y reintenta." : e instanceof Error ? e.message : "No fue posible abrir la experiencia."); } } })();
    return () => controller.abort();
  }, [endpoint, attempt]);
  async function identify(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try { const response = await fetch(`${endpoint}/identify`, { method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(20000), body: JSON.stringify({ name: name.trim(), email: email.trim() }) });
      const body = await response.json(); if (!response.ok) { setError(body.message ?? "Revisa los datos indicados."); return; }
      setName(""); setEmail(""); setGate(null); setAttempt(a => a + 1);
    } catch { setError("No fue posible completar la identificación. Reintenta."); } finally { setBusy(false); }
  }
  return <main className="mx-auto min-w-0 max-w-5xl space-y-5 px-4 py-6 sm:px-6">
    <p className="font-semibold text-blue-800">PDF Interactivo · Lectura</p>
    <h1 className="break-words text-2xl font-bold">{view?.name ?? gate?.name ?? "Abrir experiencia"}</h1>
    {(view?.privateTest || gate?.privateTest) && <p role="status" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm font-semibold">Prueba privada del lector con sesión del propietario. No acredita acceso anónimo ni publicación HTTPS.</p>}
    {view && <><p className="text-sm text-slate-600">Versión {view.version} · Modo de lectura</p><Reading key={endpoint} view={view} endpoint={endpoint} /></>}
    {gate && <form onSubmit={identify} className="max-w-xl space-y-4 rounded-xl border bg-white p-5"><h2 className="text-xl font-semibold">Identificación del lector</h2><p className="text-sm">El propietario solicita un nombre o correo para consultar esta experiencia. Son datos declarados; no crean una cuenta ni verifican tu identidad.</p>
      <label className="block text-sm" htmlFor={`${id}-name`}>Nombre (opcional si indicas correo)</label><input id={`${id}-name`} value={name} onChange={e => setName(e.target.value)} maxLength={80} autoComplete="off" className="w-full rounded-lg border p-2" />
      <label className="block text-sm" htmlFor={`${id}-email`}>Correo (opcional si indicas nombre)</label><input id={`${id}-email`} type="email" value={email} onChange={e => setEmail(e.target.value)} maxLength={254} autoComplete="off" className="w-full rounded-lg border p-2" />
      <button type="submit" disabled={busy} className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white disabled:opacity-50">{busy ? "Comprobando…" : "Continuar a la lectura"}</button></form>}
    {!view && !gate && !error && <p role="status">Abriendo experiencia…</p>}
    {error && <div role="alert" className="space-y-3 rounded-lg bg-red-50 p-4"><p>{error}</p>{!gate && <button type="button" onClick={() => { setError(""); setAttempt(a => a + 1); }} className="rounded-lg border px-3 py-2">Reintentar lectura</button>}</div>}
  </main>;
}
