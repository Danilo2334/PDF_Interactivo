"use client";
import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import { z } from "zod";
import type { Reinforcement } from "@/lib/types/reinforcement";
import { allowedMediaUrl, MEDIA_DOMAINS, mediaFileMetadata, mediaRecordSchema, type MediaRecord } from "@/lib/validations/reinforcement-media";

function MediaAsset({ item, fileUrl, canManage, onRemove, busy }: { item: MediaRecord; fileUrl: string; canManage: boolean; busy: boolean; onRemove: () => void }) {
  const [preview, setPreview] = useState(false), [error, setError] = useState(false);
  return <li className="min-w-0 space-y-2 rounded-lg border border-slate-200 p-3">
    <p className="break-words text-sm font-semibold" style={{ overflowWrap: "anywhere" }}>{item.title}</p>
    <p className="break-words text-xs text-slate-600">Recurso aprobado · {item.kind === "link" ? "Enlace" : `${item.file_name} · ${(item.size_bytes / 1024 / 1024).toFixed(2)} MB`}</p>
    {item.kind === "link" ? (allowedMediaUrl(item.url ?? "") ? <a href={item.url!} target="_blank" rel="noopener noreferrer" className="block break-all text-sm text-blue-800 underline">{item.url} (abre otra pestaña)</a> : <p role="alert">Enlace no disponible.</p>)
      : !preview ? <button type="button" onClick={() => setPreview(true)} className="rounded-lg border border-blue-300 px-3 py-2 text-sm font-semibold text-blue-800">{item.kind === "image" ? "Ver imagen guardada" : "Ver video guardado"}</button>
      : item.kind === "image" ? <Image src={fileUrl} alt={item.title} width={640} height={400} unoptimized onError={() => setError(true)} className="h-auto max-h-80 w-full object-contain" />
      : <video src={fileUrl} aria-label={item.title} controls playsInline preload="metadata" onError={() => setError(true)} className="max-h-80 w-full">Tu navegador no puede reproducir este video.</video>}
    {error && <p role="alert" className="text-sm text-red-700">No se pudo abrir el archivo. Actualiza los recursos o reintenta.</p>}
    {canManage && <button type="button" disabled={busy} onClick={onRemove} style={{ overflowWrap: "anywhere" }} className="max-w-full rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold text-red-800 disabled:opacity-60">Retirar recurso: {item.title}</button>}
  </li>;
}

export function ReinforcementMedia({ reinforcement: item, projectId, canManage }: { reinforcement: Reinforcement; projectId: string; canManage: boolean }) {
  const id = useId(), fileInput = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<MediaRecord[]>(item.media ?? []);
  const [kind, setKind] = useState<"image" | "video" | "link">("image");
  const [file, setFile] = useState<File | null>(null), [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [url, setUrl] = useState(""), [title, setTitle] = useState(""), [approved, setApproved] = useState(false);
  const [ready, setReady] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const operation = useRef<{ key: string; id: string } | null>(null);
  const endpoint = `/api/projects/${projectId}/reinforcement-requests/${item.source_request_id}/media?documentId=${item.document_id}&reinforcementId=${item.id}`;
  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);
  function clear() { setFile(null); setPreviewUrl(null); setUrl(""); setTitle(""); setApproved(false); setReady(false); operation.current = null; if (fileInput.current) fileInput.current.value = ""; }
  function choose(file: File | null) {
    setApproved(false); setReady(false); setMessage(""); operation.current = null;
    if (!file) { setFile(null); setPreviewUrl(null); return; }
    const meta = mediaFileMetadata(file);
    if (meta.error !== undefined || meta.kind !== kind) { setFile(null); setPreviewUrl(null); setMessage(meta.error ?? "El archivo no corresponde al tipo elegido."); return; }
    setFile(file); setPreviewUrl(URL.createObjectURL(file));
  }
  async function refresh() {
    setBusy(true); setMessage("");
    try { const response = await fetch(endpoint, { cache: "no-store", signal: AbortSignal.timeout(20000) }); const body = await response.json();
      const parsed = z.array(mediaRecordSchema).safeParse(body.items);
      if (!response.ok || !parsed.success) { setMessage(body.message ?? "No fue posible actualizar los recursos."); return; }
      setItems(parsed.data);
    } catch { setMessage("No fue posible actualizar los recursos. Reintenta."); } finally { setBusy(false); }
  }
  const link = kind === "link" ? allowedMediaUrl(url.trim()) : null;
  const previewReady = kind === "link" ? !!link : ready && !!file;
  const canSave = canManage && item.approved_version_id && title.trim().length >= 3 && previewReady && approved && !busy;
  async function save() {
    if (!canSave) return;
    const key = JSON.stringify([title.trim(), kind, link, file?.name, file?.size, file?.lastModified]);
    if (operation.current?.key !== key) operation.current = { key, id: crypto.randomUUID() };
    const form = new FormData(); form.set("metadata", JSON.stringify({ documentId: item.document_id, reinforcementId: item.id,
      approvedVersionId: item.approved_version_id, assetId: operation.current.id, kind, title: title.trim(), approved: true, ...(kind === "link" ? { url: link } : {}) }));
    if (file) form.set("file", file);
    setBusy(true); setMessage("");
    try {
      const response = await fetch(endpoint, { method: "POST", body: form, signal: AbortSignal.timeout(60000) }); const body = await response.json();
      const parsed = mediaRecordSchema.safeParse(body.item);
      if (!response.ok || !parsed.success) { setMessage(body.message ?? "No fue posible confirmar el recurso. Reintenta sin cambiar los datos."); return; }
      setItems(previous => [...previous.filter(value => value.id !== parsed.data.id), parsed.data]); clear(); setMessage("Recurso aprobado y guardado en este refuerzo.");
    } catch { setMessage("No se pudo confirmar la carga. Reintenta sin cambiar los datos; no se duplicará la operación."); } finally { setBusy(false); }
  }
  async function remove(resource: MediaRecord) {
    setBusy(true); setMessage("");
    try { const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(20000),
      body: JSON.stringify({ action: "remove", documentId: item.document_id, reinforcementId: item.id, assetId: resource.id }) });
      const body = await response.json(); if (!response.ok || body.removed !== true) { setMessage(body.message ?? "No se confirmó la retirada. Actualiza antes de reintentar."); return; }
      setItems(previous => previous.filter(value => value.id !== resource.id)); setMessage("Recurso retirado del refuerzo.");
    } catch { setMessage("No se confirmó la retirada. Actualiza los recursos para comprobar el estado."); } finally { setBusy(false); }
  }
  return <section aria-labelledby={`${id}-title`} className="mt-5 min-w-0 space-y-3 border-t border-slate-200 pt-4">
    <h4 id={`${id}-title`} className="font-semibold">Recursos multimedia</h4>
    <button type="button" disabled={busy} onClick={() => void refresh()} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">Actualizar recursos</button>
    {items.length ? <ul className="space-y-3">{items.map(resource => <MediaAsset key={resource.id} item={resource} canManage={canManage} busy={busy}
      fileUrl={`/api/projects/${projectId}/reinforcement-requests/${item.source_request_id}/media/${resource.id}?documentId=${item.document_id}`} onRemove={() => void remove(resource)} />)}</ul>
      : <p className="text-sm text-slate-600">Este refuerzo todavía no tiene recursos multimedia aprobados.</p>}
    {canManage && item.approved_version_id && <fieldset disabled={busy} className="min-w-0 space-y-3 rounded-lg bg-slate-50 p-3">
      <legend className="text-sm font-semibold">Agregar recurso al refuerzo</legend>
      <label className="block text-sm" htmlFor={`${id}-kind`}>Tipo de recurso</label>
      <select id={`${id}-kind`} value={kind} onChange={event => { clear(); setKind(event.target.value as typeof kind); setMessage(""); }} className="w-full rounded-lg border border-slate-300 bg-white p-2">
        <option value="image">Imagen</option><option value="video">Video</option><option value="link">Enlace externo</option>
      </select>
      <label className="block text-sm" htmlFor={`${id}-label`}>Título o descripción del recurso</label>
      <input id={`${id}-label`} value={title} minLength={3} maxLength={160} onChange={event => { setTitle(event.target.value); setApproved(false); }} className="w-full rounded-lg border border-slate-300 bg-white p-2" />
      {kind === "link" ? <>
        <label className="block text-sm" htmlFor={`${id}-url`}>Dirección HTTPS</label>
        <input id={`${id}-url`} type="url" value={url} maxLength={2000} onChange={event => { setUrl(event.target.value); setApproved(false); }} className="w-full rounded-lg border border-slate-300 bg-white p-2" />
        <p className="break-words text-xs text-slate-600">Dominios permitidos: {MEDIA_DOMAINS.join(", ")}. Sin redirecciones, credenciales ni parámetros externos.</p>
        {url && !link && <p role="alert" className="text-sm text-red-700">Enlace no permitido: revisa protocolo, dominio y estructura.</p>}
        {link && <div className="break-all rounded-lg border border-slate-300 p-3 text-sm"><p className="font-semibold">Vista previa del enlace · {new URL(link).hostname}</p><p>{title || "Añade un título"}</p><p>{link}</p><p className="mt-2 text-xs">Se abrirá en otra pestaña; no se carga contenido externo automáticamente.</p></div>}
      </> : <>
        <label className="block text-sm" htmlFor={`${id}-file`}>{kind === "image" ? "Imagen PNG o JPEG (máximo 5 MB)" : "Video MP4 (máximo 20 MB)"}</label>
        <input ref={fileInput} id={`${id}-file`} type="file" accept={kind === "image" ? "image/png,image/jpeg,.png,.jpg,.jpeg" : "video/mp4,.mp4"} onChange={event => choose(event.target.files?.[0] ?? null)} className="w-full min-w-0 text-sm" />
        {file && <p className="break-all text-xs text-slate-600">{file.name} · {file.type} · {(file.size / 1024 / 1024).toFixed(2)} MB</p>}
        {previewUrl && (kind === "image" ? <Image key={previewUrl} src={previewUrl} alt={title || "Vista previa de la imagen seleccionada"} width={640} height={400} unoptimized
          onLoad={event => { const valid = event.currentTarget.naturalWidth * event.currentTarget.naturalHeight <= 16000000; setReady(valid); if (!valid) setMessage("La imagen supera los 16 megapíxeles."); }} onError={() => { setReady(false); setMessage("No se puede previsualizar esta imagen. Elige un archivo válido."); }} className="h-auto max-h-64 w-full object-contain" />
          : <video key={previewUrl} src={previewUrl} controls playsInline preload="metadata" aria-label="Vista previa del video seleccionado" onLoadedMetadata={event => setReady(event.currentTarget.videoWidth > 0 && Number.isFinite(event.currentTarget.duration) && event.currentTarget.duration > 0)}
            onError={() => { setReady(false); setMessage("No se puede reproducir este MP4. Revisa el archivo y su codificación."); }} className="max-h-64 w-full" />)}
      </>}
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={approved} disabled={!previewReady} onChange={event => setApproved(event.target.checked)} className="mt-1" />Revisé la vista previa y apruebo este recurso</label>
      <div className="flex flex-wrap gap-2"><button type="button" disabled={!canSave} onClick={() => void save()} className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Guardando recurso…" : "Guardar recurso aprobado"}</button>
        <button type="button" onClick={() => { clear(); setMessage("Recurso del formulario retirado sin guardar."); }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">Retirar recurso del formulario</button></div>
    </fieldset>}
    {message && <p role="status" className="break-words text-sm text-slate-800">{message}</p>}
  </section>;
}
