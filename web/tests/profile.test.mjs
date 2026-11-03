import assert from 'node:assert/strict';
import test from 'node:test';
import {load} from './reinforcement-test-helpers.mjs';

const validation=load('lib/validations/profile.ts');

test('profile names require letters, keep international names and enforce trimmed length and allowed characters',()=>{
 for(const fullName of ['', '   ', 'A', '--', "''", "'-", '\u0301\u0301', 'Ana123', '<script>', 'A'.repeat(101)])
  assert.equal(validation.profileSchema.safeParse({fullName}).success,false,JSON.stringify(fullName));
 for(const fullName of ['Ana María', "O'Neill", 'Jean-Luc', '李明', 'A'.repeat(100), 'Jose\u0301 García'])
  assert.equal(validation.profileSchema.safeParse({fullName}).success,true,fullName);
 assert.equal(validation.profileSchema.parse({fullName:'  Ana María  '}).fullName,'Ana María');
});

function actionFixture({user={id:'qa-owner'},userError=null,access={ok:true,userId:'qa-owner'},saveError=null}={}){
 const updates=[],invalidated=[];let clientCalls=0;
 const actions=load('app/actions/update-profile.ts',{
  'next/cache':{revalidatePath:path=>invalidated.push(path)},
  '@/lib/auth/access':{getCurrentAccess:async()=>access},
  '@/lib/supabase/server':{createClient:async()=>{clientCalls++;return{auth:{getUser:async()=>({data:{user},error:userError}),updateUser:async input=>{updates.push(input);return{error:saveError};}}};}},
  '@/lib/validations/profile':validation,
 });
 return{run:actions.updateProfileAction,updates,invalidated,get clientCalls(){return clientCalls;}};
}

test('server rejects invalid profile input before persistence and never accepts caller-supplied identity or privileged fields',async()=>{
 const invalid=actionFixture();assert.equal((await invalid.run({fullName:'--'})).success,false);assert.equal(invalid.clientCalls,0);
 const valid=actionFixture();const result=await valid.run({fullName:'  Ana María  ',userId:'other-user',email:'forged@example.invalid',role:'admin',app_metadata:{role:'admin'}});
 assert.equal(result.success,true);assert.equal(JSON.stringify(valid.updates),JSON.stringify([{data:{full_name:'Ana María'}}]));
 assert.deepEqual(valid.invalidated.sort(),['/dashboard','/profile']);
});

test('missing, expired and inactive sessions cannot update any profile',async()=>{
 for(const options of [{user:null},{user:null,userError:{message:'private upstream detail'}},{access:{ok:false,message:'Cuenta inactiva.'}}]){
  const fixture=actionFixture(options),result=await fixture.run({fullName:'Ana María'});
  assert.equal(result.success,false);assert.equal(fixture.updates.length,0);assert.equal(fixture.invalidated.length,0);
  assert.doesNotMatch(result.message,/private upstream detail/);
 }
});

test('failed persistence returns a safe error and does not announce or invalidate a saved profile',async()=>{
 const fixture=actionFixture({saveError:{message:'private upstream detail'}}),result=await fixture.run({fullName:'Ana María'});
 assert.equal(result.success,false);assert.match(result.message,/No fue posible actualizar el perfil/);
 assert.doesNotMatch(result.message,/private upstream detail/);assert.equal(fixture.invalidated.length,0);
});
