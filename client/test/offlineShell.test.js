import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
test('la caché permite navegar y cargar el editor sin red, excluyendo API e imágenes',async()=>{
 const source=await readFile(new URL('../public/sw.js',import.meta.url),'utf8');
 const handlers={},entries=new Map();let offline=false,claimed=false;
 const normalize=value=>typeof value==='string'?value:new URL(value.url).pathname;
 const cache={async addAll(files){for(const file of files)entries.set(file,new Response(file==='/'?'<html>Valoria</html>':'asset'));},async match(value){return entries.get(normalize(value));}};
 const context={URL,fetch:async value=>{if(offline)throw new Error('Network offline');if(value==='/offline-assets.json')return new Response(JSON.stringify(['/assets/app.js','/assets/editor.js']));return new Response('network');},caches:{async open(){return cache;},async keys(){return ['valoria-shell-old','valoria-shell-__BUILD__'];},async delete(){return true;},match:value=>cache.match(value)},self:{location:{origin:'https://example.invalid'},addEventListener:(name,fn)=>{handlers[name]=fn;},async skipWaiting(){},clients:{async claim(){claimed=true;}}}};
 vm.runInNewContext(source,context);let install;handlers.install({waitUntil:p=>{install=p;}});await install;let activate;handlers.activate({waitUntil:p=>{activate=p;}});await activate;assert.equal(claimed,true);
 offline=true;let response;
 handlers.fetch({request:{url:'https://example.invalid/',method:'GET',mode:'navigate'},respondWith:p=>{response=p;}});assert.match(await(await response).text(),/Valoria/);
 handlers.fetch({request:{url:'https://example.invalid/assets/editor.js',method:'GET',mode:'cors'},respondWith:p=>{response=p;}});assert.equal(await(await response).text(),'asset');
 for(const url of ['https://example.invalid/api/stories','https://supabase.example.invalid/storage/image.jpg','https://example.invalid/uploads/image.jpg']){let intercepted=false;handlers.fetch({request:{url,method:'GET',mode:'cors'},respondWith:()=>{intercepted=true;}});assert.equal(intercepted,false);}
});
