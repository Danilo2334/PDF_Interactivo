import assert from 'node:assert/strict';
import test from 'node:test';
import {checkOperations} from '../scripts/check-operations.mjs';
import {load} from './reinforcement-test-helpers.mjs';
const sha='a'.repeat(40),ref='2f199784-0d8b-47ee-8e12-96834511726c';
function transport(options={}){return async(url,init)=>{
 const path=new URL(url).pathname;assert.equal(init.redirect,'manual');assert.equal(init.headers?.Cookie,undefined);
 if(path==='/login')return new Response('Iniciar sesión',{status:200});
 if(path==='/dashboard')return new Response(null,{status:307,headers:{location:options.foreign?'https://foreign.example/login':'/login'}});
 if(path.endsWith('/pdf'))return Response.json({message:'No session'},{status:401,headers:{'Cache-Control':'private, no-store'}});
 if(path.endsWith('/replace')){assert.equal(init.method,'POST');return Response.json({message:'Rejected'},{status:403,headers:{'x-operation-reference':ref}})}
 return Response.json({status:'alive',revision:options.sha??sha,checkedAt:new Date().toISOString()},{headers:{'Cache-Control':'no-store'}});
}}
test('HU046 service verification measures real response timings and treats expected authentication/CSRF rejections as healthy contracts',async()=>{
 const report=await checkOperations({origin:'https://pdf-interactivo-qa.vercel.app',expectedRevision:sha,transport:transport()});
 assert.equal(report.passed,true);assert.equal(report.metrics.samples,5);assert.equal(report.metrics.failedChecksPercent,0);assert.equal(report.alerts.length,0);assert.ok(report.metrics.maxHttpMs>=0);
 assert.equal(report.checks.find(c=>c.name==='foreign_mutation').reference,ref);
});
test('HU046 wrong source revision and cross-origin login redirect fail the release gate with a bounded diagnostic alert',async()=>{
 const report=await checkOperations({origin:'https://pdf-interactivo-qa.vercel.app',expectedRevision:sha,transport:transport({sha:'b'.repeat(40),foreign:true})});
 assert.equal(report.passed,false);assert.equal(report.alerts.length,2);assert.equal(report.metrics.failedChecksPercent,40);
 assert.ok(report.alerts.every(a=>a.code==='CONTRACT_MISMATCH'));assert.doesNotMatch(JSON.stringify(report),/https:\/\/foreign|access_token|password/);
});
test('HU046 probes refuse foreign targets, credentials and ambiguous legacy revision checks; never deploy or mutate accepted state',async()=>{
 for(const origin of ['https://example.com','https://user:secret@pdf-interactivo-qa.vercel.app','https://pdf-interactivo-qa.vercel.app/?token=private','http://127.0.0.1:3001'])
  await assert.rejects(()=>checkOperations({origin,transport:transport()}));
 await assert.rejects(()=>checkOperations({origin:'https://pdf-interactivo-qa.vercel.app',expectedRevision:sha,includeHealth:false}));
 const legacy=await checkOperations({origin:'http://127.0.0.1:3001',allowLocal:true,includeHealth:false,transport:transport()});assert.equal(legacy.passed,true);assert.equal(legacy.metrics.samples,4);
 const broken=await checkOperations({origin:'https://pdf-interactivo-qa.vercel.app',transport:async()=>{throw Error('QA_PRIVATE_UPSTREAM_TOKEN')}});assert.equal(broken.metrics.respondedPercent,0);assert.equal(broken.alerts.length,5);assert.doesNotMatch(JSON.stringify(broken),/QA_PRIVATE/);
});
test('HU046 public liveness reveals only a valid source revision and does not query Supabase or expose environment values',async()=>{
 const route=load('app/api/health/route.ts',{}, {process:{env:{APP_BUILD_REVISION:'private-value',SUPABASE_SERVER_KEY:'QA_PRIVATE_KEY'}}});
 const r=await route.GET(),body=await r.json();assert.equal(body.revision,null);assert.equal(body.status,'alive');assert.match(r.headers.get('cache-control'),/no-store/);assert.deepEqual(Object.keys(body).sort(),['checkedAt','revision','status']);
});
