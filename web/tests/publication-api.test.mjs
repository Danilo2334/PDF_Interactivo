import assert from 'node:assert/strict';
import test from 'node:test';
import {randomUUID} from 'node:crypto';
import {load,owner,projectId,documentId} from './reinforcement-test-helpers.mjs';
const schemas=load('lib/validations/publication.ts');
const receipt={id:randomUUID(),documentId,version:1,name:'Approved QA publication',createdAt:new Date().toISOString(),publishedAt:null,url:null,
 counts:{reinforcements:2,media:0,quizzes:1},items:[{title:'Approved energy',pageNumber:1,quizTitle:'Approved quiz',mediaCount:0},{title:'Approved water',pageNumber:2,quizTitle:null,mediaCount:0}]};
function fixture(options={}){
 const calls=[],db={from(){return{select(){return this},eq(){return this},maybeSingle:async()=>options.readError?{error:{}}:{data:options.foreign?null:{document_id:options.stale?randomUUID():documentId,status:options.deleting?'deleting':'pending'}}}},
  async rpc(name,args){calls.push({name,args});if(options.throwRpc)throw Error('network');return options.rpcError?{error:{code:options.rpcError}}:{data:options.invalidReceipt?{snapshot:{correctIndex:1}}:receipt};}};
 const api=load('lib/publications/service.ts',{
  '@/lib/auth/access':{checkPermission:async()=>options.denied?{ok:false,status:options.denied,message:'Denied'}:{ok:true,userId:owner}},
  '@/lib/supabase/server':{createClient:async()=>db},'@/lib/reinforcements/request-service':{reply:(v,status=200)=>Response.json(v,{status}),readSmallJson:async r=>({body:await r.json()})},
  '@/lib/documents/mutation-request':{isSameOriginMutation:r=>r.headers.get('origin')==='http://localhost'},'@/lib/validations/publication':schemas,
  '@/lib/publications/proof':{signPublicationProof:p=>({p_payload:JSON.stringify(p),p_signature:'isolated'}),publicationOrigin:()=>options.enabled?'https://deployed.example':null},
 });
 return{calls,get:()=>api.getPublication(new Request('http://localhost/publication?documentId='+documentId),projectId),post:(body={action:'prepare',documentId,operationId:receipt.id},origin='http://localhost')=>api.postPublication(new Request('http://localhost/publication',{method:'POST',headers:{origin},body:JSON.stringify(body)}),projectId)};
}
test('HU032 checks owner, active document, origin and confirmation before signed database operations',async()=>{
 const input={action:'publish',documentId,operationId:receipt.id,confirmed:true};
 for(const [options,status]of [[{denied:401},401],[{denied:403},403],[{foreign:true},404],[{stale:true},409],[{deleting:true},409],[{readError:true},503]]){
  const f=fixture(options);assert.equal((await f.get()).status,status);assert.equal((await f.post()).status,status);assert.equal(f.calls.length,0);
 }
 const f=fixture();assert.equal((await f.post({},'https://foreign.invalid')).status,403);assert.equal((await f.post({...input,confirmed:false})).status,400);assert.equal(f.calls.length,0);
 assert.equal((await f.post(input)).status,503);assert.equal(f.calls.length,0); // No misleading localhost publication.
});
test('HU032 owner API returns bounded receipts only and signs the configured origin with unchanged operation identity',async()=>{
 const f=fixture({enabled:true}),input={action:'publish',documentId,operationId:receipt.id,confirmed:true};
 assert.equal((await f.post(input)).status,200);const signed=JSON.parse(f.calls[0].args.p_payload);assert.equal(signed.origin,'https://deployed.example');assert.equal(signed.operationId,receipt.id);assert.equal(signed.userId,owner);
 const status=await f.get(),body=await status.json();assert.equal(body.latest.id,receipt.id);assert.equal(body.canPublish,true);assert.doesNotMatch(JSON.stringify(body),/correctIndex|snapshot|storagePath/);
 for(const [code,status]of [['PT404',404],['PT409',409],['42501',403],['connection',503]])assert.equal((await fixture({rpcError:code}).post()).status,status);
 assert.equal((await fixture({throwRpc:true}).post()).status,503);assert.equal((await fixture({invalidReceipt:true}).post()).status,503);assert.equal((await fixture({invalidReceipt:true}).get()).status,503);
});
