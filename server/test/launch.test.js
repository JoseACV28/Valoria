import test from 'node:test';import assert from 'node:assert/strict';import {once} from 'node:events';import {randomUUID} from 'node:crypto';
process.env.SUPABASE_URL='';process.env.SUPABASE_ANON_KEY='';process.env.SUPABASE_SERVICE_ROLE_KEY='';process.env.SITE_OWNER_ID='40000000-0000-4000-8000-000000000001';
const {default:app}=await import('../src/app.js');const {demoUsers}=await import('../src/data/authStore.js');
test('lanzamiento: soporte privado, delegación explícita, documentos y enlaces públicos',async t=>{
 const server=app.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>new Promise(resolve=>server.close(resolve)));const base=`http://127.0.0.1:${server.address().port}`;
 async function request(path,token='',method='GET',body){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});const data=r.status===204?null:r.headers.get('content-type')?.includes('application/json')?await r.json():await r.text();return {status:r.status,data};}
 async function account(name){return (await request('/api/auth/register','','POST',{email:randomUUID()+'@example.invalid',password:'Testing-Launch-QA-2026!',displayName:name})).data;}
 const owner=await account('Propietario'),reader=await account('Lector'),delegate=await account('Delegado');demoUsers.find(x=>x.id===owner.user.id).id=process.env.SITE_OWNER_ID;
 const m=(await request('/api/auth/login','','POST',{email:owner.user.email,password:'Testing-Launch-QA-2026!'})).data.accessToken,r=reader.accessToken,d=delegate.accessToken;
 await t.test('soporte exige cuenta y nunca acepta identidades ni staff enviados por cliente',async()=>{
  assert.equal((await request('/api/launch/support')).status,401);assert.equal((await request('/api/launch/support',r,'POST',{category:'technical',subject:'Prueba soporte',content:'Mensaje ficticio',user_id:delegate.user.id})).status,400);
 });
 const created=await request('/api/launch/support',r,'POST',{category:'technical',subject:'Prueba soporte',content:'Mensaje ficticio del lector'});assert.equal(created.status,201);const id=created.data.ticket.id;
 await t.test('otra cuenta y delegado de perfiles no ven las conversaciones privadas',async()=>{
  assert.equal((await request('/api/launch/support/'+id,d)).status,404);assert.equal((await request('/api/launch/support/manage',d)).status,403);
  await request('/api/admin/roles/'+delegate.user.id,m,'PUT',{permissions:['users']});assert.equal((await request('/api/launch/support/'+id,d)).status,404);
  assert.equal((await request('/api/launch/support/'+id+'/messages',r,'POST',{content:'Respuesta propia',staff:true})).status,400);
 });
 await t.test('solo el permiso support habilita respuestas administrativas y revocar quita acceso',async()=>{
  await request('/api/admin/roles/'+delegate.user.id,m,'PUT',{permissions:['support']});assert.equal((await request('/api/launch/support/manage',d)).status,200);
  assert.equal((await request('/api/launch/support/'+id+'/messages',d,'POST',{content:'Respuesta del equipo'})).status,201);
  const detail=await request('/api/launch/support/'+id,r);assert.equal(detail.data.messages.at(-1).staff,true);
  assert.equal((await request('/api/launch/support/'+id,d,'PATCH',{status:'closed'})).status,200);assert.equal((await request('/api/launch/support/'+id+'/messages',r,'POST',{content:'No se debe enviar'})).status,409);
  await request('/api/admin/roles/'+delegate.user.id,m,'PUT',{permissions:[]});assert.equal((await request('/api/launch/support/'+id,d)).status,404);
 });
 await t.test('documentos públicos solo editables por propietario; alertas no revelan webhook',async()=>{
  assert.equal((await request('/api/launch/documents')).status,200);assert.equal((await request('/api/launch/documents',r,'PUT',{privacy:{title:'Privacidad',content:'Cambiar'}})).status,403);
  assert.equal((await request('/api/launch/documents',m,'PUT',{privacy:{title:'Privacidad',content:'Contenido de prueba'}})).status,200);
  assert.equal((await request('/api/launch/alerts',r)).status,403);const alerts=await request('/api/launch/alerts',m);assert.equal(alerts.status,200);assert.equal('url' in alerts.data,false);
 });
 await t.test('metadatos escapados para obras públicas; borradores no generan páginas públicas',async()=>{
  const story=(await request('/api/stories',r,'POST',{title:'Libro <script>alert(1)</script>',description:'Sinopsis " especial',category:'Fantasia',status:'published'})).data.story;
  const publicPage=await request('/story/'+story.id);assert.equal(publicPage.status,200);assert.match(publicPage.data,/og:title/);assert.ok(!publicPage.data.includes('<script>alert(1)</script>'));assert.match(publicPage.data,/rel="canonical"/);
  await request('/api/stories/'+story.id,r,'PATCH',{status:'draft'});assert.equal((await request('/story/'+story.id)).status,404);
 });
});
