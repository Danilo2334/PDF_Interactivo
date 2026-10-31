import assert from 'node:assert/strict';
import test from 'node:test';
import {load,model,schemas,snapshot,context,owner,other,projectId,documentId,publicationId} from './reader-test-helpers.mjs';
function fixture(options={}){
 let now=Date.now();const signed=[];
 const db={from(table){let selection='',filters=[];return{select(value){selection=value;return this},eq(k,v){filters.push([k,v]);return this},not(){return this},order(){return this},limit(){return this},async maybeSingle(){
  if(options.network)return{error:{code:'connection'}};
  if(table==='projects')return{data:options.missingProject?null:{id:projectId,owner_id:owner,document_id:options.changedDocument?other:documentId,status:options.deleting?'deleting':'pending',name:'QA-reader'}};
  if(table==='profiles')return{data:{is_active:!options.inactive,role:'owner'}};
  if(table==='documents')return{data:{id:documentId,owner_id:owner,status:'uploaded',storage_path:owner+'/original.pdf',size_bytes:100}};
  if(table==='experience_publications'){
   if(selection==='id')return{data:{id:options.superseded?other:publicationId}};
   if(selection==='id,snapshot_hash')return{data:options.revoked?null:{id:publicationId,snapshot_hash:context.hash}};
   return{data:options.foreign?null:{id:publicationId,owner_id:owner,project_id:projectId,document_id:documentId,version:4,snapshot:structuredClone(snapshot),snapshot_hash:context.hash,published_at:options.private?null:new Date().toISOString(),origin:'https://deployed.unit'}};
  }throw Error(table);
 }}},storage:{from(bucket){return{createSignedUrl:async(path,seconds)=>{signed.push({bucket,path,seconds});return{data:{signedUrl:'https://storage.unit/'+bucket},error:null}}}}}};
 const repo=load('lib/readers/repository.ts',{'@supabase/supabase-js':{createClient:()=>db},'@/lib/publications/proof':{publicationOrigin:()=>options.noOrigin?null:'https://deployed.unit'},'@/lib/readers/model':model,'@/lib/validations/reader':schemas,'@/lib/auth/access':{checkPermission:async()=>options.denied?{ok:false,status:options.denied}:{ok:true,userId:owner}},'@/lib/supabase/server':{createClient:async()=>db}},{Date:{now:()=>now}});
 return{repo,db,signed,advance:ms=>{now+=ms;}};
}
function localEnv(){const names=['SUPABASE_SERVER_KEY','NEXT_PUBLIC_SUPABASE_URL'];const previous=Object.fromEntries(names.map(n=>[n,process.env[n]]));Object.assign(process.env,{SUPABASE_SERVER_KEY:'sb_secret_isolated_test',NEXT_PUBLIC_SUPABASE_URL:'https://isolated.supabase.co'});return()=>{for(const key of names)if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key];};}
test('HU033 production resolver rejects private/superseded publications, inactive owner, replacement/deletion and failed validation before serving bytes',async()=>{
 const restore=localEnv();try{
  const request=new Request('https://deployed.unit/api/read/'+'a'.repeat(48));
  const ready=await fixture().repo.loadReader(request,'a'.repeat(48));assert.equal(ready.privateTest,false);assert.equal(ready.version,4);
  for(const option of ['private','superseded','inactive','changedDocument','deleting','missingProject','revoked','noOrigin'])await assert.rejects(fixture({[option]:true}).repo.loadReader(request,'a'.repeat(48)),e=>e.status===404,option);
  await assert.rejects(fixture({network:true}).repo.loadReader(request,'a'.repeat(48)),e=>e.status===503);

  delete process.env.SUPABASE_SERVER_KEY;await assert.rejects(fixture().repo.loadReader(request,'a'.repeat(48)),e=>e.status===503);
 }finally{restore();}
});
test('HU033 private visual rehearsal always authenticates the owner and cannot be addressed through public token routes',async()=>{
 const request=new Request(`http://localhost/api/projects/${projectId}/reader-test/${publicationId}`),token='private_'+publicationId;
 assert.equal((await fixture().repo.loadReader(request,token)).privateTest,true);
 for(const denied of [401,403,503])await assert.rejects(fixture({denied}).repo.loadReader(request,token),e=>e.status===denied);
 await assert.rejects(fixture({foreign:true}).repo.loadReader(request,token),e=>e.status===404);
 await assert.rejects(fixture().repo.loadReader(new Request('http://localhost/api/read/'+token),token),e=>e.status===404);
});
