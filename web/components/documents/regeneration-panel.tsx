"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useRequestResource } from "@/lib/reinforcements/use-request-resource";
import { regenerationViewSchema, regenerationJobSchema } from "@/lib/validations/regeneration";
import { reviewHeadSchema } from "@/lib/validations/example";
import { OwnerReviewPanel, type ReviewAction } from "@/components/documents/owner-review-panel";
import type { RequestRecord } from "@/lib/validations/request-list";
const parseView=(body:unknown)=>regenerationViewSchema.parse(body);
const buttonClass="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 disabled:opacity-50";
export function RegenerationPanel({request,active,onChanged}:{request:RequestRecord;active:boolean;onChanged:()=>void}) {
  const base=`/api/projects/${request.project_id}/reinforcement-requests/${request.id}`,router=useRouter(),id=useId();
  const [instructions,setInstructions]=useState(""),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
  const controllerRef=useRef<AbortController|null>(null),operationRef=useRef<{fingerprint:string;id:string}|null>(null);
  const resource=useRequestResource(`${base}/regeneration?documentId=${request.document_id}`,active&&!busy,parseView,true);
  const view=resource.result?.value;
  const processing=view?.processing??false;
  useEffect(()=>()=>{controllerRef.current?.abort()},[base,active]);
  async function execute(action:"prepare"|"regenerate"|ReviewAction) {
    if(!view||!active||controllerRef.current)return null;
    const reviewing=typeof action==="object",input={documentId:request.document_id,...(reviewing?action:{action,...(action==="regenerate"?{expectedVersion:view.review?.current_version,instructions}:{})})};
    const fingerprint=JSON.stringify(input);if(operationRef.current?.fingerprint!==fingerprint)operationRef.current={fingerprint,id:crypto.randomUUID()};
    const controller=new AbortController();controllerRef.current=controller;setBusy(true);setMessage("");let version:number|null=null;
    try {
      const response=await fetch(`${base}/${reviewing?"explanation/review":"regeneration"}`,{method:"POST",credentials:"same-origin",cache:"no-store",signal:controller.signal,
        headers:{"Content-Type":"application/json"},body:JSON.stringify({...input,...(action!=="prepare"?{operationId:operationRef.current.id}:{})})});
      const body=await response.json();if(!response.ok)throw Error(typeof body.message==="string"?body.message:"No fue posible completar la operación.");
      if(reviewing){version=reviewHeadSchema.parse(body.review).current_version;if(action.action==="approve")router.refresh()}
      else if(action==="regenerate") {
        if(response.status===202)setMessage("Hay una regeneración en curso. Actualiza para consultar su resultado.");
        else {const job=regenerationJobSchema.parse(body.job);setMessage(job.status==="ready"?`Nueva versión ${job.result_version} guardada. Revísala y apruébala expresamente antes de publicarla.`:"La regeneración no pudo completarse. Se conservan las versiones anteriores. Puedes reintentar.");operationRef.current=null}
      }
      resource.refresh();onChanged();
      window.dispatchEvent(new CustomEvent("reinforcement-review-updated",{detail:request.id}));
    }catch(cause){if(!controller.signal.aborted)setMessage(cause instanceof Error?cause.message:"No fue posible completar la operación.")}
    finally{if(controllerRef.current===controller){controllerRef.current=null;setBusy(false)}}
    return version;
  }
  if(!view?.kind||!view.ready&&!view.review)return resource.result?.error?<p role="alert">{resource.result.error}</p>:null;
  return <section aria-label="Ajustar y regenerar refuerzo" className="min-w-0 space-y-3 rounded-lg border border-slate-300 bg-white p-4 text-sm">
    <h4 className="font-semibold">Ajustar y regenerar refuerzo</h4>
    {view.kind==="explanation"&&!view.review&&<><p>La explicación generada es un borrador privado. Prepara su revisión para editarla, aprobarla o descartarla.</p><button type="button" className={buttonClass} disabled={!active||busy} onClick={()=>execute("prepare")}>Revisar explicación generada</button></>}
    {view.kind==="explanation"&&view.review&&<OwnerReviewPanel view={view} explanation disabled={!active||busy||processing} onReview={execute}/>}
    {view.review&&<form className="space-y-2" onSubmit={event=>{event.preventDefault();void execute("regenerate")}}>
      <p>Se usará la versión guardada {view.review.current_version}, su contexto y tus instrucciones. Guarda primero cualquier edición que quieras incluir.</p>
      <label className="block font-medium" htmlFor={id}>Instrucciones para regenerar</label>
      <textarea id={id} value={instructions} onChange={event=>setInstructions(event.target.value)} required minLength={3} maxLength={500} rows={3} disabled={!active||busy||processing} className="w-full rounded-lg border border-slate-300 p-2"/>
      <p>La nueva versión quedará pendiente. Se conserva la última aprobada en Refuerzos y el PDF original.</p>
      <button type="submit" className={buttonClass} disabled={!active||busy||processing||!view.ready||!view.providerAvailable||view.review.current_version>=100||instructions.trim().length<3}>Regenerar con instrucciones</button>
    </form>}
    {busy&&<p role="status">Procesando el ajuste. Puedes seguir consultando el PDF…</p>}
    {processing&&<p role="status">Hay una regeneración en curso. Las decisiones esperan su resultado.</p>}
    {message&&<p role="status" className="break-words">{message}</p>}
    {view.job?.status==="error"&&<p role="alert">{view.job.error_code==="timeout"?"El intento agotó su tiempo.":view.job.error_code==="provider_unavailable"?"Gemini no está disponible o su cuota gratuita se agotó; no se utilizará un proveedor de pago.":"El resultado no pudo verificarse con el PDF."} Se conservan el borrador y la versión aprobada anteriores.</p>}
    {view.job&&<details><summary className="cursor-pointer font-medium">Último ajuste solicitado</summary><p>Versión de origen: {view.job.expected_version} · Por ti · {new Date(view.job.started_at).toLocaleString("es-CO")}</p><p className="whitespace-pre-wrap break-words">{view.job.instructions}</p><p>{view.job.status==="ready"?`Guardado como versión ${view.job.result_version}`:view.job.status==="error"?"No completado":"En proceso"}</p></details>}
    <button type="button" className={buttonClass} disabled={!active||busy} onClick={()=>{resource.refresh();onChanged()}}>Actualizar ajustes</button>
  </section>;
}
