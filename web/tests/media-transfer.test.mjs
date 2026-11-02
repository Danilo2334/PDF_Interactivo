import assert from 'node:assert/strict';
import test from 'node:test';
import { load, record } from './summary-test-helpers.mjs';
const schemas=load('lib/validations/reinforcement-media.ts');
const id='2a0b82bc-2123-4f5c-b99e-d25d137696ca';
const metadata={documentId:record.document_id,reinforcementId:id,approvedVersionId:id,assetId:id,kind:'image',title:'Transferencia QA',approved:true};
const item={id,reinforcement_id:id,approved_version_id:id,kind:'image',title:metadata.title,file_name:'qa.png',mime_type:'image/png',size_bytes:5,url:null,status:'approved',created_at:record.created_at,approved_at:record.created_at};
function fixture(options={}){
  const posts=[],sent=[],progress=[];let sessions=0;
  class Xhr{upload={};headers={};open(method,url){this.method=method;this.url=url;}setRequestHeader(k,v){this.headers[k]=v;}send(file){sent.push({url:this.url,method:this.method,headers:this.headers,file});this.upload.onprogress({lengthComputable:true,loaded:3,total:5});this.status=options.uploadStatus??200;if(options.lostResponse)this.onerror();else this.onload();}}
  const transfer=load('lib/reinforcements/media-transfer.ts',{
    '@/lib/validations/reinforcement-media':schemas,
    '@/lib/supabase/client':{createClient:()=>({auth:{getSession:async()=>{sessions++;return{data:{session:options.noSession?null:{user:{id:record.owner_id},access_token:'synthetic-session-token'}},error:null}}}})},
  },{XMLHttpRequest:Xhr,process:{env:{NEXT_PUBLIC_SUPABASE_URL:'https://project.supabase.co',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'public-test-key'}},
    fetch:async(endpoint,init)=>{const body=JSON.parse(init.body);posts.push({endpoint,body});return Response.json(options.cached?{item}:body.action==='prepare-file'?{pendingItem:{...item,status:'uploading'},upload:{bucket:schemas.MEDIA_BUCKET,path:options.badPath??`${record.owner_id}/${id}.png`}}:options.missing?{message:'La transferencia no está confirmada.'}:{item},{status:options.missing&&body.action==='complete-file'?503:200});}});
  return{posts,sent,progress,get sessions(){return sessions},run:()=>transfer.transferMediaFile('/api/projects/qa/media',metadata,new File(['abcde'],'qa.png',{type:'image/png'}),message=>progress.push(message),()=>{})};
}
test('HU027 browser sends only JSON metadata to Next and private file bytes to the fixed Supabase origin',async()=>{
  const f=fixture();assert.equal((await f.run()).id,id);assert.deepEqual(f.posts.map(p=>p.body.action),['prepare-file','complete-file']);
  assert.equal(f.posts[0].body.file.sha256,f.posts[1].body.file.sha256);assert.match(f.posts[0].body.file.sha256,/^[a-f0-9]{64}$/);
  assert.equal(f.sent.length,1);assert.equal(f.sent[0].url,`https://project.supabase.co/storage/v1/object/reinforcement-media/${record.owner_id}/${id}.png`);
  assert.equal(f.sent[0].headers['x-upsert'],'false');assert.equal(f.sent[0].file.size,5);assert.ok(f.progress.includes('Transfiriendo archivo: 60 %'));
  assert.equal(JSON.stringify(f.posts).includes('synthetic-session-token'),false);
});
test('HU027 browser checks completion after ambiguous upload responses; approved replay never uploads again',async()=>{
  for(const options of [{lostResponse:true},{uploadStatus:409}]){const f=fixture(options);assert.equal((await f.run()).status,'approved');assert.equal(f.posts.length,2);assert.equal(f.sent.length,1);}
  const missing=fixture({lostResponse:true,missing:true});await assert.rejects(missing.run(),/transferencia no está confirmada/);assert.equal(missing.sent.length,1);
  const cached=fixture({cached:true});assert.equal((await cached.run()).id,id);assert.equal(cached.sent.length,0);assert.equal(cached.sessions,0);
});
test('HU027 browser never transmits credentials to a foreign storage path or without its own session',async()=>{
  for(const badPath of ['https://evil.invalid/upload',`another-owner/${id}.png`,`${record.owner_id}/../private.png`]){const f=fixture({badPath});await assert.rejects(f.run(),/destino/);assert.equal(f.sent.length,0);assert.equal(f.posts.length,1);}
  const noSession=fixture({noSession:true});await assert.rejects(noSession.run(),/sesión/);assert.equal(noSession.sent.length,0);
});
