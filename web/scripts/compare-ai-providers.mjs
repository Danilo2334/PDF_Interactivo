// Read-only provider benchmark. Does not change the application's provider or write to Supabase.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url)),require=createRequire(new URL('../package.json',import.meta.url));
const ts=require('typescript'),modules=new Map();
function load(relative){
 const filename=path.resolve(root,relative);if(modules.has(filename))return modules.get(filename);
 const loaded={exports:{}};modules.set(filename,loaded.exports);
 const code=ts.transpileModule(readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const localRequire=name=>name==='server-only'?{}:name.startsWith('@/')?load(name.slice(2)+'.ts'):name.startsWith('.')?load(path.relative(root,path.resolve(path.dirname(filename),name+'.ts'))):require(name);
 new Function('require','module','exports',code)(localRequire,loaded,loaded.exports);modules.set(filename,loaded.exports);return loaded.exports;
}
function option(name){const i=process.argv.indexOf(name);return i<0?null:process.argv[i+1];}
const fixtureDir=option('--fixtures'),out=option('--out');assert.ok(fixtureDir&&out,'Specify --fixtures and --out');
const live=process.argv.includes('--live'),only=option('--model');
const env={...process.env};for(const line of (await readFile(path.join(root,'.env.local'),'utf8')).split(/\r?\n/)){
 const m=/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/.exec(line);if(m)env[m[1]]=m[2].replace(/^(['"])(.*)\1$/,'$2');
}
assert.ok(/^sk-[A-Za-z0-9_-]+$/.test(env.OPENAI_API_KEY??''),'OpenAI key missing');assert.ok(env.GEMINI_API_KEY&&env.GEMINI_ANALYSIS_MODEL,'Gemini configuration missing');
const hash=x=>createHash('sha256').update(x).digest('hex');
const safeError=value=>[env.OPENAI_API_KEY,env.GEMINI_API_KEY].filter(Boolean).reduce((s,key)=>s.split(key).join('[redacted]'),String(value??'')).replace(/(?:sk-|AIza)[A-Za-z0-9_-]+/g,'[redacted]').slice(0,900);
const pdfjs=await import(pathToFileURL(require.resolve('pdfjs-dist/legacy/build/pdf.mjs')).href);
const extraction=load('lib/pdf/extract-selection-text.ts'),contextModule=load('lib/reinforcements/analysis-context.ts');
async function pdf(name,expected){const bytes=await readFile(path.join(fixtureDir,name));assert.equal(hash(bytes),expected);const task=pdfjs.getDocument({data:Uint8Array.from(bytes),useSystemFonts:true,disableFontFace:true});try{const doc=await task.promise,pages=[];for(let i=1;i<=doc.numPages;i++){const p=await doc.getPage(i);pages.push(extraction.textFromPageContent(await p.getTextContent(),p.getViewport({scale:1})));}return{name,sha256:hash(bytes),pages};}finally{await task.destroy();}}
const digital=await pdf('QA-HU015-019-digital.pdf','e7277d66afd7caba47385cfac2f0e55a2eeb4fb7aa7136409fa35300a6347946');
const scanned=await pdf('QA-HU015-019-escaneado.pdf','b0bc1809351f249bd352032fbcdd193846e4c44e4199cf4bfbfec24326b71302');assert.equal(scanned.pages[0].trim(),'');
const energySource=JSON.parse(await readFile(path.join(fixtureDir,'HU028/energy-v3.json'),'utf8')).source;
const waterSource=JSON.parse(await readFile(path.join(fixtureDir,'HU028/water-v3.json'),'utf8')).source;
const energyText='En un sistema aislado, la energia total se conserva.\nLa energia no se crea ni se destruye: se transforma.\nUn pendulo alterna energia potencial y energia cinetica.\nSin rozamiento, la suma de ambas permanece constante.';
const waterText='El ciclo del agua describe evaporacion y condensacion.';
const flat=x=>x.replace(/\s+/g,' ').trim();assert.ok(flat(digital.pages[0]).includes(flat(energyText)));assert.ok(digital.pages[1].includes(waterText));
function item(id,page,selected,need,topic,concepts,source){
 const context=contextModule.buildAnalysisContext({page_number:page,selected_text:selected,text_source:'digital',category:'concept',need},digital.pages[page-1],'',digital.sha256);
 const diagnosis={sufficient:true,topic,concepts,scope:'Aclarar exclusivamente las relaciones del fragmento y sus condiciones, sin ampliar el alcance a otros procesos.',reason:'',quotes:[selected]};
 return{id,context,diagnosis,quizSource:source};
}
const cases=[item('energia',1,energyText,'No comprendo cómo puede conservarse la energía si el péndulo cambia entre energía potencial y cinética. Aclara el papel de la ausencia de rozamiento.','Conservación de la energía',['energia potencial','energia cinetica','sistema aislado'],energySource),item('agua',2,waterText,'Confundo evaporación y condensación y no sé si este fragmento describe todo el ciclo del agua o solamente esos dos procesos.','Evaporación y condensación',['evaporacion','condensacion'],waterSource)];
const providers=Object.fromEntries(['analysis','recommendation','explanation','example','visual','summary','quiz'].map(n=>[n,load('lib/reinforcements/'+n+'-provider.ts')]));
const specs=[{model:env.GEMINI_ANALYSIS_MODEL,provider:'gemini',input:.30,output:2.5,cached:.03},{model:'gpt-6.1-sol',provider:'openai',input:2,output:10,cached:.1},{model:'gpt-6-astra',provider:'openai',input:10,output:50,cached:1}].filter(s=>!only||s.model===only);
const tasks=[['analysis','SCRUM-30',(c,cfg,t)=>providers.analysis.analyzeContext(c.context,cfg,t)],['recommendation','SCRUM-31',(c,cfg,t)=>providers.recommendation.recommendReinforcement(c.context,c.diagnosis,cfg,t)],['explanation','SCRUM-32',(c,cfg,t)=>providers.explanation.generateExplanation(c.context,c.diagnosis,'detailed',cfg,t)],['example','SCRUM-33',(c,cfg,t)=>providers.example.generateExample(c.context,c.diagnosis,'practical',cfg,t)],['analogy','SCRUM-33',(c,cfg,t)=>providers.example.generateExample(c.context,c.diagnosis,'analogy',cfg,t)],['visual','SCRUM-34',(c,cfg,t)=>providers.visual.generateVisual(c.context,c.diagnosis,'diagram','Aclarar únicamente las relaciones del fragmento seleccionado.','Evitar conceptos externos y conservar los límites.',cfg,t)],['summary','SCRUM-35',(c,cfg,t)=>providers.summary.generateSummary(c.context,c.diagnosis,'brief',cfg,t)],['quiz','SCRUM-40',(c,cfg,t)=>providers.quiz.generateQuiz(c.quizSource,c.id==='energia'?3:1,cfg,t)]];
await mkdir(out,{recursive:true});const file=path.join(out,'results.json');
let report;try{report=JSON.parse(await readFile(file,'utf8'));assert.equal(report.version,1);}catch{report={version:1,createdAt:new Date().toISOString(),codeCommit:'6a6d56f',budgetUsd:3,documents:[digital,scanned],cases,tasks:tasks.map(([task,jira])=>({task,jira})),settings:{samePromptsAndData:true,geminiThinking:'low',openaiReasoning:'low',temperature:'provider default',attemptsPerTask:1,tools:false,openaiStore:false,mode:'production provider functions with benchmark-only HTTP translation; no app/database mutations',cost:'token estimate at official Standard rates, not a billing receipt; Gemini paid-equivalent only, configured free tier'},rows:[]};}
const save=()=>writeFile(file,JSON.stringify(report,null,2));await save();
let spend=report.rows.flatMap(r=>r.calls).filter(c=>c.provider==='openai').reduce((n,c)=>n+(c.usd??c.reservedUsd??0),0);
function cleanSchema(s){if(Array.isArray(s))return s.map(cleanSchema);if(s&&typeof s==='object')return Object.fromEntries(Object.entries(s).filter(([k])=>k!=='$schema').map(([k,v])=>[k,cleanSchema(v)]));return s;}
function openaiSchema(s){
 if(Array.isArray(s))return s.map(openaiSchema);if(!s||typeof s!=='object')return s;
 const converted=Object.fromEntries(Object.entries(s).map(([k,v])=>[k,openaiSchema(v)]));
 if(converted.enum?.some(v=>typeof v==='string'&&/[\r\n]/.test(v))){
  // Same exact string constraint, encoded as a regex because strict OpenAI schemas reject newline enum literals.
  const escape=v=>v.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\n/g,'\\n').replace(/\r/g,'\\r');
  converted.pattern='^(?:'+converted.enum.map(escape).join('|')+')$';assert.ok(converted.enum.every(v=>new RegExp(converted.pattern).test(v)));delete converted.enum;
 }return converted;
}
function transport(spec,row){return async(_url,init)=>{
 const original=JSON.parse(init.body),instructions=original.systemInstruction.parts[0].text,data=JSON.parse(original.contents[0].parts[0].text),schema=cleanSchema(original.generationConfig.responseFormat.text.schema),max=original.generationConfig.maxOutputTokens;
 const requestData={instructions,data,schema,maxOutputTokens:max},call={provider:spec.provider,model:spec.model,inputHash:hash(JSON.stringify(requestData)),request:requestData,startedAt:new Date().toISOString()};row.calls.push(call);
 const reserved=(Buffer.byteLength(JSON.stringify(requestData))+2000)*spec.input/1e6+max*spec.output/1e6;call.reservedUsd=spec.provider==='openai'?reserved:0;
 if(spec.provider==='openai'&&spend+reserved>report.budgetUsd){call.status='budget_stopped';await save();throw Error('Budget stop');}
 if(!live){call.status='dry_run';return Response.json({},{status:503});}
 const start=performance.now();let response;
 try{
 if(spec.provider==='openai')spend+=reserved;
 call.status='in_flight';await save();
 response=await fetch(spec.provider==='gemini'?`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(spec.model)}:generateContent`:'https://api.openai.com/v1/responses',{
 method:'POST',headers:spec.provider==='gemini'?{'x-goog-api-key':env.GEMINI_API_KEY,'Content-Type':'application/json'}:{Authorization:'Bearer '+env.OPENAI_API_KEY,'Content-Type':'application/json'},
 signal:AbortSignal.timeout(45000),redirect:'error',body:JSON.stringify(spec.provider==='gemini'?{...original,generationConfig:{...original.generationConfig,responseFormat:{text:{mimeType:'APPLICATION_JSON',schema}}}}:{model:spec.model,instructions,input:JSON.stringify(data),reasoning:{effort:'low'},max_output_tokens:max,store:false,service_tier:'default',text:{format:{type:'json_schema',name:'reinforcement_comparison',schema:openaiSchema(schema),strict:true}}})});
 call.ms=Math.round(performance.now()-start);call.http=response.status;const body=await response.json();call.status=response.ok?'received':'api_error';
 if(!response.ok){call.errorCode=String(body.error?.code??body.error?.status??response.status).slice(0,100);call.errorMessage=safeError(body.error?.message);call.costKind='unmeasured_error_not_in_cost_total';await save();return Response.json({},{status:response.status});}
 const usage=spec.provider==='gemini'?{input:body.usageMetadata?.promptTokenCount??0,output:(body.usageMetadata?.candidatesTokenCount??0)+(body.usageMetadata?.thoughtsTokenCount??0),cached:body.usageMetadata?.cachedContentTokenCount??0,reasoning:body.usageMetadata?.thoughtsTokenCount??0}: {input:body.usage?.input_tokens??0,output:body.usage?.output_tokens??0,cached:body.usage?.input_tokens_details?.cached_tokens??0,reasoning:body.usage?.output_tokens_details?.reasoning_tokens??0};
 call.usage=usage;call.usd=((usage.input-usage.cached)*spec.input+usage.cached*spec.cached+usage.output*spec.output)/1e6;if(spec.provider==='openai')spend+=call.usd-reserved;
 const text=spec.provider==='gemini'?body.candidates?.[0]?.content?.parts?.filter(p=>!p.thought).map(p=>p.text??'').join(''):body.output?.filter(p=>p.type==='message').flatMap(p=>p.content??[]).filter(p=>p.type==='output_text').map(p=>p.text).join('');
 call.finish=spec.provider==='gemini'?body.candidates?.[0]?.finishReason:body.status;try{call.output=JSON.parse(text);}catch{call.outputText=text??'';}
 await save();return spec.provider==='gemini'?Response.json(body):Response.json({candidates:[{finishReason:body.status==='completed'?'STOP':'MAX_TOKENS',content:{parts:[{text:text??''}]}}]});
 }catch(e){call.ms=Math.round(performance.now()-start);call.status='transport_error';call.errorCode=e?.name??'Error';await save();throw e;}
};}
if(process.argv.includes('--fixtures-only')){console.log(JSON.stringify({prepared:true,documents:report.documents.map(d=>({name:d.name,sha256:d.sha256,pages:d.pages.length})),tasks:tasks.length,models:specs.map(s=>s.model)}));process.exit(0);}
for(const c of cases)for(const [task,jira,run]of tasks)for(const spec of specs){
 if(option('--case')&&option('--case')!==c.id||option('--task')&&option('--task')!==task)continue;
 const prior=report.rows.filter(r=>r.case===c.id&&r.task===task&&r.model===spec.model).at(-1);
 if(prior&&prior.accepted!==undefined&&!(process.argv.includes('--retry-technical')&&prior.calls.some(c=>c.errorCode==='invalid_json_schema')))continue;
 const row={case:c.id,task,jira,model:spec.model,phase:prior?'schema_correction_or_interrupted_recovery':'initial',calls:[],startedAt:new Date().toISOString()};report.rows.push(row);const start=performance.now();
 try{row.result=await run(c,{key:'benchmark-transport-only',model:spec.model},transport(spec,row));row.accepted=true;}catch(e){row.accepted=false;row.failure=e.code??e.kind??e.name??'validation_error';}
 row.ms=Math.round(performance.now()-start);await save();console.log(JSON.stringify({case:c.id,task,model:spec.model,accepted:row.accepted,failure:row.failure,ms:row.ms,usd:row.calls.reduce((n,x)=>n+(x.usd??0),0),openaiTotal:spend}));
 if(spend>=report.budgetUsd)break;
}
for(const doc of report.documents)assert.equal(hash(await readFile(path.join(fixtureDir,doc.name))),doc.sha256,'PDF original changed');
report.finishedAt=new Date().toISOString();report.originalHashesPreserved=true;await save();
