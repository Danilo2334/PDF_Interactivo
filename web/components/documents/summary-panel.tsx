"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useRequestResource } from "@/lib/reinforcements/use-request-resource";
import { SummaryReviewPanel, type SummaryReviewAction } from "@/components/documents/summary-review-panel";
import { SummaryResource } from "@/components/documents/summary-resource";
import { SUMMARY_MODES, SUMMARY_LABELS, SUMMARY_MESSAGES, summaryViewSchema, summaryRecordSchema, type SummaryMode } from "@/lib/validations/summary";
import { reviewHeadSchema } from "@/lib/validations/example";
import type { RequestRecord } from "@/lib/validations/request-list";
const parseView=(body:unknown)=>summaryViewSchema.parse(body);
const buttonClass="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 disabled:opacity-50";
export function SummaryPanel({request,active,onChanged}:{request:RequestRecord;active:boolean;onChanged:()=>void}) {
  const name=useId(),router=useRouter(),base=`/api/projects/${request.project_id}/reinforcement-requests/${request.id}`;
  const [mode,setMode]=useState<SummaryMode|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const controllerRef=useRef<AbortController|null>(null),operationRef=useRef<{fingerprint:string;id:string}|null>(null);
  const resource=useRequestResource(`${base}/summary?documentId=${request.document_id}`,active&&!busy,parseView,true);
  const view=resource.result?.value,generation=view?.generation,selected=mode??generation?.mode??null;
  const saved=!!generation&&selected===generation.mode&&generation.choice_version===view?.choiceVersion;
  const current=view?.versions.find(v=>v.version===view.review?.current_version);
  useEffect(()=>()=>{controllerRef.current?.abort()},[base,active]);
  async function execute(action:"configure"|"generate"|SummaryReviewAction) {
    if(!view||!active||controllerRef.current)return null;
    const review=typeof action==="object",input={documentId:request.document_id,...(review?action:{action,expectedVersion:generation?.version??0,choiceVersion:view.choiceVersion,...(action==="configure"?{mode:selected}:{})})};
    const fingerprint=JSON.stringify(input);if(operationRef.current?.fingerprint!==fingerprint)operationRef.current={fingerprint,id:crypto.randomUUID()};
    const controller=new AbortController();controllerRef.current=controller;setBusy(true);setError("");let success=false,version:number|null=null;
    try {
      const response=await fetch(`${base}/summary${review?"/review":""}`,{method:"POST",credentials:"same-origin",cache:"no-store",signal:controller.signal,headers:{"Content-Type":"application/json"},body:JSON.stringify({...input,...(review?{operationId:operationRef.current.id}:{})})});
      const body=await response.json();if(!response.ok)throw Error(typeof body.message==="string"?body.message:"No fue posible completar la operación.");
      if(review)version=reviewHeadSchema.parse(body.review).current_version;else summaryRecordSchema.parse(body.generation);
      success=true;if(action==="configure")setMode(null);if(review&&action.action==="approve")router.refresh();
    }catch(cause){if(!controller.signal.aborted)setError(cause instanceof Error?cause.message:"No fue posible completar la operación.")}
    finally{if(controllerRef.current===controller){controllerRef.current=null;setBusy(false);if(success){resource.refresh();onChanged()}}}
    return success?version:null;
  }
  return <section aria-label="Resumen y conceptos clave" className="min-w-0 space-y-3 rounded-lg border border-slate-200 bg-white p-4">
    <h4 className="font-semibold">Resumen y conceptos clave</h4><p className="text-sm">Guarda una extensión y genera las ideas esenciales. Revisa el resumen y las citas de sus conceptos antes de aprobar.</p>
    {!view&&!resource.result?.error&&<p role="status">Consultando resumen…</p>}
    {view&&!view.summaryChosen&&<p className="text-sm">Guarda primero la opción Resumen en las recomendaciones.</p>}
    {view?.summaryChosen&&!view.review&&<><form onSubmit={event=>{event.preventDefault();void execute("configure")}}><fieldset disabled={!active||busy||!view.canConfigure} className="space-y-2"><legend className="font-medium">Extensión del resumen</legend>
      {SUMMARY_MODES.map(value=><label key={value} className="flex items-start gap-2 rounded-lg border border-slate-200 p-3 text-sm"><input type="radio" name={name} checked={selected===value} onChange={()=>setMode(value)}/><span>{SUMMARY_LABELS[value]}</span></label>)}
      <button type="submit" className={buttonClass} disabled={!selected||saved}>Guardar extensión</button></fieldset></form>
      <button type="button" className={buttonClass} disabled={!active||busy||!view.canGenerate||!saved} onClick={()=>void execute("generate")}>{generation?.status==="error"||generation?.status==="processing"?"Reintentar resumen":"Generar resumen"}</button></>}
    {generation&&<p className="text-sm font-medium">Extensión guardada: {SUMMARY_LABELS[generation.mode]}</p>}
    {view?.summaryChosen&&!view.providerAvailable&&<p className="text-sm">El servicio de IA no está configurado. Guardar o revisar no consume IA.</p>}
    <button type="button" className={buttonClass} disabled={!active||busy} onClick={()=>{setError("");resource.refresh();onChanged()}}>Actualizar resumen</button>
    {busy&&<p role="status">Guardando o generando el resumen…</p>}
    {!busy&&generation?.status==="processing"&&<p role="status">El resumen está en proceso. Actualiza para consultar el resultado.</p>}
    {(error||resource.result?.error)&&<p role="alert" className="break-words text-sm text-red-700">{error||resource.result?.error}</p>}
    {generation?.status==="error"&&<p role="alert" className="text-sm text-red-700">{SUMMARY_MESSAGES[generation.error_code??"invalid_summary"]}</p>}
    {view?.summaryChosen&&current?.summary_content&&view.review?.decision!=="discarded"&&<article className="min-w-0 space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
      <p className="font-semibold">Contenido generado por IA{current.origin==="owner"?" · Editado por ti":""} · {view.review?.decision==="approved"?"Aprobado por ti":"Pendiente de aprobación"}</p><p>Página {request.page_number} · Versión {current.version}</p>
      <details><summary className="cursor-pointer font-medium">Texto original de la selección</summary><blockquote className="whitespace-pre-wrap break-words">{request.selected_text}</blockquote></details>
      <h5 className="font-semibold">{current.title}</h5><SummaryResource value={current.summary_content}/><p>El resumen es adicional. El PDF original permanece intacto.</p>
    </article>}
    {view?.summaryChosen&&view.review&&<SummaryReviewPanel view={view} disabled={!active||busy||generation?.status!=="ready"} onReview={value=>execute(value)}/>}
  </section>;
}
