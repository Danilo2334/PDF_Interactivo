import assert from 'node:assert/strict';
import test from 'node:test';
import {randomUUID} from 'node:crypto';
import {load,model,context,owner,quizId} from './reader-test-helpers.mjs';
const feedback=load('lib/validations/experience-preview.ts',{
 '@/lib/validations/reinforcement-card':load('lib/validations/reinforcement-card.ts'),
 '@/lib/validations/reinforcement-media':load('lib/validations/reinforcement-media.ts'),
 '@/lib/validations/reinforcement-request':(await import('./reinforcement-test-helpers.mjs')).validation});
const schema=load('lib/validations/quiz-attempt.ts',{'@/lib/validations/experience-preview':feedback});
const receipt={attemptId:randomUUID(),number:1,createdAt:new Date().toISOString(),answers:[0],feedback:{score:1,total:1,questions:[{correct:true,explanation:'Graded in the database.',correctOption:'Conserved'}]},privateTest:true};
function fixture(options={}){
 const calls=[];class ReaderUnavailable extends Error{constructor(status=404){super('Unavailable');this.status=status;}}
 const ctx={...context,privateTest:!options.public,snapshot:{...context.snapshot,requireIdentification:!!options.identification},db:{rpc:async(name,args)=>{calls.push({name,args});return options.rpcError?{error:{code:options.rpcError}}:{data:JSON.parse(args.p_payload).action==='status'?{latest:null,attempts:0,allowRetries:false}:{...receipt,privateTest:!options.public}};}}};
 const api=load('lib/readers/attempt-service.ts',{
  '@/lib/reinforcements/request-service':{readSmallJson:async r=>({body:await r.json()})},'@/lib/documents/mutation-request':{isSameOriginMutation:r=>r.headers.get('origin')==='http://localhost'},
  '@/lib/validations/quiz-attempt':schema,'@/lib/readers/model':model,'@/lib/readers/repository':{ReaderUnavailable,loadReader:async()=>{if(options.denied)throw new ReaderUnavailable(options.denied);return ctx;}},
  '@/lib/readers/session':{getReaderSession:()=>options.noSession?null:{reader:'8f4cf03b-4713-43f1-9b6c-d435457f5afe',identified:!!options.identified}},
  '@/lib/readers/attempt-proof':{signQuizAttempt:p=>({p_payload:JSON.stringify(p),p_signature:'isolated'})},'@/lib/publications/proof':{publicationOrigin:()=>options.public?'https://deployed.example':null},
 });
 const qid=model.readerObjectId(context.hash,'q',quizId);
 return{calls,post:(body={operationId:receipt.attemptId,answers:[0]},origin='http://localhost',quiz=qid)=>api.readerQuizAttempt(new Request('http://localhost/attempts',{method:'POST',headers:{origin},body:JSON.stringify(body)}),'token',quiz,true),get:()=>api.readerQuizAttempt(new Request('http://localhost/attempts'),'token',qid,false)};
}
test('HU030 attempt API validates authorization, session, identification, exact quiz/options and strict answer-only body before a signed write',async()=>{
 for(const [options,status]of [[{denied:401},401],[{denied:404},404],[{noSession:true},428],[{identification:true},403]]){const f=fixture(options);assert.equal((await f.post()).status,status);assert.equal((await f.get()).status,status);assert.equal(f.calls.length,0);}
 const f=fixture();assert.equal((await f.post({},'https://foreign.invalid')).status,403);assert.equal((await f.post({operationId:receipt.attemptId,answers:[] })).status,400);
 for(const answers of [[2],[-1],[0,1]])assert.equal((await f.post({operationId:receipt.attemptId,answers})).status,400);
 for(const extra of [{score:1},{readerId:owner},{feedback:receipt.feedback}])assert.equal((await f.post({operationId:receipt.attemptId,answers:[0],...extra})).status,400);
 assert.equal((await f.post(undefined,'http://localhost','q_'+'f'.repeat(32))).status,404);assert.equal(f.calls.length,0);
});
test('HU030 exact operation ID reaches the database; private exercises never call the public attempt writer and errors do not retry',async()=>{
 const f=fixture();assert.equal((await f.post()).status,200);assert.equal(f.calls[0].name,'change_quiz_practice');const p=JSON.parse(f.calls[0].args.p_payload);assert.equal(p.readerId,owner);assert.equal(p.quizVersionId,quizId);assert.equal(p.operationId,receipt.attemptId);assert.equal(p.score,undefined);
 const guest=fixture({public:true});assert.equal((await guest.post()).status,200);assert.equal(guest.calls[0].name,'change_quiz_reader_attempt');assert.equal(JSON.parse(guest.calls[0].args.p_payload).userId,undefined);
 for(const [code,status]of [['PT409',409],['PT404',404],['PT429',429],['42501',403],['23514',400],['network',503]]){const error=fixture({rpcError:code});assert.equal((await error.post()).status,status);assert.equal(error.calls.length,1);}
 assert.equal(schema.quizAttemptInputSchema.safeParse({operationId:receipt.attemptId,answers:[0],correctIndex:0}).success,false);
 assert.equal(schema.quizAttemptReceiptSchema.safeParse({...receipt,feedback:{...receipt.feedback,score:2}}).success,false);
});
