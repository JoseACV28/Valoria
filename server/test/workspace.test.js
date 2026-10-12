import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
process.env.SUPABASE_URL='';process.env.SUPABASE_ANON_KEY='';process.env.SUPABASE_SERVICE_ROLE_KEY='';
const {default:app}=await import('../src/app.js');
const {mapProfile}=await import('../src/models/profileModel.js');
const {ChapterModel}=await import('../src/models/chapterModel.js');
const {imageFormat}=await import('../src/utils/imageValidation.js');
test('privacidad del perfil: visitante, otra cuenta y propietario',()=>{
  const profile={id:'owner',display_name:'Nombre público',email:'private@example.invalid',real_name:'Nombre privado'};
  for(const actor of [null,'visitor']){const mapped=mapProfile(profile,[],0,0,false,actor);assert.equal('email' in mapped,false);assert.equal(mapped.realName,'');}
  assert.equal(mapProfile(profile,[],0,0,false,'owner').email,profile.email);
  const fallback=mapProfile({...profile,display_name:profile.email},[],0,0,false,null);assert.equal(fallback.displayName,'Creador de Valoria');assert.equal(fallback.handle,'@valoria');
});
test('valida el contenido real de las imágenes',()=>{
  assert.equal(imageFormat(Buffer.from('<svg><script>bad()</script></svg>')),null);
  assert.equal(imageFormat(Buffer.from('not a real jpeg file')),null);
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
  assert.equal(imageFormat(png).mime,'image/png');
});
test('flujo editorial completo y espacio privado por cuenta',async t=>{
  const server=app.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>new Promise(resolve=>server.close(resolve)));
  const base=`http://127.0.0.1:${server.address().port}/api`;
  async function request(path,token='',method='GET',body){const response=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:response.status,data:response.status===204?null:await response.json()};}
  const owner=(await request('/auth/register','','POST',{email:`${randomUUID()}@example.invalid`,password:'Testing-QA-2026-strong!',displayName:'Writer QA'})).data;
  const visitor=(await request('/auth/register','','POST',{email:`${randomUUID()}@example.invalid`,password:'Testing-QA-2026-strong!',displayName:'Reader QA'})).data;
  const token=owner.accessToken,other=visitor.accessToken;
  await t.test('reintentos concurrentes dejan una sola historia y primer capítulo',async()=>{
    const payload={title:'QA transaccional',description:'Texto de prueba',category:'Romance',status:'draft',storyContent:'Primer capítulo',submissionId:randomUUID(),tags:['lluvia'],characters:['Luna'],language:'English',audience:'Adulto',rights:'Uso con atribucion',mature:true};
    const results=await Promise.all(Array.from({length:5},()=>request('/stories',token,'POST',payload)));
    assert.ok(results.every(x=>x.status===201));assert.equal(new Set(results.map(x=>x.data.story.id)).size,1);
    const story=results[0].data.story;assert.equal(story.language,'English');assert.equal(story.mature,true);
    assert.equal((await request(`/stories/${story.id}/chapters`,token)).data.chapters.length,1);
    assert.equal((await request(`/stories/${story.id}`,other)).status,404);
    assert.equal((await request(`/stories/${story.id}/stats`,other)).status,403);
  });
  await t.test('un fallo del capítulo revierte la historia incompleta',async()=>{
    const create=ChapterModel.create;ChapterModel.create=async()=>{throw new Error('Simulated chapter failure');};
    try{assert.equal((await request('/stories',token,'POST',{title:'Rollback QA',description:'Texto',category:'Romance',storyContent:'Capítulo',submissionId:randomUUID()})).status,500);assert.ok(!(await request('/stories/mine/list',token)).data.stories.some(x=>x.title==='Rollback QA'));}finally{ChapterModel.create=create;}
  });
  await t.test('borradores y biblioteca se recuperan y no se comparten con otra cuenta',async()=>{
    for(const namespace of ['drafts','library','notes']){
      assert.equal((await request(`/workspace/${namespace}/my-key`,token,'PUT',{text:'Contenido privado',status:'reading'})).status,200);
      assert.equal((await request(`/workspace/${namespace}`,token)).data.items[0].data.text,'Contenido privado');
      assert.equal((await request(`/workspace/${namespace}`,other)).data.items.length,0);
      assert.equal((await request(`/workspace/${namespace}`)).status,401);
    }
    assert.equal((await request('/workspace/unknown',token)).status,400);
  });
  await t.test('denuncias requieren sesión y no conceden moderación al denunciante',async()=>{
    const body={targetType:'profile',targetId:visitor.user.id,reason:'Motivo de prueba de moderación'};
    assert.equal((await request('/reports','','POST',body)).status,401);
    const report=await request('/reports',token,'POST',body);assert.equal(report.status,201);assert.ok(report.data.id);
    assert.equal((await request('/reports',token)).status,403);
    assert.equal((await request(`/reports/${report.data.id}`,token,'PATCH',{status:'resolved'})).status,403);
  });
  await t.test('búsqueda entrega páginas y aplica el filtro de idioma',async()=>{
    await request('/stories',token,'POST',{title:'QA search',description:'Texto',category:'Romance',status:'published',language:'English'});
    const result=await request('/search?q=QA%20search&language=English');assert.equal(result.status,200);assert.equal(result.data.counts.stories,1);assert.ok(result.data.groups.stories.length<=12);assert.ok(result.data.languages.includes('English'));
    const hindi=await request('/stories',token,'POST',{title:'QA idioma hindi',description:'Texto',category:'Romance',status:'published',language:'Hindi'});
    assert.equal(hindi.status,201);
    const filtered=await request('/search?q=QA%20idioma&language=Hindi');assert.equal(filtered.data.counts.stories,1);assert.equal(filtered.data.groups.stories[0].language,'Hindi');assert.ok(filtered.data.languages.includes('Hindi'));
    assert.equal((await request(`/stories/${hindi.data.story.id}`,token,'PATCH',{language:'Japones'})).status,200);
    const publicCategories=(await request('/search')).data.categories;
    await request('/stories',token,'POST',{title:'QA idioma privado',description:'Texto',category:'Romance',status:'draft',language:'Urdu'});
    const discovery=await request('/search?category=Romance&language=English');
    assert.ok(discovery.data.categories.Romance.stories>=2);
    assert.deepEqual(discovery.data.categories,publicCategories);
    assert.ok(discovery.data.groups.stories.every(work=>work.category==='Romance'&&work.language==='English'));
    const otherCategory=await request('/search?category=CategoriaSinObras');
    assert.equal(otherCategory.data.counts.stories,0);
    assert.equal(otherCategory.data.counts.writers,0);
    assert.deepEqual(otherCategory.data.categories,discovery.data.categories);
    const japanese=await request('/search?q=QA%20idioma&language=Japones');assert.equal(japanese.data.counts.stories,1);assert.ok(!japanese.data.languages.includes('Urdu'));assert.equal((await request('/search?q=QA%20idioma&language=Hindi')).data.counts.stories,0);
    assert.equal((await request('/search?q=QA%20search&language=Portugues')).data.counts.stories,0);
  });
});
