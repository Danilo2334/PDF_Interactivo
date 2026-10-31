import "server-only";
import { authorizeRequest, readSmallJson, reply } from "@/lib/reinforcements/request-service";
import { isSameOriginMutation } from "@/lib/documents/mutation-request";
import { regenerationInputSchema, regenerationJobSchema, regenerationViewSchema } from "@/lib/validations/regeneration";
import { analysisRecordSchema, validateDiagnosis } from "@/lib/validations/contextual-analysis";
import { explanationRecordSchema, EXPLANATION_MESSAGES } from "@/lib/validations/explanation";
import { exampleRecordSchema } from "@/lib/validations/example";
import { summaryRecordSchema } from "@/lib/validations/summary";
import { visualRecordSchema } from "@/lib/validations/visual";
import { getAiConfiguration } from "@/lib/reinforcements/ai-provider";
import { generateExplanation } from "@/lib/reinforcements/explanation-provider";
import { generateExample } from "@/lib/reinforcements/example-provider";
import { generateSummary } from "@/lib/reinforcements/summary-provider";
import { generateVisual } from "@/lib/reinforcements/visual-provider";
import { signRegenerationProof } from "@/lib/reinforcements/regeneration-proof";

function failure(code?:string) {
  const status=code==="42501"?403:["PT409","23514"].includes(code??"")?409:code==="P0001"?429:503;
  return reply({message:status===403?"Ya no tienes permiso para este refuerzo.":status===409?"La versión cambió o hay una regeneración en curso. Actualiza antes de continuar.":status===429?"Hay varios intentos recientes. Espera antes de reintentar.":"No fue posible confirmar la operación. Actualiza antes de reintentar."},status);
}
export async function getRegeneration(request:Request,projectId:string,requestId:string) {
  const access=await authorizeRequest(projectId,requestId,new URL(request.url).searchParams.get("documentId"));if(access.response)return access.response;
  const queries=await Promise.all([
    access.db.from("reinforcement_requests").select("recommended_type").eq("id",requestId).maybeSingle(),
    access.db.from("reinforcement_review_heads").select("*").eq("request_id",requestId).maybeSingle(),
    access.db.from("reinforcement_review_versions").select("*").eq("request_id",requestId).order("version",{ascending:false}).limit(20),
    access.db.from("reinforcement_review_events").select("operation_id,request_id,version,action,actor_id,occurred_at").eq("request_id",requestId).order("occurred_at",{ascending:false}).limit(20),
    access.db.from("reinforcement_regenerations").select("*").eq("request_id",requestId).order("started_at",{ascending:false}).limit(1),
  ]);
  if(queries.some(q=>q.error))return failure();
  const kind=queries[0].data?.recommended_type,table=kind==="explanation"?"reinforcement_generations":kind==="example"?"reinforcement_examples":kind==="summary"?"reinforcement_summaries":kind==="image"?"reinforcement_visuals":null;
  const generation=table?await access.db.from(table).select("status").eq("request_id",requestId).maybeSingle():null;
  if(generation?.error)return failure();
  const job=queries[4].data?.[0]??null;
  const result=regenerationViewSchema.safeParse({kind:table?kind:null,ready:generation?.data?.status==="ready",providerAvailable:getAiConfiguration()!==null,
    processing:job?.status==="processing"&&Date.parse(job.lease_expires_at)>Date.now(),
    review:queries[1].data,versions:queries[2].data,events:queries[3].data,job:queries[4].data?.[0]??null});
  return result.success?reply(result.data):failure();
}
export async function postRegeneration(request:Request,projectId:string,requestId:string) {
  if(!isSameOriginMutation(request))return reply({message:"Origen de la solicitud no permitido."},403);
  const input=await readSmallJson(request,6000);if(input.response)return input.response;
  const parsed=regenerationInputSchema.safeParse(input.body);if(!parsed.success)return reply({message:"Indica instrucciones de 3 a 500 caracteres y la versión guardada."},400);
  const body=parsed.data,access=await authorizeRequest(projectId,requestId,body.documentId);if(access.response)return access.response;
  if(body.action==="prepare") {
    try {
      const result=await access.db.rpc("prepare_explanation_review",{p_request_id:requestId,p_document_id:body.documentId});
      return result.error?failure(result.error.code):reply({prepared:true});
    } catch { return failure(); }
  }
  const config=getAiConfiguration();if(!config)return reply({message:EXPLANATION_MESSAGES.provider_unavailable},503);
  const stored=await access.db.from("reinforcement_analyses").select("*").eq("request_id",requestId).maybeSingle();
  if(stored.error)return failure();
  const source=analysisRecordSchema.safeParse(stored.data),analysis=source.success?source.data:null;
  if(!analysis||analysis.status!=="ready"||!analysis.context?.enough||!analysis.diagnosis?.sufficient)return failure("PT409");
  try{validateDiagnosis(analysis.diagnosis,analysis.context)}catch{return failure("PT409")}
  const proof={userId:access.userId,requestId,documentId:body.documentId,operationId:body.operationId,attemptId:crypto.randomUUID(),analysisAttemptId:analysis.attempt_id,
    choiceVersion:0,expectedVersion:body.expectedVersion,instructions:body.instructions};
  // authorizeRequest intentionally exposes only the request-list contract; fetch the saved choice separately.
  const choice=await access.db.from("reinforcement_requests").select("recommendation_choice_version").eq("id",requestId).maybeSingle();
  if(choice.error||!choice.data)return failure();proof.choiceVersion=choice.data.recommendation_choice_version;
  let claim;
  try{claim=await access.db.rpc("change_reinforcement_regeneration",signRegenerationProof({...proof,action:"start"}))}catch{return failure()}
  if(claim.error)return failure(claim.error.code);
  if(claim.data?.disposition!=="started")return reply({job:claim.data?.job??null},claim.data?.disposition==="busy"?202:200);
  const adjustment={instructions:body.instructions,previous:claim.data.previous};
  let output:null|{content:unknown;model:string}=null,errorCode="invalid_content",quota=false;
  try {
    const g=claim.data.generation;
    if(claim.data.kind==="explanation")output=await generateExplanation(analysis.context,analysis.diagnosis,explanationRecordSchema.parse(g).detail_level,config,fetch,adjustment);
    else if(claim.data.kind==="example")output=await generateExample(analysis.context,analysis.diagnosis,exampleRecordSchema.parse(g).mode,config,fetch,adjustment);
    else if(claim.data.kind==="summary")output=await generateSummary(analysis.context,analysis.diagnosis,summaryRecordSchema.parse(g).mode,config,fetch,adjustment);
    else if(claim.data.kind==="image"){const visual=visualRecordSchema.parse(g);output=await generateVisual(analysis.context,analysis.diagnosis,visual.mode,visual.visual_brief,body.instructions,config,fetch,adjustment)}
  }catch(error){
    if(error&&typeof error==="object"&&"code" in error){const code=String(error.code);errorCode=["timeout","provider_unavailable","provider_refused"].includes(code)?code:"invalid_content"}
    quota=!!error&&typeof error==="object"&&"quotaExhausted" in error&&error.quotaExhausted===true;
  }
  let saved;
  try{saved=await access.db.rpc("change_reinforcement_regeneration",signRegenerationProof({...proof,action:"finish",status:output?"ready":"error",content:output?.content??null,model:output?.model??null,errorCode:output?null:errorCode}))}catch{return failure()}
  if(saved.error)return failure(saved.error.code);
  const result=regenerationJobSchema.safeParse(saved.data?.job);
  return result.success?reply({job:result.data,...(quota?{message:EXPLANATION_MESSAGES.provider_unavailable}:{})},quota?429:200):failure();
}
