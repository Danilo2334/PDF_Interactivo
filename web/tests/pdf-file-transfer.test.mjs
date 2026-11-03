import test from 'node:test';import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {load,owner,documentId} from './reinforcement-test-helpers.mjs';
const operationId=randomUUID(),file=new File(['%PDF-fixture'],'QA.pdf',{type:'application/pdf'});
function fixture(options={}){
 const posts=[],transfers=[],progress=[];
 class Xhr{upload={};headers={};open(method,url){this.url=url;}setRequestHeader(k,v){this.headers[k]=v;}send(bytes){transfers.push({url:this.url,headers:this.headers,bytes:bytes.size});this.upload.onprogress({lengthComputable:true,loaded:6,total:12});if(options.lostUpload)this.onerror();else{this.status=options.uploadStatus??200;this.onload();}}}
 const completed={state:'completed',message:'Guardado',...(options.replace?{documentId:operationId}:{project:{id:operationId}})};
 const client=load('lib/documents/pdf-file-transfer.ts',{'@/lib/supabase/client':{createClient:()=>({auth:{getSession:async()=>({data:{session:options.noSession?null:{user:{id:owner},access_token:'synthetic-private-session'}},error:null})}})},'@/lib/validations/pdf-file':load('lib/validations/pdf-file.ts')},
  {XMLHttpRequest:Xhr,process:{env:{NEXT_PUBLIC_SUPABASE_URL:'https://project.supabase.co',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'public-test-key'}},fetch:async(endpoint,init)=>{const body=JSON.parse(init.body);posts.push(body);if(options.lostConfirmation&&body.action==='complete')throw Error('Failed to fetch');return Response.json(options.gone?{message:'Eliminado'}:options.cached||body.action==='complete'?completed:{state:'pending',upload:{bucket:'pdf-documents',path:options.badPath??`${owner}/${operationId}.pdf`}},{status:options.gone?410:200});}});
 return{posts,transfers,progress,run:()=>client.transferPdfFile({endpoint:'/api/documents/upload',operationId,file,...(options.replace?{documentId}:{}),onProgress:p=>progress.push(p)})};
}
test('SCRUM-235 browser sends only small JSON to Next and PDF bytes to the fixed private bucket with real progress',async()=>{
 const f=fixture();assert.equal((await f.run()).project.id,operationId);assert.deepEqual(f.posts.map(p=>p.action),['prepare','complete']);assert.equal(f.transfers.length,1);
 assert.equal(f.transfers[0].url,`https://project.supabase.co/storage/v1/object/pdf-documents/${owner}/${operationId}.pdf`);assert.equal(f.transfers[0].headers['x-upsert'],'false');
 assert.equal(f.posts[0].file.sha256,f.posts[1].file.sha256);assert.ok(f.progress.some(p=>p.phase==='uploading'&&p.percent===50));assert.equal(f.progress.at(-1).phase,'verifying');assert.doesNotMatch(JSON.stringify(f.posts),/synthetic-private-session/);
 const replacement=fixture({replace:true});assert.equal((await replacement.run()).documentId,operationId);assert.equal(replacement.posts[0].documentId,documentId);assert.equal(replacement.posts[0].confirmed,true);
});
test('SCRUM-235 browser checks ambiguous transfer once, skips completed upload and reports lost confirmation in Spanish',async()=>{
 for(const options of [{lostUpload:true},{uploadStatus:400}]){const f=fixture(options);assert.equal((await f.run()).project.id,operationId);assert.equal(f.transfers.length,1);assert.equal(f.posts.length,2);}
 const cached=fixture({cached:true});assert.equal((await cached.run()).project.id,operationId);assert.equal(cached.transfers.length,0);
 await assert.rejects(fixture({lostConfirmation:true}).run(),/Reintenta con el mismo PDF/);
 await assert.rejects(fixture({gone:true}).run(),e=>e.status===410);
});
test('SCRUM-235 browser never gives its token to a foreign path and stops when the session is missing',async()=>{
 for(const badPath of ['https://evil.invalid/path',`other/${operationId}.pdf`,`${owner}/../another.pdf`]){const f=fixture({badPath});await assert.rejects(f.run(),/destino/);assert.equal(f.transfers.length,0);}
 const f=fixture({noSession:true});await assert.rejects(f.run(),/sesión/);assert.equal(f.transfers.length,0);
});
