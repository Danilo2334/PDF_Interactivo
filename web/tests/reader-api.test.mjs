import assert from 'node:assert/strict';
import test, {beforeEach,afterEach} from 'node:test';
import {load,model,schemas,sessions,context,documentId,mediaId} from './reader-test-helpers.mjs';
const token='a'.repeat(48);
let previousSecret;
beforeEach(()=>{previousSecret=process.env.REINFORCEMENT_REQUEST_SECRET;process.env.REINFORCEMENT_REQUEST_SECRET='a'.repeat(64);});
afterEach(()=>{if(previousSecret===undefined)delete process.env.REINFORCEMENT_REQUEST_SECRET;else process.env.REINFORCEMENT_REQUEST_SECRET=previousSecret;});
function fixture(options={}){
 const calls=[];class ReaderUnavailable extends Error{constructor(status=404){super('Unavailable');this.status=status;}}
 const ctx={...context,db:{storage:{from:()=>({createSignedUrl:async()=>({data:{signedUrl:'https://storage.unit/asset'}})})}},snapshot:{...context.snapshot,requireIdentification:!!options.identification}};
 const api=load('lib/readers/service.ts',{
  '@/lib/auth/access':{checkPermission:async()=>({ok:false,status:401,message:'Login required'})},'@/lib/supabase/server':{createClient:async()=>({})},
  '@/lib/reinforcements/request-service':{readSmallJson:async r=>({body:await r.json()})},'@/lib/documents/mutation-request':{isSameOriginMutation:r=>r.headers.get('origin')==='http://localhost'},
  '@/lib/validations/reader':schemas,'@/lib/readers/model':model,'@/lib/readers/session':sessions,
  '@/lib/readers/repository':{ReaderUnavailable,loadReader:async()=>{calls.push('authorize');if(options.denied)throw new ReaderUnavailable(options.denied);return ctx;}},
 },{fetch:async(url,init)=>{calls.push({url,headers:init.headers});return new Response(new Uint8Array([1,2,3]),{status:init.headers?.Range?206:200,headers:{'Content-Length':'3',...(init.headers?.Range?{'Content-Range':'bytes 0-2/100'}:{})}})}});
 const req=(path='',init={})=>new Request('http://localhost/api/read/'+token+path,init);
 return{api,calls,get:(cookie='')=>api.getReader(req('',{headers:{Cookie:cookie}}),token),asset:(id='pdf',cookie='',range='')=>api.getReaderAsset(req('/assets/'+id,{headers:{Cookie:cookie,...(range?{Range:range}:{})}}),token,id),identify:(body,origin='http://localhost')=>api.identifyReader(req('/identify',{method:'POST',headers:{Origin:origin},body:JSON.stringify(body)}),token)};
}
test('HU033 identity gate protects content and direct asset routes, cannot authorize missing/private publications and grants no owner session',async()=>{
 const previous=process.env.REINFORCEMENT_REQUEST_SECRET;process.env.REINFORCEMENT_REQUEST_SECRET='a'.repeat(64);
 try{
  const gated=fixture({identification:true});assert.equal((await(await gated.get()).json()).state,'identification_required');assert.equal((await gated.asset()).status,403);assert.equal((await gated.identify({name:'',email:''})).status,400);
  assert.equal((await gated.identify({name:'Reader QA',email:''},'https://foreign.invalid')).status,403);
  const response=await gated.identify({name:'Reader QA',email:''});assert.equal(response.status,200);const setCookie=response.headers.get('set-cookie');assert.match(setCookie,/HttpOnly/);assert.match(setCookie,/SameSite=Lax/);assert.ok(!setCookie.includes('Reader QA'));
  const cookie=setCookie.split(';')[0],ready=await(await gated.get(cookie)).json();assert.equal(ready.state,'ready');assert.equal(ready.view.version,4);assert.equal((await gated.asset('pdf',cookie)).status,200);
  const denied=fixture({identification:true,denied:404});assert.equal((await denied.identify({name:'Reader QA',email:''})).status,404);assert.equal((await denied.get(cookie)).status,404);assert.equal((await denied.asset('pdf',cookie)).status,404);
 }finally{if(previous===undefined)delete process.env.REINFORCEMENT_REQUEST_SECRET;else process.env.REINFORCEMENT_REQUEST_SECRET=previous;}
});
test('HU033 direct access needs no identity form when disabled, proxies only approved snapshot files and preserves range/secure headers',async()=>{
 const f=fixture(),view=await(await f.get()).json();assert.equal(view.state,'ready');assert.equal(f.calls.length,1);assert.doesNotMatch(JSON.stringify(view),/correctIndex|PRIVATE_FEEDBACK|storagePath/);
 const pdf=await f.asset('pdf','','bytes=0-2');assert.equal(pdf.status,206);assert.equal(pdf.headers.get('content-range'),'bytes 0-2/100');assert.match(pdf.headers.get('cache-control'),/no-store/);assert.equal(pdf.headers.get('referrer-policy'),'no-referrer');assert.equal(pdf.headers.get('x-content-type-options'),'nosniff');
 const assetId=model.readerObjectId(context.hash,'m',mediaId);assert.equal((await f.asset(assetId)).headers.get('content-type'),'image/png');
 assert.equal((await f.asset(documentId)).status,404);assert.equal((await f.asset('pdf','','bytes=0-2,4-5')).status,416);
 for(const denied of [404,503]){const unavailable=fixture({denied});assert.equal((await unavailable.get()).status,denied);assert.equal((await unavailable.asset()).status,denied);}
});
