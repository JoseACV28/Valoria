import test from 'node:test';
import assert from 'node:assert/strict';
import {loadLibrary,readLibrary,saveLibraryItem,removeLibraryItem} from '../src/utils/library.js';
import {saveWorkspace} from '../src/api/workspaceApi.js';
test('biblioteca sincronizada: cambios offline, eliminaciones y aislamiento',async t=>{
 const storage=new Map(),remote=new Map();let offline=false;
 const original={fetch:globalThis.fetch,window:globalThis.window,localStorage:globalThis.localStorage};
 globalThis.window={dispatchEvent(){}};globalThis.localStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)};
 globalThis.fetch=async(url,options)=>{
  if(offline)throw new Error('Offline');
  const parts=new URL(url).pathname.split('/');const key=decodeURIComponent(parts.at(-1)),user=options.headers.Authorization;
  const account=remote.get(user)||new Map();remote.set(user,account);
  if(options.method==='PUT'){account.set(key,JSON.parse(options.body));return new Response(JSON.stringify({item:{key}}),{status:200});}
  if(options.method==='DELETE'){account.delete(key);return new Response(null,{status:204});}
  return new Response(JSON.stringify({items:[...account].map(([key,data])=>({key,data,updated_at:new Date().toISOString()}))}),{status:200});
 };
 t.after(()=>Object.assign(globalThis,original));
 const owner={user:{id:'owner'},token:'owner'},other={user:{id:'other'},token:'other'};
 await saveLibraryItem(owner,'story',{title:'Historia',status:'reading'});
 assert.equal(readLibrary('owner').story.pending,false);
 assert.deepEqual(await loadLibrary(other),{});
 remote.get('Bearer owner').delete('story');
 assert.deepEqual(await loadLibrary(owner),{},'una eliminación en otro dispositivo elimina la copia sincronizada');
 offline=true;
 await assert.rejects(saveLibraryItem(owner,'offline',{title:'Sin conexión',status:'want'}));
 assert.equal(readLibrary('owner').offline.pending,true);
 offline=false;assert.equal((await loadLibrary(owner)).offline.title,'Sin conexión');
 assert.equal(remote.get('Bearer owner').get('offline').title,'Sin conexión');
 offline=true;await assert.rejects(removeLibraryItem(owner,'offline'));
 assert.deepEqual(readLibrary('owner'),{},'oculta la eliminación pendiente');
 offline=false;assert.deepEqual(await loadLibrary(owner),{});assert.equal(remote.get('Bearer owner').has('offline'),false);
});
test('las escrituras del mismo borrador conservan el orden incluso con una respuesta lenta',async t=>{
 const original=globalThis.fetch;const pending=[];globalThis.fetch=(url,options)=>new Promise(resolve=>pending.push({body:JSON.parse(options.body),resolve}));t.after(()=>{globalThis.fetch=original;});
 const old=saveWorkspace('drafts','ordered',{text:'antiguo'},'queue-test');
 const latest=saveWorkspace('drafts','ordered',{text:'nuevo'},'queue-test');
 await new Promise(resolve=>setImmediate(resolve));assert.equal(pending.length,1);
 pending[0].resolve(new Response('{}'));await old;
 await new Promise(resolve=>setImmediate(resolve));assert.equal(pending.length,2);assert.equal(pending[1].body.text,'nuevo');
 pending[1].resolve(new Response('{}'));await latest;
});
