import test from 'node:test';import assert from 'node:assert/strict';import {once} from 'node:events';import {randomUUID} from 'node:crypto';
process.env.SUPABASE_URL='';process.env.SUPABASE_ANON_KEY='';process.env.SUPABASE_SERVICE_ROLE_KEY='';
const {default:app}=await import('../src/app.js');
const {chapterRecipients}=await import('../src/utils/storyFollowing.js');
const {NotificationModel}=await import('../src/models/notificationModel.js');
test('seguimiento de historias y avisos conservan identidad, privacidad y preferencias',async t=>{
 const server=app.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>new Promise(resolve=>server.close(resolve)));const base=`http://127.0.0.1:${server.address().port}/api`;
 async function req(path,token='',method='GET',body){const response=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:response.status,data:response.status===204?null:await response.json()};}
 async function user(){return (await req('/auth/register','','POST',{email:`${randomUUID()}@example.invalid`,password:'Reader-QA-strong-2026',displayName:'QA'})).data;}
 const author=await user(),reader=await user(),other=await user();const a=author.accessToken,r=reader.accessToken,o=other.accessToken;
 const story=(await req('/stories',a,'POST',{title:'Historia QA',description:'Ficción temporal',category:'Fantasia',status:'published'})).data.story;
 await t.test('seguir una obra exige sesión y no acepta una identidad enviada por cliente',async()=>{
  const path=`/reader/story-following/${story.id}`;assert.equal((await req(path)).status,401);assert.equal((await req(path,r,'PUT',{following:true,muted:false,user_id:other.user.id})).status,400);
  assert.equal((await req(path,r,'PUT',{following:true,muted:false})).status,200);assert.equal((await req('/reader/story-following',r)).data.items.length,1);assert.equal((await req('/reader/story-following',o)).data.items.length,0);assert.equal((await req(path,o)).data.following,false);
  assert.equal((await req(path,r,'PUT',{following:true,muted:true})).data.muted,true);
  assert.equal((await req(path,r,'PUT',{following:false,muted:false})).status,200);assert.equal((await req('/reader/story-following',r)).data.items.length,0);
 });
 await t.test('avisos solo editables por autor, códigos validados y conservados al editar saga',async()=>{
  const path=`/experience/works/story/${story.id}`,body={seriesName:'Saga QA',seriesPosition:1,contentWarnings:['violence','grief']};
  assert.equal((await req(path,o,'PUT',body)).status,403);assert.equal((await req(path,a,'PUT',{...body,contentWarnings:['unknown']})).status,400);assert.equal((await req(path,a,'PUT',body)).status,200);
  assert.deepEqual((await req(path)).data.detail.data.contentWarnings,['violence','grief']);await req(path,a,'PUT',{seriesName:'Otra saga',seriesPosition:2});assert.deepEqual((await req(path)).data.detail.data.contentWarnings,['violence','grief']);
 });
 await t.test('silenciar o dejar de seguir excluye avisos incluso si se sigue al autor',async()=>{
  const preferences=[{user_id:reader.user.id,data:{following:true,muted:true}},{user_id:other.user.id,data:{following:false,muted:false}}];assert.deepEqual(chapterRecipients(author.user.id,[reader.user.id,other.user.id,author.user.id],preferences),[]);
  preferences[0].data.muted=false;assert.deepEqual(chapterRecipients(author.user.id,[reader.user.id,other.user.id],preferences),[reader.user.id]);
  await req('/workspace/preferences/notifications',r,'PUT',{newChapters:false});assert.equal(await NotificationModel.create({recipientId:reader.user.id,actorId:author.user.id,type:'chapter_published',title:'Nuevo capítulo'}),null);
 });
 await t.test('no se puede seguir un borrador ajeno; siempre se puede retirar el seguimiento propio',async()=>{
  const draft=(await req('/stories',a,'POST',{title:'Privada QA',description:'Solo autor',category:'Fantasia',status:'draft'})).data.story;
  const path=`/reader/story-following/${draft.id}`;assert.equal((await req(path,r,'PUT',{following:true,muted:false})).status,404);assert.equal((await req(path,r,'PUT',{following:false,muted:false})).status,200);assert.equal((await req(path,r)).status,404);
 });
});
