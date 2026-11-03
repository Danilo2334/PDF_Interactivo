import { load, analysisSchemas, context, diagnosis, analysis, record, schemas as exampleSchemas } from './example-test-helpers.mjs';
import { schemas as explanationSchemas } from './explanation-test-helpers.mjs';
export { load, analysisSchemas, context, diagnosis, analysis, record };
export const schemas=load('lib/validations/visual.ts',{'@/lib/validations/explanation':explanationSchemas,'@/lib/validations/example':exampleSchemas});
export const provider=load('lib/reinforcements/visual-provider.ts',{'@/lib/validations/visual':schemas,'@/lib/reinforcements/ai-provider':load('lib/reinforcements/ai-provider.ts')});
export const visual={title:'Transformaciones de la energía en un péndulo',text:'El péndulo ideal transforma energía potencial en cinética al bajar y realiza la transformación inversa al subir. Sin rozamiento, la suma permanece constante. Las flechas representan la transformación, no la creación de energía.',
 sourceQuote:context.selectedText,topicReference:diagnosis.topic,consistentWithSource:true,scene:{kind:'diagram',nodes:[
 {id:'n1',label:'Energía potencial',detail:'Mayor altura y menor velocidad en el extremo.',symbol:'pendulum'},
 {id:'n2',label:'Energía cinética',detail:'Mayor velocidad en el punto más bajo.',symbol:'energy'}],edges:[{from:'n1',to:'n2',label:'Al descender',relationType:'transformation',evidence:context.selectedText}],artwork:{
 layout:'illustration',objective:'Distinguir la transformación de energía de la conservación de su suma.',takeaway:'La energía cambia de forma y su suma se conserva cuando no hay rozamiento.',scopeNote:'Esquema cualitativo para estudiar el fragmento; no expresa medidas.',legend:[{color:'blue',label:'Elemento observado'}],figures:[{
 id:'f1',title:'Transformación en el péndulo',explanation:'La escena permite identificar el péndulo y distinguir sus dos formas de energía sin inventar valores.',evidence:context.selectedText,conceptIds:['n1','n2'],
 marks:[{id:'m1',shape:'rectangle',x:80,y:20,width:160,height:8,fill:'muted'},{id:'m2',shape:'line',points:[{x:160,y:28},{x:220,y:150}],color:'ink',dashed:false,arrow:false},{id:'m3',shape:'ellipse',cx:220,cy:165,rx:18,ry:18,fill:'blue'}],
 annotations:[{targetId:'m3',label:'Péndulo observado',explanation:'El movimiento permite estudiar la transformación de sus energías.',evidence:context.selectedText}]}]}}};
export const generation={request_id:record.id,mode:'diagram',visual_brief:'Representar la conservación de la energía con el contexto guardado.',instructions:'',version:1,status:'draft',approval_status:'pending',attempt_id:null,analysis_attempt_id:null,choice_version:1,
 content:null,model:null,error_code:null,started_at:null,updated_at:analysis.updated_at,lease_expires_at:null,finished_at:null,attempts:0};
