import {fileURLToPath} from 'node:url';

export async function checkOperations({origin,expectedRevision,includeHealth=true,allowLocal=false,transport=fetch}) {
  const base=new URL(origin);
  const local=allowLocal&&base.protocol==='http:'&&['127.0.0.1','localhost'].includes(base.hostname);
  if ((!local&&base.origin!=='https://pdf-interactivo-qa.vercel.app')||base.username||base.password||base.pathname!=='/'||base.search||base.hash)
    throw Error('Only the named Danilo QA origin or explicitly enabled loopback is allowed');
  if(expectedRevision&&!/^[a-f0-9]{40}$/.test(expectedRevision))throw Error('Expected revision must be a full commit SHA');
  if(expectedRevision&&!includeHealth)throw Error('Legacy mode cannot verify a source revision');
  const checks=[],alerts=[];
  async function check(name,path,expected,validate,init={}) {
    const started=performance.now();let status=null,reference=null,passed=false,code='NETWORK_FAILURE',validHttp=false;
    try{
      const response=await transport(base.origin+path,{...init,redirect:'manual',signal:AbortSignal.timeout(15000),cache:'no-store'});
      status=response.status;validHttp=expected.includes(status);
      const rawRef=response.headers.get('x-operation-reference');if(rawRef&&/^[a-f0-9-]{36}$/i.test(rawRef))reference=rawRef;
      passed=validHttp&&await validate(response);code=validHttp?'CONTRACT_MISMATCH':'HTTP_MISMATCH';
    }catch{/* never log response bodies, headers, URLs, cookies or Error.message */}
    const elapsedMs=Number((performance.now()-started).toFixed(2));
    checks.push({name,passed,status,expected,elapsedMs,reference});
    if(!passed)alerts.push({code,operation:name,reference,action:'Detener la liberación, conservar el reporte y contrastar la referencia con los registros. Verificar la versión anterior antes de revertir.'});
  }
  await check('login','/login',[200],async r=>(await r.text()).includes('Iniciar sesión'));
  await check('private_page','/dashboard',[303,307],async r=>{
    const location=r.headers.get('location');if(!location)return false;const target=new URL(location,base);return target.origin===base.origin&&target.pathname==='/login';
  });
  await check('private_pdf','/api/projects/00000000-0000-4000-8000-000000000000/pdf',[401],async r=>/no-store/i.test(r.headers.get('cache-control')??''));
  await check('foreign_mutation','/api/projects/00000000-0000-4000-8000-000000000000/replace',[403],async()=>true,
    {method:'POST',headers:{Origin:'https://foreign.example','Content-Type':'application/json'},body:'{}'});
  if(includeHealth)await check('liveness_revision','/api/health',[200],async r=>{
    const body=await r.json();return body?.status==='alive'&&!Number.isNaN(Date.parse(body.checkedAt))&&
      (!expectedRevision||body.revision===expectedRevision)&&/no-store/i.test(r.headers.get('cache-control')??'');
  });
  const durations=checks.map(c=>c.elapsedMs).sort((a,b)=>a-b),failures=checks.filter(c=>!c.passed).length;
  return {event:'qa_operations',schemaVersion:1,checkedAt:new Date().toISOString(),origin:base.origin,
    expectedRevision:expectedRevision??null,healthChecked:includeHealth,passed:failures===0,
    metrics:{samples:checks.length,respondedPercent:checks.filter(c=>c.status!==null).length/checks.length*100,
      failedChecksPercent:failures/checks.length*100,p50HttpMs:durations[Math.ceil(durations.length*.5)-1],p95HttpMs:durations[Math.ceil(durations.length*.95)-1],maxHttpMs:Math.max(...durations)},
    checks,alerts,scope:'Sondeo HTTP anónimo puntual, sin cookies personales, escrituras aceptadas ni IA. Liveness no acredita salud integral de dependencias. No mide el renderizado RNF ni representa disponibilidad histórica.'};
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2);
  if(args.some(a=>!['--legacy','--local'].includes(a))){console.error('Uso: QA_ORIGIN y QA_EXPECTED_REVISION en el entorno; --legacy omite liveness en versiones anteriores, --local permite solo loopback.');process.exitCode=2;}
  else try{
    const report=await checkOperations({origin:process.env.QA_ORIGIN??'https://pdf-interactivo-qa.vercel.app',expectedRevision:process.env.QA_EXPECTED_REVISION,
      includeHealth:!args.includes('--legacy'),allowLocal:args.includes('--local')});
    console.log(JSON.stringify(report,null,2));process.exitCode=report.passed?0:1;
  }catch{console.error('Configuración de comprobación no válida; no se ejecutó ninguna liberación ni reversión.');process.exitCode=2;}
}
