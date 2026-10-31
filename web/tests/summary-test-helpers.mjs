import { load, analysisSchemas, context, diagnosis, analysis, record } from './recommendation-test-helpers.mjs';
import { schemas as explanationSchemas } from './explanation-test-helpers.mjs';
import { schemas as reviewSchemas } from './example-test-helpers.mjs';
export { load, analysisSchemas, context, diagnosis, analysis, record, reviewSchemas };
export const schemas=load('lib/validations/summary.ts',{'@/lib/validations/explanation':explanationSchemas,'@/lib/validations/example':reviewSchemas});
export const provider=load('lib/reinforcements/summary-provider.ts',{'@/lib/reinforcements/ai-provider':load('lib/reinforcements/ai-provider.ts'),'@/lib/validations/summary':schemas});
export const summary={title:'Conservación de la energía',text:'En un sistema aislado la energía se conserva: no se crea ni se destruye, sino que se transforma. Esta idea distingue la cantidad total de sus cambios de forma.',
  concepts:[{name:'energía',sourceQuote:context.selectedText},{name:'sistema aislado',sourceQuote:context.selectedText}],sourceQuote:context.selectedText,topicReference:diagnosis.topic,consistentWithSource:true};
export const generation={request_id:record.id,mode:'compact',version:1,status:'draft',approval_status:'pending',attempt_id:null,analysis_attempt_id:null,choice_version:1,
  content:null,model:null,error_code:null,started_at:null,updated_at:analysis.updated_at,lease_expires_at:null,finished_at:null,attempts:0};
