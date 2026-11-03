import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {PDFDocument} from 'pdf-lib';
import {load,owner,projectId,documentId} from './reinforcement-test-helpers.mjs';
const validation=load('lib/validations/pdf-file.ts');
const schemas=load('lib/validations/pdf-transfer.ts',{'@/lib/validations/pdf-file':validation});
const proof=load('lib/documents/upload-proof.ts');
const mutation=load('lib/documents/mutation-request.ts');
const json=load('lib/reinforcements/request-service.ts',{'@/lib/auth/access':{},'@/lib/supabase/server':{},'@/lib/validations/request-list':{}});
const pdf=await PDFDocument.create();for(let i=0;i<3;i++)pdf.addPage([200,200]);
const bytes=await pdf.save(),operationId=randomUUID();
const file={name:'QA-grande.pdf',type:'application/pdf',size:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};
function fixture(options={}){
 const calls=[],downloads=[],removed=[],filters=[];let current=options.current??documentId;
 const receipt={state:'completed',project:{id:operationId,name:'QA-grande',status:'pending'},document:{id:operationId,name:file.name,size:file.size,pageCount:3}};
 const db={from(table){return{select(){return this},eq(k,v){filters.push([table,k,v]);return this},async maybeSingle(){return{error:options.queryError?{}:null,data:table==='projects'?(options.noProject?null:{document_id:current,status:options.deleting?'deleting':'pending'}):options.existing||current===operationId?{id:operationId,original_name:options.wrongName?'otro.pdf':file.name,size_bytes:file.size,storage_path:`${owner}/${operationId}.pdf`}:null}}}},
  storage:{from(){return{async download(path){downloads.push(path);return{data:options.missing?null:new Blob([options.bytes??bytes],{type:options.mime??'application/pdf'}),error:null}},async remove(paths){removed.push(...paths);return{error:options.cleanupError?{}:null}}}}},
  async rpc(name,args){calls.push({name,...args});if(name==='replace_project_pdf'){if(options.concurrent)current=operationId;if(options.rpcError)return{error:{code:options.rpcError}};current=operationId;return{data:operationId}}
   if(options.rpcError)return{error:{code:options.rpcError}};return{data:options.cached||args.action==='commit'?receipt:{state:'pending'}};}};
 const service=load('lib/documents/direct-pdf-transfer.ts',{'pdf-lib':{PDFDocument},'@/lib/supabase/server':{},
  '@/lib/reinforcements/request-service':json,'@/lib/documents/upload-proof':{uploadFingerprintFromDigest:proof.uploadFingerprintFromDigest,signUploadProof:x=>x},
  '@/lib/documents/mutation-request':mutation,'@/lib/validations/pdf-file':validation,'@/lib/validations/pdf-transfer':schemas});
 function request(action='prepare',extra={}){return new Request('https://qa.example/api/documents/upload',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,operationId,file,...extra})});}
 return{calls,downloads,removed,filters,upload:(action,extra)=>service.directPdfUpload(request(action,extra),db,owner),replace:(action,extra)=>service.directPdfReplacement(request(action,{documentId,confirmed:true,...extra}),projectId,db,owner)};
}
test('SCRUM-235 reserves without claiming pages, then validates stored PDF and commits the exact page count',async()=>{
 const f=fixture();const prepared=await f.upload('prepare');assert.equal(prepared.status,200);assert.equal((await prepared.json()).upload.path,`${owner}/${operationId}.pdf`);
 assert.equal(f.calls[0].pageCount,0);assert.equal(f.downloads.length,0);
 const completed=await f.upload('complete');assert.equal(completed.status,200);assert.equal((await completed.json()).document.pageCount,3);
 assert.deepEqual(f.calls.map(c=>c.action),['prepare','prepare','commit']);assert.equal(f.calls.at(-1).pageCount,3);
 const cached=fixture({cached:true});assert.equal((await cached.upload('prepare')).status,200);assert.equal(cached.downloads.length,0);
 const stream=new Request('https://qa.example',{method:'POST',body:' '.repeat(4097)});assert.equal((await json.readSmallJson(stream,4096)).response.status,413);
});
test('SCRUM-235 rejects missing, changed or corrupt stored PDF before project creation or replacement',async()=>{
 for(const options of [{missing:true},{mime:'text/html'},{bytes:new Uint8Array([1,2,3])}]){const f=fixture(options);assert.equal((await f.upload('complete')).status,options.missing?503:409);assert.equal(f.calls.some(c=>c.action==='commit'),false);}
 const broken=new TextEncoder().encode('%PDF-invalid');const f=fixture({bytes:broken});
 assert.equal((await f.upload('complete',{file:{...file,size:broken.length,sha256:createHash('sha256').update(broken).digest('hex')}})).status,422);
 assert.equal(f.calls.some(c=>c.action==='commit'),false);
 assert.equal((await fixture().upload('complete',{file:{...file,sha256:'a'.repeat(64)}})).status,409);
 for(const bad of [{...file,size:20971521},{...file,name:'../private.pdf'},{...file,type:'text/html'}]){const f=fixture();assert.equal((await f.upload('prepare',{file:bad})).status,400);assert.equal(f.calls.length,0);}
});
test('SCRUM-235 replacement retains expected version, validates before switching and recovers concurrent identical commit',async()=>{
 const f=fixture();assert.equal((await f.replace('prepare')).status,200);assert.equal(f.calls.length,0);assert.equal(f.downloads.length,0);
 assert.equal((await f.replace('complete')).status,200);assert.equal(f.calls[0].p_expected_document_id,documentId);assert.equal(f.calls[0].p_document_id,operationId);assert.equal(f.removed.length,0);
 assert.ok(f.filters.some(([table,k,v])=>table==='projects'&&k==='owner_id'&&v===owner));
 const concurrent=fixture({concurrent:true,rpcError:'PT409'});assert.equal((await concurrent.replace('complete')).status,200);assert.equal(concurrent.removed.length,0);
 const replay=fixture({current:operationId});assert.equal((await replay.replace('prepare')).status,200);assert.equal(replay.calls.length,0);assert.equal(replay.downloads.length,1);
 assert.equal((await fixture({current:operationId,wrongName:true}).replace('prepare')).status,409);
});
test('SCRUM-235 replacement blocks stale, missing, deleting or unconfirmed contexts and protects ambiguous bytes',async()=>{
 for(const [options,status]of[[{current:randomUUID()},409],[{deleting:true},409],[{noProject:true},404],[{queryError:true},503]]){const f=fixture(options);assert.equal((await f.replace('prepare')).status,status);assert.equal(f.calls.length,0);assert.equal(f.downloads.length,0);}
 assert.equal((await fixture().replace('prepare',{confirmed:false})).status,400);
 assert.equal((await fixture().replace('prepare',{operationId:documentId})).status,400);
 const unknown=fixture({rpcError:'08006'});assert.equal((await unknown.replace('complete')).status,503);assert.equal(unknown.removed.length,0);
 const rolled=fixture({rpcError:'PT409'});assert.equal((await rolled.replace('complete')).status,409);assert.equal(rolled.removed.length,1);
 const existing=fixture({rpcError:'PT409',existing:true});assert.equal((await existing.replace('complete')).status,409);assert.equal(existing.removed.length,0);
 const cleanup=fixture({rpcError:'PT409',cleanupError:true});assert.equal((await cleanup.replace('complete')).status,503);
 const protectedBytes=fixture({current:operationId,existing:true});assert.equal((await protectedBytes.replace('prepare',{file:{...file,sha256:'a'.repeat(64)}})).status,409);assert.equal(protectedBytes.removed.length,0);
});
