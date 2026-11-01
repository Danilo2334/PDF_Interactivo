import assert from 'node:assert/strict';
import test from 'node:test';
import {load} from './reinforcement-test-helpers.mjs';

test('HU035 responsive layout has a safe server snapshot and follows native breakpoint changes with listener cleanup',()=>{
  let captured,wide=false,listener,removed=false;
  const media={get matches(){return wide;},addEventListener(type,callback){assert.equal(type,'change');listener=callback;},removeEventListener(type,callback){assert.equal(type,'change');assert.equal(callback,listener);removed=true;}};
  const react={useSyncExternalStore(...args){captured=args;return args[2]();}};
  const client=load('lib/readers/layout.ts',{react},{window:{matchMedia(query){assert.equal(query,'(min-width: 64rem)');return media;}}});
  assert.equal(client.useWideReader(),false);const [subscribe,snapshot,serverSnapshot]=captured;
  assert.equal(serverSnapshot(),false);assert.equal(snapshot(),false);let updates=0;const cleanup=subscribe(()=>updates++);
  wide=true;listener();assert.equal(snapshot(),true);assert.equal(updates,1);wide=false;listener();assert.equal(snapshot(),false);
  cleanup();assert.equal(removed,true);
  const server=load('lib/readers/layout.ts',{react});assert.equal(server.useWideReader(),false);
});
