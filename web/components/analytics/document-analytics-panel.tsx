"use client";
import { useEffect, useId, useState } from "react";
import { analyticsFilterSchema, documentAnalyticsSchema, type AnalyticsDocument, type DocumentAnalytics } from "@/lib/validations/analytics";

export function DocumentAnalyticsPanel({ documents, initialFrom, initialTo }: { documents: AnalyticsDocument[]; initialFrom: string; initialTo: string }) {
  const id = useId(), [options, setOptions] = useState(documents), [projectId, setProjectId] = useState(documents[0]?.projectId ?? "");
  const [from, setFrom] = useState(initialFrom), [to, setTo] = useState(initialTo), [refresh, setRefresh] = useState(0), [exporting, setExporting] = useState(false);
  const [resource, setResource] = useState<{ key: string; data?: DocumentAnalytics; error?: string } | null>(null);
  const [exportedKey, setExportedKey] = useState<string | null>(null);
  const selected = options.find(d => d.projectId === projectId), filter = analyticsFilterSchema.safeParse({ projectId, documentId: selected?.id, from, to });
  const url = filter.success ? "/api/analytics?" + new URLSearchParams({ projectId, documentId: filter.data.documentId, from, to }).toString() : null;
  const key = `${url}:${refresh}`, current = resource?.key === key ? resource : null, data = current?.data;
  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    void (async () => { try {
      const response = await fetch(url, { cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20000)]) });
      const body = await response.json();
      if (!response.ok) { if ([401, 403].includes(response.status) && !controller.signal.aborted) setOptions([]); throw Error(body.message ?? "No fue posible consultar la analítica."); }
      const parsed = documentAnalyticsSchema.parse(body), query = new URLSearchParams(url.split("?")[1]);
      if (parsed.document.id !== query.get("documentId") || parsed.document.projectId !== query.get("projectId") || parsed.from !== query.get("from") || parsed.to !== query.get("to")) throw Error("La respuesta no corresponde a los filtros actuales.");
      if (!controller.signal.aborted) setResource({ key, data: parsed });
    } catch (e) { if (!controller.signal.aborted) setResource({ key, error: e instanceof Error && e.name === "TimeoutError" ? "La consulta tardó demasiado. Reintenta." : e instanceof TypeError ? "No fue posible conectar. Revisa tu conexión y reintenta." : e instanceof Error ? e.message : "No fue posible consultar la analítica." }); } })();
    return () => controller.abort();
  }, [url, key]);
  async function download() {
    if (!data || !url || exporting) return;
    setExporting(true); setExportedKey(null);
    try {
      const response = await fetch(`${url}&through=${encodeURIComponent(data.through)}&format=csv`, { cache: "no-store", signal: AbortSignal.timeout(20000) });
      if (!response.ok) { const body = await response.json(); if ([401, 403].includes(response.status)) setOptions([]); throw Error(body.message ?? "No fue posible exportar la analítica."); }
      if (!response.headers.get("content-type")?.startsWith("text/csv")) throw Error("No fue posible validar el archivo exportado.");
      const blob = await response.blob(), objectUrl = URL.createObjectURL(blob), anchor = document.createElement("a");
      anchor.href = objectUrl; anchor.download = `analitica-${data.document.id}-${data.from}-${data.to}.csv`; document.body.append(anchor); anchor.click(); anchor.remove();
      setExportedKey(key);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (e) { setResource({ key, error: e instanceof Error ? e.message : "No fue posible exportar la analítica." }); }
    finally { setExporting(false); }
  }
  const total = data?.totals, hasData = total && total.visits + total.opens + total.quizAttempts + total.feedback > 0;
  return <section aria-labelledby={`${id}-title`} className="min-w-0 space-y-5">
    <h2 id={`${id}-title`} className="text-xl font-semibold">Indicadores por documento y periodo</h2>
    <p className="text-sm text-slate-600">Fechas inclusivas en hora de Colombia (America/Bogota). Cada indicador cuenta la fecha de su propio registro. Se incluyen publicaciones retiradas; las pruebas privadas no cuentan.</p>
    <fieldset disabled={exporting} className="grid min-w-0 gap-4 rounded-xl border bg-white p-4 sm:grid-cols-2 lg:grid-cols-3">
      <div className="min-w-0"><label htmlFor={`${id}-document`} className="block text-sm font-medium">Documento</label><select id={`${id}-document`} value={projectId} onChange={e => setProjectId(e.target.value)} className="mt-1 min-h-11 w-full min-w-0 rounded-lg border p-2">
        {!options.length && <option value="">Sin documentos disponibles</option>}{options.map(d => <option key={d.projectId} value={d.projectId}>{d.name}</option>)}
      </select></div>
      <div><label htmlFor={`${id}-from`} className="block text-sm font-medium">Desde</label><input id={`${id}-from`} type="date" value={from} onChange={e => setFrom(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border p-2" /></div>
      <div><label htmlFor={`${id}-to`} className="block text-sm font-medium">Hasta</label><input id={`${id}-to`} type="date" value={to} onChange={e => setTo(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border p-2" /></div>
    </fieldset>
    <div className="flex flex-wrap gap-3"><button type="button" disabled={!url || exporting} onClick={() => setRefresh(n => n + 1)} className="min-h-11 rounded-lg border px-4 py-2 disabled:opacity-50">Actualizar indicadores</button>
      <button type="button" disabled={!data || exporting} onClick={() => void download()} className="min-h-11 rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white disabled:opacity-50">{exporting ? "Exportando…" : "Exportar CSV"}</button></div>
    {exportedKey === key && data && <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-900">CSV preparado para {data.document.name}, del {data.from} al {data.to}. Revisa las descargas de tu navegador.</p>}
    {!options.length && <p role="status">No tienes documentos disponibles para consultar analítica. Si tu sesión cambió, vuelve a iniciar sesión.</p>}
    {options.length > 0 && !filter.success && <p role="alert">Elige fechas válidas; la inicial no puede superar la final.</p>}
    {url && !current && <p role="status">Consultando los indicadores del documento…</p>}
    {current?.error && <p role="alert" className="break-words rounded-lg bg-red-50 p-4 text-red-800">{current.error}</p>}
    {data && total && <>
      <h3 className="break-words font-semibold">{data.document.name} · {data.from} a {data.to}</h3>
      <p className="text-xs text-slate-600">Corte de consulta: {new Date(data.through).toLocaleString("es-CO", { timeZone: data.timeZone })} · El CSV utiliza este mismo corte.</p>
      {!hasData && <p role="status" className="rounded-lg border bg-blue-50 p-4">No hay registros para este documento y periodo.</p>}
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">{[["Visitas", total.visits], ["Aperturas de refuerzo", total.opens], ["Intentos de quiz", total.quizAttempts], ["Valoraciones", total.feedback]].map(([label, value]) => <div key={label} className="min-w-0 rounded-xl border bg-white p-4"><dt className="text-sm text-slate-600">{label}</dt><dd className="mt-1 text-3xl font-bold">{value}</dd></div>)}</dl>
      <p className="text-sm">Las visitas agrupan las aperturas de una sesión durante 30 minutos. Las aperturas cuentan consultas a contenido expandido, no los indicadores sobre el PDF. Los intentos incluyen los reintentos permitidos.</p>
      <p className="text-sm">Quiz: {total.correctAnswers} respuestas correctas de {total.answeredQuestions} · {total.accuracy === null ? "Sin respuestas" : `${total.accuracy} % de aciertos`}. Valoraciones: {total.useful} Útil · {total.unclear} Sigue sin ser claro.</p>
      {total.excludedQuizAttempts > 0 && <p role="alert" className="text-sm text-amber-900">Se excluyeron {total.excludedQuizAttempts} intentos que no corresponden a la instantánea evaluada. Revisa los registros antes de interpretar los resultados.</p>}
      {data.reinforcements.length > 0 && <section aria-label="Uso y valoraciones por refuerzo" className="min-w-0"><h3 className="mb-2 font-semibold">Uso y valoraciones por refuerzo publicado</h3><div role="region" aria-label="Tabla de uso y valoraciones" tabIndex={0} className="max-w-full overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[38rem] text-left text-sm"><thead className="bg-slate-100"><tr>{["Refuerzo", "Página", "Publicación", "Aperturas", "Útil", "Sigue sin ser claro"].map(v => <th key={v} scope="col" className="p-3">{v}</th>)}</tr></thead><tbody>{data.reinforcements.map((r, i) => <tr key={`${r.id}:${r.publicationVersion}:${i}`} className="border-t"><th scope="row" className="max-w-xs break-words p-3 font-medium">{r.title}</th><td className="p-3">{r.pageNumber}</td><td className="p-3">{r.publicationVersion ?? "Histórica"}</td><td className="p-3">{r.opens}</td><td className="p-3">{r.useful}</td><td className="p-3">{r.unclear}</td></tr>)}</tbody></table>
      </div></section>}
      {data.quizzes.length > 0 && <section aria-label="Resultados por versión de quiz" className="min-w-0"><h3 className="mb-2 font-semibold">Resultados por versión evaluada</h3><div role="region" aria-label="Tabla de resultados de quiz" tabIndex={0} className="max-w-full overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[42rem] text-left text-sm"><thead className="bg-slate-100"><tr>{["Quiz", "Página", "Publicación", "Versión", "Intentos", "Correctas / respondidas", "Aciertos"].map(v => <th key={v} scope="col" className="p-3">{v}</th>)}</tr></thead><tbody>{data.quizzes.map(q => <tr key={`${q.id}:${q.publicationVersion}`} className="border-t"><th scope="row" className="max-w-xs break-words p-3 font-medium">{q.title}</th><td className="p-3">{q.pageNumber}</td><td className="p-3">{q.publicationVersion}</td><td className="p-3">{q.quizVersion}</td><td className="p-3">{q.attempts}</td><td className="p-3">{q.correct} / {q.questions}</td><td className="p-3">{q.accuracy} %</td></tr>)}</tbody></table>
      </div></section>}
    </>}
  </section>;
}
