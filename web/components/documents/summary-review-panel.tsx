"use client";
import { useId, useState } from "react";
import { SUMMARY_LIMITS, normalizeConcept, type SummaryConcept, type SummaryView } from "@/lib/validations/summary";
export type SummaryReviewAction = { action:"edit";expectedVersion:number;title:string;text:string;concepts:SummaryConcept[] } | {action:"approve";expectedVersion:number;confirmed:true} | {action:"discard";expectedVersion:number};
const buttonClass="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 disabled:opacity-50";
function canonicalConcepts(concepts:SummaryConcept[]) {
  const seen=new Set<string>();return concepts.map(c=>({name:c.name.trim(),sourceQuote:c.sourceQuote.trim()})).filter(c=>{const key=normalizeConcept(c.name);if(!key||seen.has(key))return false;seen.add(key);return true});
}
export function SummaryReviewPanel({view,disabled,onReview}:{view:SummaryView;disabled:boolean;onReview:(action:SummaryReviewAction)=>Promise<number|null>}) {
  const current=view.versions.find(v=>v.version===view.review?.current_version);
  const [draft,setDraft]=useState(()=>current?.summary_content?{version:current.version,title:current.title,text:current.text,concepts:current.summary_content.concepts}:null);
  const [confirmed,setConfirmed]=useState(false),[discardVersion,setDiscardVersion]=useState<number|null>(null);const id=useId();
  if(!current?.summary_content||!view.review||!view.generation||!draft)return null;
  const outdated=draft.version!==current.version,changed=draft.title!==current.title||draft.text!==current.text||JSON.stringify(draft.concepts)!==JSON.stringify(current.summary_content.concepts);
  const max=SUMMARY_LIMITS[view.generation.mode],discarded=view.review.decision==="discarded";
  function updateConcept(index:number,key:keyof SummaryConcept,value:string){setDraft(previous=>previous?{...previous,concepts:previous.concepts.map((c,i)=>i===index?{...c,[key]:value}:c)}:previous);setConfirmed(false)}
  return <section aria-label="Revisión del resumen" className="min-w-0 space-y-3 rounded-lg border border-slate-300 p-3 text-sm">
    <h5 className="font-semibold">Revisar resumen y conceptos</h5>
    {discarded?<p role="status">Borrador descartado. El PDF permanece intacto.{view.review.approved_version_id?" Se conserva el resumen aprobado anterior.":" No se publicó contenido."}</p>:<>
      <p>Versión {current.version} · {current.origin==="ai"?"Generada por IA":"Editada por ti"} · {view.review.decision==="approved"?"Aprobada por ti":"Pendiente de aprobación"}</p>
      {outdated&&<div role="alert" className="space-y-2 rounded-lg bg-amber-50 p-3"><p>Hay una versión más reciente. Tus cambios locales se conservan; cópialos si los necesitas antes de cargarla.</p>
        <button type="button" className={buttonClass} disabled={disabled} onClick={()=>{setDraft({version:current.version,title:current.title,text:current.text,concepts:current.summary_content!.concepts});setConfirmed(false);setDiscardVersion(null)}}>Cargar resumen actual</button></div>}
      <form className="space-y-3" onSubmit={event=>{event.preventDefault();if(disabled||outdated||!changed)return;void onReview({action:"edit",expectedVersion:draft.version,title:draft.title,text:draft.text,concepts:draft.concepts}).then(version=>{if(version!==null){setDraft({...draft,version,title:draft.title.trim(),text:draft.text.trim(),concepts:canonicalConcepts(draft.concepts)});setConfirmed(false);setDiscardVersion(null)}})}}>
        <label className="block font-medium" htmlFor={`${id}-title`}>Título del resumen</label>
        <input id={`${id}-title`} value={draft.title} required minLength={3} maxLength={160} disabled={disabled} onChange={event=>{setDraft({...draft,title:event.target.value});setConfirmed(false)}} className="w-full rounded-lg border border-slate-300 p-2" />
        <label className="block font-medium" htmlFor={`${id}-text`}>Texto del resumen</label>
        <textarea id={`${id}-text`} value={draft.text} required minLength={80} maxLength={max} rows={5} disabled={disabled} onChange={event=>{setDraft({...draft,text:event.target.value});setConfirmed(false)}} className="w-full rounded-lg border border-slate-300 p-2" />
        <p>{draft.text.length}/{max} caracteres. Mantén solo afirmaciones sustentadas por el PDF.</p>
        <fieldset className="space-y-3" disabled={disabled}><legend className="font-semibold">Editar conceptos clave</legend>
          {draft.concepts.map((concept,index)=><div key={index} className="space-y-2 rounded-lg border border-slate-200 p-3">
            <label className="block" htmlFor={`${id}-concept-${index}`}>Concepto {index+1}</label><input id={`${id}-concept-${index}`} value={concept.name} required minLength={2} maxLength={80} onChange={event=>updateConcept(index,"name",event.target.value)} className="w-full rounded-lg border border-slate-300 p-2" />
            <label className="block" htmlFor={`${id}-quote-${index}`}>Cita del concepto {index+1}</label><textarea id={`${id}-quote-${index}`} value={concept.sourceQuote} required minLength={8} maxLength={500} rows={2} onChange={event=>updateConcept(index,"sourceQuote",event.target.value)} className="w-full rounded-lg border border-slate-300 p-2" />
            <button type="button" className={buttonClass} onClick={()=>{setDraft({...draft,concepts:draft.concepts.filter((_,i)=>i!==index)});setConfirmed(false)}}>Eliminar concepto {index+1}</button>
          </div>)}
          <button type="button" className={buttonClass} disabled={draft.concepts.length>=8} onClick={()=>{setDraft({...draft,concepts:[...draft.concepts,{name:"",sourceQuote:""}]});setConfirmed(false)}}>Agregar concepto</button>
        </fieldset>
        <p>De uno a ocho conceptos. Cada nombre debe aparecer en una cita literal de la selección o del contexto de esta página. Se eliminan vacíos y duplicados al guardar.</p>
        <button type="submit" className={buttonClass} disabled={disabled||outdated||!changed||!draft.concepts.length}>Guardar revisión como borrador</button>
      </form>
      <p>Guardar conserva las versiones anteriores y deja esta revisión pendiente. Solo una aprobación explícita la muestra en Refuerzos.</p>
      {view.review.decision==="pending"&&<div className="space-y-2"><label className="flex items-start gap-2"><input type="checkbox" checked={confirmed} disabled={disabled||outdated||changed} onChange={event=>setConfirmed(event.target.checked)} /><span>He contrastado el resumen y sus conceptos con el PDF y apruebo esta versión.</span></label>
        <button type="button" className={buttonClass} disabled={disabled||outdated||changed||!confirmed} onClick={()=>onReview({action:"approve",confirmed:true,expectedVersion:current.version})}>Aprobar resumen</button>
        <button type="button" className={buttonClass} disabled={disabled||outdated} onClick={()=>setDiscardVersion(current.version)}>Descartar resumen</button>
        {discardVersion===current.version&&!outdated&&<div className="space-y-2 rounded-lg bg-amber-50 p-3"><p>Se descartará esta versión sin modificar el PDF ni una aprobación anterior.</p><button type="button" className={buttonClass} disabled={disabled} onClick={()=>onReview({action:"discard",expectedVersion:current.version}).then(v=>{if(v!==null)setDiscardVersion(null)})}>Confirmar descarte del resumen</button><button type="button" className={buttonClass} disabled={disabled} onClick={()=>setDiscardVersion(null)}>Conservar resumen</button></div>}
      </div>}
    </>}
    <details><summary className="cursor-pointer font-medium">Versiones y decisiones del resumen</summary><ul className="mt-2 space-y-2">{view.versions.map(v=><li key={v.id}>Versión {v.version} · {v.origin==="ai"?"IA":"Propietario"} · {new Date(v.created_at).toLocaleString("es-CO")}<details><summary className="cursor-pointer">Consultar resumen de versión {v.version}</summary><p className="whitespace-pre-wrap break-words">{v.text}</p><ul>{v.summary_content?.concepts.map(c=><li key={c.name}>{c.name}: {c.sourceQuote}</li>)}</ul></details></li>)}</ul>
      <ul className="mt-3 space-y-1">{view.events.map(e=><li key={e.operation_id}>{e.action==="edit"?"Edición":e.action==="approve"?"Aprobación":e.action==="regenerate"?"Nueva generación":"Descarte"} por ti · Versión {e.version} · {new Date(e.occurred_at).toLocaleString("es-CO")}</li>)}</ul><p>Se muestran las 20 versiones y decisiones más recientes.</p>
    </details>
  </section>;
}
