import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareOfflineShell,offlineSupportState,subscribeOfflineSupport} from '../src/utils/offlineSupport.js';

test('el panel recibe el estado actual aunque se suscriba después de la preparación',async t=>{
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,'navigator');t.after(()=>Object.defineProperty(globalThis,'navigator',descriptor));
  const registration={installing:null,addEventListener(){}};
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{serviceWorker:{controller:{},ready:Promise.resolve(),addEventListener(){},register:async()=>registration}}});
  prepareOfflineShell(true);await new Promise(resolve=>setImmediate(resolve));
  assert.equal(offlineSupportState(),'ready');
  let received;const unsubscribe=subscribeOfflineSupport(value=>{received=value;});assert.equal(received,'ready');unsubscribe();
});

test('una instalación fallida muestra error y no deja la preparación indefinida',async t=>{
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,'navigator');t.after(()=>Object.defineProperty(globalThis,'navigator',descriptor));
  let stateChanged;const worker={state:'installing',addEventListener(name,callback){stateChanged=callback;}};
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{serviceWorker:{controller:null,ready:new Promise(()=>{}),addEventListener(){},register:async()=>({installing:worker,addEventListener(){}})}}});
  prepareOfflineShell(true);await new Promise(resolve=>setImmediate(resolve));
  worker.state='redundant';stateChanged();assert.equal(offlineSupportState(),'failed');
});
