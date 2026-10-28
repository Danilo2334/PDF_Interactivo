import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { load, record } from './summary-test-helpers.mjs';
const schemas=load('lib/validations/reinforcement-media.ts');
const files=load('lib/reinforcements/media-file.ts',{'@/lib/validations/reinforcement-media':schemas});
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+nm0YAAAAASUVORK5CYII=','base64');
const input={documentId:record.document_id,reinforcementId:randomUUID(),approvedVersionId:randomUUID(),assetId:randomUUID(),title:'Diagrama de energía',approved:true,kind:'image'};
const asset={id:input.assetId,reinforcement_id:input.reinforcementId,approved_version_id:input.approvedVersionId,kind:'image',title:input.title,file_name:'energy.png',mime_type:'image/png',size_bytes:png.length,url:null,status:'approved',created_at:record.created_at,approved_at:record.created_at};
test('HU027 rejects unsafe protocols, lookalike hosts, redirects, IPs, credentials and unsupported media metadata',()=>{
  for(const url of ['javascript:alert(1)','http://es.wikipedia.org/wiki/Energia','https://es.wikipedia.org.evil.invalid/wiki/Energia','https://127.0.0.1/private','https://user:password@es.wikipedia.org/wiki/Energia','https://es.wikipedia.org:444/wiki/Energia','https://es.wikipedia.org/wiki/Energia?redirect=evil','https://youtu.be/invalid','https://www.youtube.com/redirect?q=evil'])assert.equal(schemas.allowedMediaUrl(url),null,url);
  assert.equal(schemas.allowedMediaUrl('https://es.wikipedia.org/wiki/Energ%C3%ADa'),'https://es.wikipedia.org/wiki/Energ%C3%ADa');
  assert.equal(schemas.allowedMediaUrl('https://youtu.be/abcdefghijk?t=3'),'https://www.youtube.com/watch?v=abcdefghijk');
  for(const f of [{name:'image.svg',type:'image/svg+xml',size:20},{name:'image.png',type:'text/html',size:20},{name:'../image.png',type:'image/png',size:20},{name:'image.png',type:'image/png',size:0},{name:'image.jpg',type:'image/jpeg',size:schemas.IMAGE_LIMIT+1},{name:'movie.mp4',type:'video/mp4',size:schemas.VIDEO_LIMIT+1}])assert.ok(schemas.mediaFileMetadata(f).error);
});
test('HU027 checks file bytes, JPEG/PNG structure, pixel limits and MP4 video containers rather than filename alone',async()=>{
  assert.equal(files.validMediaBytes(png,'image/png'),true);assert.equal(files.validMediaBytes(png.subarray(0,24),'image/png'),false);
  const huge=Buffer.from(png);huge.writeUInt32BE(20000000,16);assert.equal(files.validMediaBytes(huge,'image/png'),false);
  for(const mime of ['image/png','image/jpeg','video/mp4'])assert.equal(files.validMediaBytes(Buffer.from('<html><script>alert(1)</script></html>'),mime),false);
  assert.ok((await files.validateMediaFile(new File([png],'energy.png',{type:'image/png'}))).bytes);
  assert.ok((await files.validateMediaFile(new File([png],'energy.jpg',{type:'image/jpeg'}))).error);
});
function fixture(options={}){
  const calls=[],uploads=[],fetches=[];
  const db={from(){return{select(){return this},eq(){return this},order(){return Promise.resolve({data:[asset],error:null})},maybeSingle:async()=>({data:options.missing?null:{storage_path:'owner/private.png',kind:'image',mime_type:'image/png'},error:null})}},
    async rpc(name,proof){const p=JSON.parse(proof.p_payload);calls.push(p);if(options.rpcError)return{error:{code:options.rpcError}};return{data:p.action==='prepare'?{status:options.cached?'approved':'uploading'}:{...asset,status:p.action==='remove'?'removed':'approved'}}},
    storage:{from(){return{upload:async(...args)=>{uploads.push(args);return{error:options.uploadError?{}:null}},download:async()=>({data:options.sameLostUpload?new Blob([png]):null,error:null}),createSignedUrl:async()=>({data:{signedUrl:'https://storage.example.invalid/private?token=not-real'}})}}}};
  const service=load('lib/reinforcements/media-service.ts',{
    '@/lib/reinforcements/request-service':{authorizeRequest:async()=>options.denied?{response:new Response('{}',{status:options.denied})}:{db,userId:record.owner_id,row:record},
      readSmallJson:async r=>({body:await r.json()}),reply:(body,status=200)=>Response.json(body,{status})},
    '@/lib/documents/mutation-request':{isSameOriginMutation:r=>r.headers.get('Origin')==='http://localhost'},
    '@/lib/validations/reinforcement-media':schemas,'@/lib/reinforcements/media-file':files,
    '@/lib/reinforcements/media-proof':{signMediaProof:p=>({p_payload:JSON.stringify(p),p_signature:'isolated-test'})},
  },{fetch:async(url,init)=>{fetches.push({url,init});return new Response(png,{status:init.headers.Range?206:200,headers:{'Content-Type':'image/png','Content-Length':String(png.length),...(init.headers.Range?{'Content-Range':`bytes 0-${png.length-1}/${png.length}`}:{})}})}});
  const url='http://localhost/media?documentId='+record.document_id+'&reinforcementId='+input.reinforcementId;
  const post=(metadata=input,file=new File([png],'energy.png',{type:'image/png'}),origin='http://localhost',headers={})=>{const form=new FormData();form.set('metadata',JSON.stringify(metadata));if(file)form.set('file',file);return service.postMedia(new Request(url,{method:'POST',headers:{Origin:origin,...headers},body:form}),record.project_id,record.id)};
  return{calls,uploads,fetches,post,service,url};
}
test('HU027 endpoint requires origin, session, explicit approval and validated file before creating any resource',async()=>{
  const f=fixture();assert.equal((await f.post(input,undefined,'https://foreign.invalid')).status,403);
  assert.equal((await fixture({denied:401}).post()).status,401);
  assert.equal((await f.post({...input,approved:false})).status,400);
  assert.equal((await f.post(input,new File(['<html>'],'fake.png',{type:'image/png'}))).status,415);
  assert.equal((await f.post({...input,kind:'link',url:'https://localhost/private'},null)).status,415);
  assert.equal((await f.post(input,undefined,undefined,{'Content-Length':String(schemas.VIDEO_LIMIT+20000)})).status,413);
  assert.equal(f.calls.length,0);assert.equal(f.uploads.length,0);
});
test('HU027 prepares, uploads once, approves, supports exact lost-upload retry and never overwrites private bytes',async()=>{
  const f=fixture();assert.equal((await f.post()).status,200);assert.deepEqual(f.calls.map(p=>p.action),['prepare','approve']);assert.equal(f.uploads.length,1);assert.equal(f.uploads[0][2].upsert,false);assert.match(f.calls[0].fileHash,/^[a-f0-9]{64}$/);
  const cached=fixture({cached:true});assert.equal((await cached.post()).status,200);assert.equal(cached.uploads.length,0);
  assert.equal((await fixture({uploadError:true}).post()).status,503);
  assert.equal((await fixture({uploadError:true,sameLostUpload:true}).post()).status,200);
  for(const [code,status] of [['PT409',409],['42501',403],['P0001',429]])assert.equal((await fixture({rpcError:code}).post()).status,status);
  const link=fixture();assert.equal((await link.post({...input,kind:'link',url:'https://es.wikipedia.org/wiki/Energia'},null)).status,200);assert.equal(link.uploads.length,0);
});
test('HU027 streams private media with session and Range checks, no exposed signed URL, and blocks retired resources',async()=>{
  const f=fixture(),response=await f.service.getMediaFile(new Request(f.url,{headers:{Range:'bytes=0-20'}}),record.project_id,record.id,input.assetId);
  assert.equal(response.status,206);assert.equal(response.headers.get('X-Content-Type-Options'),'nosniff');assert.equal(response.headers.get('Cache-Control'),'private, no-store');assert.equal(response.headers.get('Location'),null);assert.equal(f.fetches[0].init.headers.Range,'bytes=0-20');
  assert.equal((await f.service.getMediaFile(new Request(f.url,{headers:{Range:'bytes=0-1,4-8'}}),record.project_id,record.id,input.assetId)).status,416);
  const missing=fixture({missing:true});assert.equal((await missing.service.getMediaFile(new Request(missing.url),record.project_id,record.id,input.assetId)).status,404);assert.equal(missing.fetches.length,0);
});
test('HU027 preview requires title, decoding and explicit approval; stored files do not load before an intentional preview',()=>{
  const {ReinforcementMedia}=load('components/documents/reinforcement-media.tsx',{react:React,'next/image':{default:()=>null},'@/lib/validations/reinforcement-media':schemas});
  const html=renderToStaticMarkup(React.createElement(ReinforcementMedia,{reinforcement:{id:input.reinforcementId,document_id:record.document_id,source_request_id:record.id,approved_version_id:input.approvedVersionId,media:[asset]},projectId:record.project_id,canManage:true}));
  assert.match(html,/Ver imagen guardada/);assert.doesNotMatch(html,/<img|<video/);assert.match(html,/Revisé la vista previa y apruebo este recurso/);assert.match(html,/disabled=""[^>]*>Guardar recurso aprobado/);assert.match(html,/Retirar recurso del formulario/);
});
