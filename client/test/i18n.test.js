import {readerCatalog} from '../src/i18n/readerCatalog.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {polishCatalog} from '../src/i18n/polishCatalog.js';
import {catalog} from '../src/i18n/catalog.js';
import {extraCatalog,aliases} from '../src/i18n/extraCatalog.js';
import {passwordCatalog} from '../src/i18n/passwordCatalog.js';
import {experienceCatalog} from '../src/i18n/experienceCatalog.js';
import {launchCatalog} from '../src/i18n/launchCatalog.js';
import {ui,setLocale,getLocale,subscribeLocale,INTERFACE_LANGUAGES} from '../src/i18n/runtime.js';
import {STORY_LANGUAGES} from '../src/data/languages.js';
const more=JSON.parse(readFileSync(new URL('../src/i18n/moreCatalog.json',import.meta.url),'utf8'));
const dictionaries={...catalog,...extraCatalog,...more,...passwordCatalog,...experienceCatalog,...launchCatalog,...polishCatalog,...readerCatalog};
const norm=s=>s.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
test('catálogos completos en cinco traducciones y parámetros preservados',()=>{
 for(const [key,values] of Object.entries(dictionaries)){
  assert.equal(values.length,5,key);
  const parameters=[...key.matchAll(/\{\d+\}/g)].map(x=>x[0]).sort();
  for(const value of values){assert.ok(value.trim(),key);assert.deepEqual([...value.matchAll(/\{\d+\}/g)].map(x=>x[0]).sort(),parameters,key);}
 }
 const available=new Set(Object.keys(dictionaries).map(norm));
 for(const target of Object.values(aliases))assert.ok(available.has(norm(target)),target);
});
test('idioma cambia los controles sin interpretar ni traducir nombres de obras',async()=>{
 for(const [locale] of INTERFACE_LANGUAGES){await setLocale(locale);const title='<img onerror=alert(1)> Mi Obra {99}';assert.ok(ui('Estadísticas de «{0}»',[title]).includes(title));assert.equal(ui('Nombre no registrado'),'Nombre no registrado');}
 await setLocale('ja');assert.equal(ui('Título'),'タイトル');assert.equal(ui('Historia creada: Mi Obra {99}'),'作品を作成：Mi Obra {99}');
 await setLocale('en');assert.equal(ui(' Categoria '),' Category ');assert.equal(ui(' '),' ');
 await setLocale('es');
});
test('la preferencia de interfaz persiste y no acepta idiomas desconocidos',async()=>{
 const previous=globalThis.localStorage;let saved;
 globalThis.localStorage={setItem:(key,value)=>{saved={key,value};}};
 let calls=0;const stop=subscribeLocale(()=>calls++);
 try{await setLocale('ko');assert.deepEqual(saved,{key:'valoria-interface-language',value:'ko'});assert.equal(getLocale(),'ko');await setLocale('invalid');assert.equal(getLocale(),'ko');assert.equal(calls,1);}finally{stop();globalThis.localStorage=previous;await setLocale('es');}
 assert.equal(new Set(STORY_LANGUAGES.map(([value])=>value)).size,STORY_LANGUAGES.length);
 for(const key of ['Chino','Coreano','Japones','Hindi','English','Portugues','Frances','Italiano','Aleman','Espanol'])assert.ok(STORY_LANGUAGES.some(([value])=>value===key));
});
