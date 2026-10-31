import { load, analysisSchemas, context, diagnosis, analysis, record, schemas as exampleSchemas } from './example-test-helpers.mjs';
import { schemas as explanationSchemas } from './explanation-test-helpers.mjs';
export { load, analysisSchemas, context, diagnosis, analysis, record };
export const schemas=load('lib/validations/visual.ts',{'@/lib/validations/explanation':explanationSchemas,'@/lib/validations/example':exampleSchemas});
export const provider=load('lib/reinforcements/visual-provider.ts',{'@/lib/validations/visual':schemas,'@/lib/reinforcements/ai-provider':load('lib/reinforcements/ai-provider.ts')});
export const visual={title:'Transformaciones de la energía en un péndulo',text:'El péndulo ideal transforma energía potencial en cinética al bajar y realiza la transformación inversa al subir. Sin rozamiento, la suma permanece constante. Las flechas representan la transformación, no la creación de energía.',
 sourceQuote:context.selectedText,topicReference:diagnosis.topic,consistentWithSource:true,scene:{kind:'diagram',nodes:[
 {id:'n1',label:'Energía potencial',detail:'Mayor altura y menor velocidad en el extremo.',symbol:'pendulum'},
 {id:'n2',label:'Energía cinética',detail:'Mayor velocidad en el punto más bajo.',symbol:'energy'}],edges:[{from:'n1',to:'n2',label:'Al descender'}]}};
export const generation={request_id:record.id,mode:'diagram',visual_brief:'Representar la conservación de la energía con el contexto guardado.',instructions:'',version:1,status:'draft',approval_status:'pending',attempt_id:null,analysis_attempt_id:null,choice_version:1,
 content:null,model:null,error_code:null,started_at:null,updated_at:analysis.updated_at,lease_expires_at:null,finished_at:null,attempts:0};
