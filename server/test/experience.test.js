import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';
process.env.SUPABASE_URL='';process.env.SUPABASE_ANON_KEY='';process.env.SUPABASE_SERVICE_ROLE_KEY='';process.env.SITE_OWNER_ID='20000000-0000-4000-8000-000000000001';
const {default:app}=await import('../src/app.js');
const {demoUsers}=await import('../src/data/authStore.js');
const {ChapterModel}=await import('../src/models/chapterModel.js');
test('experiencia: privacidad, versiones, sagas, selección y denuncias conservan permisos',async t=>{
  const server=app.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>new Promise(resolve=>server.close(resolve)));const base=`http://127.0.0.1:${server.address().port}/api`;
  async function req(path,token='',method='GET',body){const res=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:res.status,data:res.status===204?null:await res.json()};}
  async function register(name){return (await req('/auth/register','','POST',{email:`${randomUUID()}@example.invalid`,password:'Experience-QA-strong-2026',displayName:name})).data;}
  const author=await register('Autor'),reader=await register('Lector'),other=await register('Otra cuenta'),root=await register('Propietario');
  demoUsers.find(x=>x.id===root.user.id).id=process.env.SITE_OWNER_ID;const admin=(await req('/auth/login','','POST',{email:root.user.email,password:'Experience-QA-strong-2026'})).data;
  const a=author.accessToken,r=reader.accessToken,o=other.accessToken,m=admin.accessToken;
  const story=(await req('/stories',a,'POST',{title:'Saga QA',description:'Obra ficticia',category:'Fantasia',status:'published'})).data.story;
  const next=(await req('/stories',a,'POST',{title:'Libro siguiente',description:'Continuación',category:'Fantasia',status:'draft'})).data.story;
  const chapter=(await req(`/stories/${story.id}/chapters`,a,'POST',{title:'Original',chapterNumber:1,content:'Texto original',status:'published'})).data.chapter;
  await t.test('cuenta: otra cuenta no ve ni cancela solicitudes; duplicados y campos de poder rechazados',async()=>{
    assert.equal((await req('/experience/account')).status,401);
    assert.equal((await req('/experience/account/deletion-request',r,'POST',{confirmation:'ELIMINAR',note:'',user_id:author.user.id})).status,400);
    const request=await req('/experience/account/deletion-request',r,'POST',{confirmation:'ELIMINAR',note:'Prueba de privacidad'});assert.equal(request.status,201);
    assert.equal((await req('/experience/account',o)).data.requests.length,0);
    assert.equal((await req(`/experience/account/deletion-request/${request.data.request.id}`,o,'DELETE')).status,404);
    assert.equal((await req('/experience/account/deletion-request',r,'POST',{confirmation:'ELIMINAR',note:''})).status,409);
    assert.equal((await req('/experience/privacy/manage',a)).status,403);
    assert.equal((await req('/experience/account/deletion-request',m,'POST',{confirmation:'ELIMINAR',note:''})).status,403);
    assert.equal((await req(`/experience/account/deletion-request/${request.data.request.id}`,r,'DELETE')).status,204);
    assert.equal((await req('/experience/account',r)).data.requests[0].status,'cancelled');
  });
  await t.test('una revisión atrasada no reactiva una solicitud ya cancelada',async()=>{
    const {rows,putRow,updatePrivacyRequest}=await import('../src/models/experienceModel.js');
    const row=await putRow('account_privacy_requests',{user_id:reader.user.id,status:'pending',note:'QA',response:'',updated_at:new Date().toISOString()});
    const stale=(await rows('account_privacy_requests',{id:row.id}))[0];await updatePrivacyRequest(stale,{status:'cancelled',updated_at:new Date().toISOString()});
    await assert.rejects(updatePrivacyRequest(stale,{status:'reviewing'}),error=>error.status===409);
  });
  await t.test('versiones: solo autor, límite 50, conflicto no sobrescribe y restauración no publica',async()=>{
    await req(`/stories/${story.id}/chapters/${chapter.id}`,a,'PUT',{title:'Nuevo',chapterNumber:1,content:'Texto modificado',status:'published'});
    const path=`/experience/versions/${story.id}/${chapter.id}`;
    assert.equal((await req(path,r)).status,403);const versions=(await req(path,a)).data.versions;assert.equal(versions[0].content,'Texto original');
    const restore=`${path}/${versions[0].id}/restore`;
    assert.equal((await req(restore,a,'POST',{expectedContent:'viejo',expectedTitle:'Nuevo'})).status,409);
    assert.equal((await req(restore,r,'POST',{expectedContent:'Texto modificado',expectedTitle:'Nuevo'})).status,403);
    const restored=await req(restore,a,'POST',{expectedContent:'Texto modificado',expectedTitle:'Nuevo'});assert.equal(restored.status,200);assert.equal(restored.data.chapter.content,'Texto original');assert.equal(restored.data.chapter.status,'draft');
    assert.equal((await req(path,a)).data.total,2);
    for(let i=0;i<55;i++)await ChapterModel.update(story.id,chapter.id,{title:'Original',chapterNumber:1,content:'Versión '+i,status:'draft'});
    assert.equal((await req(path,a)).data.total,50);assert.equal((await req(path+'?page=2',a)).data.versions.length,5);
  });
  await t.test('sagas: autoría, orden único y borradores excluidos de continuación pública',async()=>{
    const path=`/experience/works/story/${story.id}`;
    assert.equal((await req(path,r,'PUT',{seriesName:'Saga',seriesPosition:1})).status,403);
    assert.equal((await req(path,a,'PUT',{seriesName:'Saga',seriesPosition:1,owner_id:other.user.id})).status,400);
    assert.equal((await req(path,a,'PUT',{seriesName:'Saga',seriesPosition:1})).status,200);
    assert.equal((await req(`/experience/works/story/${next.id}`,a,'PUT',{seriesName:'Saga',seriesPosition:1})).status,409);
    assert.equal((await req(`/experience/works/story/${next.id}`,a,'PUT',{seriesName:'Saga',seriesPosition:2})).status,200);
    assert.equal((await req(path)).data.saga.length,1);
    await req(`/stories/${next.id}`,a,'PATCH',{status:'published'});assert.equal((await req(path)).data.saga.length,2);
  });
  await t.test('selección editorial: permiso settings, expiración y retirada de obras privadas',async()=>{
    const body={workType:'story',workId:story.id,heading:'Talento nuevo',note:'Lectura QA',sortOrder:1,startsAt:new Date(Date.now()-1000).toISOString(),endsAt:new Date(Date.now()+86400000).toISOString()};
    assert.equal((await req('/experience/picks',a,'PUT',body)).status,403);
    assert.equal((await req('/experience/picks',m,'PUT',body)).status,200);assert.equal((await req('/experience/picks')).data.picks.length,1);
    await req(`/stories/${story.id}`,a,'PATCH',{status:'draft'});assert.equal((await req('/experience/picks')).data.picks.length,0);
    await req('/admin/roles/'+author.user.id,m,'PUT',{permissions:['settings']});assert.equal((await req('/experience/picks/manage',a)).status,200);assert.equal((await req('/experience/privacy/manage',a)).status,403);
  });
  await t.test('denuncias: respuesta pública separada, aislamiento y una única apelación',async()=>{
    const report=(await req('/reports',r,'POST',{targetType:'profile',targetId:author.user.id,reason:'Motivo ficticio de prueba'})).data;
    await req('/reports/'+report.id,m,'PATCH',{status:'resolved',resolution:'Nota interna confidencial',reporterMessage:'Explicación para el lector'});
    let mine=(await req('/reports/mine',r)).data.reports;assert.equal(mine.length,1);assert.equal(mine[0].reporter_message,'Explicación para el lector');assert.equal('resolution' in mine[0],false);assert.equal('reporter_id' in mine[0],false);
    assert.equal((await req('/reports/mine',o)).data.reports.length,0);assert.equal((await req(`/reports/${report.id}/appeal`,o,'POST',{reason:'Revisar la decisión por favor'})).status,404);
    assert.equal((await req(`/reports/${report.id}/appeal`,r,'POST',{reason:'Revisar la decisión por favor'})).status,200);
    await req('/reports/'+report.id,m,'PATCH',{status:'dismissed',reporterMessage:'Respuesta definitiva'});
    assert.equal((await req('/reports',m)).data.reports[0].resolution,'Nota interna confidencial');
    assert.equal((await req(`/reports/${report.id}/appeal`,r,'POST',{reason:'Segunda apelación ficticia'})).status,409);
  });
});

