import assert from 'node:assert/strict';
import test from 'node:test';
import {model,schemas,sessions,snapshot,context,owner,other,documentId} from './reader-test-helpers.mjs';
test('HU033 reader projection has opaque identities and approved educational content only, never private keys, paths or configuration',()=>{
 const parsed=model.readerSnapshotSchema.parse(snapshot);model.validateSnapshotSources(parsed,owner,documentId);
 const view=model.readerProjection(parsed,context.hash,false),text=JSON.stringify(view);assert.equal(view.items[0].quiz.questions[0].options.length,2);
 for(const forbidden of ['correctIndex','PRIVATE_FEEDBACK','DO_NOT_SERIALIZE','storagePath',owner,documentId,snapshot.items[0].id,snapshot.items[0].quiz.id])assert.ok(!text.includes(forbidden),forbidden);
 assert.match(view.items[0].id,/^r_[a-f0-9]{32}$/);assert.equal(view.items[0].media[0].url,null);assert.equal(schemas.readerViewSchema.safeParse(view).success,true);
 for(const changed of [{...parsed,document:{...parsed.document,id:other}},{...parsed,document:{...parsed.document,storagePath:owner+'/../other.pdf'}},{...parsed,items:[{...parsed.items[0],media:[{...parsed.items[0].media[0],owner_id:other}]}]}])assert.throws(()=>model.validateSnapshotSources(changed,owner,documentId));
});
test('HU033 declared identity session is bounded, signed and publication-specific; it retains no raw personal information and grants no owner identity',()=>{
 const old=process.env.REINFORCEMENT_REQUEST_SECRET;process.env.REINFORCEMENT_REQUEST_SECRET='a'.repeat(64);
 try{
  const token='b'.repeat(48),value=sessions.createReaderSession(token,{name:'Reader QA',email:'reader@example.invalid'}),cookie=sessions.readerCookieName(token)+'='+value;
  const req=new Request('http://localhost',{headers:{Cookie:cookie}});assert.equal(sessions.hasReaderSession(req,token),true);assert.equal(sessions.hasReaderSession(req,'c'.repeat(48)),false);
  assert.equal(sessions.hasReaderSession(new Request('http://localhost',{headers:{Cookie:cookie.slice(0,-1)+(cookie.endsWith('a')?'b':'a')}}),token),false);
  assert.equal(sessions.hasReaderSession(req,token,Date.now()+1801000),false);assert.doesNotMatch(Buffer.from(value.split('.')[0],'base64url').toString(),/Reader QA|reader@example|userId|owner/);
  for(const identity of [{name:'',email:''},{name:' ',email:''},{name:'A',email:''},{name:'',email:'not an email'}])assert.equal(schemas.readerIdentitySchema.safeParse(identity).success,false);
  assert.equal(schemas.readerIdentitySchema.safeParse({name:'Reader QA',email:''}).success,true);assert.equal(schemas.readerIdentitySchema.safeParse({name:'',email:'qa@example.invalid'}).success,true);
 }finally{if(old===undefined)delete process.env.REINFORCEMENT_REQUEST_SECRET;else process.env.REINFORCEMENT_REQUEST_SECRET=old;}
});
test('HU033 malformed tokens and nested answer fields cannot enter strict reader replies',()=>{
 for(const token of ['short','../private','a'.repeat(47),'local_'+ 'a'.repeat(49)])assert.equal(schemas.readerTokenSchema.safeParse(token).success,false);
 const view=model.readerProjection(snapshot,context.hash,false);view.items[0].quiz.questions[0].correctIndex=0;assert.equal(schemas.readerViewSchema.safeParse(view).success,false);
 const forbidden=structuredClone(snapshot);forbidden.items[0].media[0].approved_version_id=other;assert.throws(()=>model.validateSnapshotSources(forbidden,owner,documentId));
});
