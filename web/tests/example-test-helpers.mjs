import { load, analysisSchemas, context, diagnosis, analysis, record } from './recommendation-test-helpers.mjs';
import { schemas as explanationSchemas } from './explanation-test-helpers.mjs';
export { load, analysisSchemas, context, diagnosis, analysis, record };
export const schemas=load('lib/validations/example.ts',{'@/lib/validations/explanation':explanationSchemas});
export const provider=load('lib/reinforcements/example-provider.ts',{'@/lib/reinforcements/gemini-provider':load('lib/reinforcements/gemini-provider.ts'),'@/lib/validations/example':schemas});
export const example={title:'Energía en un péndulo ideal',text:'La energía de un péndulo sin rozamiento cambia de forma al oscilar. En el extremo alto tiene más energía potencial; al bajar se transforma en cinética. La suma permanece constante en este sistema aislado.',
  sourceQuote:context.selectedText,topicReference:diagnosis.topic,relation:'El movimiento concreto ilustra la conservación y la transformación de energía.',
  limitations:'Se supone un péndulo ideal sin rozamiento; la comparación no añade energía al sistema.',consistentWithSource:true};
export const generation={request_id:record.id,mode:'practical',version:1,status:'draft',approval_status:'pending',attempt_id:null,analysis_attempt_id:null,choice_version:1,
  content:null,model:null,error_code:null,started_at:null,updated_at:analysis.updated_at,lease_expires_at:null,finished_at:null,attempts:0};
