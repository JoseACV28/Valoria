import test from 'node:test';import assert from 'node:assert/strict';
import {recommendedStories,setRecommendationHidden,hiddenRecommendations,loadRecommendationPreferences} from '../src/utils/recommendations.js';
test('recomendaciones explicadas excluyen obras guardadas, ocultas y borradores',()=>{
 const stories=[{id:'a',status:'published',authorId:'author',category:'Fantasia'},{id:'b',status:'published',authorId:'author',author:'Autora',category:'Romance'},{id:'c',status:'published',authorId:'other',category:'Fantasia'},{id:'d',status:'draft',category:'Fantasia'}];
 const result=recommendedStories(stories,{a:{id:'a',type:'story'}},['c']);assert.deepEqual(result.map(x=>x.id),['b']);assert.deepEqual(result[0].recommendation,{kind:'author',value:'Autora'});assert.equal(recommendedStories(stories,{a:{id:'a',type:'story'}}).find(x=>x.id==='c').recommendation.kind,'category');
});
test('ocultar persiste por cuenta, conserva cambios sin red y vuelve a sincronizarlos',async()=>{
 const originalStorage=globalThis.localStorage,originalFetch=globalThis.fetch,cache=new Map();globalThis.localStorage={getItem:key=>cache.get(key)||null,setItem:(key,value)=>cache.set(key,value)};
 try{await setRecommendationHidden({user:{id:'guest-qa'}},'work',true);assert.deepEqual(hiddenRecommendations('guest-qa'),['work']);assert.deepEqual(hiddenRecommendations('other'),[]);
  globalThis.fetch=async()=>{throw Error('offline');};const auth={user:{id:'signed-qa'},token:'fiction'};await assert.rejects(setRecommendationHidden(auth,'work',true));assert.deepEqual(hiddenRecommendations('signed-qa'),['work']);
  globalThis.fetch=async(url,options)=>new Response(JSON.stringify(options.method==='PUT'?{item:{}}:{items:[{key:'recommendation-hidden:work',data:{enabled:true}}]}),{headers:{'Content-Type':'application/json'}});assert.deepEqual(await loadRecommendationPreferences(auth),['work']);await setRecommendationHidden(auth,'work',false);assert.deepEqual(hiddenRecommendations('signed-qa'),[]);
 }finally{globalThis.localStorage=originalStorage;globalThis.fetch=originalFetch;}
});
