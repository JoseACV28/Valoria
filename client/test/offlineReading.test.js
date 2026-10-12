import test from 'node:test';
import assert from 'node:assert/strict';
import { readOfflineWorks,saveOfflineWork,removeOfflineWork } from '../src/utils/offlineReading.js';
const data=new Map();globalThis.localStorage={getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)};
test('copias offline conservan formato, separan cuentas y permiten borrado explícito',()=>{
 data.clear();saveOfflineWork('one',{id:'story',title:'Historia'},[{id:'chapter',title:'Inicio',content:'valoria-rich-v1:<p><strong>Texto</strong></p>'}]);
 assert.equal(readOfflineWorks('two').length,0);assert.equal(readOfflineWorks('guest').length,0);
 assert.match(readOfflineWorks('one')[0].chapters[0].content,/<strong>/);
 removeOfflineWork('one','story');assert.equal(readOfflineWorks('one').length,0);
 data.set('valoria-offline:one','{bad');assert.deepEqual(readOfflineWorks('one'),[]);
});
test('el tamaño de una copia no desborda el almacenamiento sin avisar',()=>{
 assert.throws(()=>saveOfflineWork('one',{id:'big'},[{content:'x'.repeat(2100000)}]));
});
