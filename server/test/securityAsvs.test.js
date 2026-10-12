import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { validateProductionConfig } from '../src/config/security.js';
process.env.SUPABASE_URL = ''; process.env.SUPABASE_ANON_KEY = ''; process.env.SUPABASE_SERVICE_ROLE_KEY = '';
const { default: app } = await import('../src/app.js');
const { demoSessions } = await import('../src/data/authStore.js');
const { NotificationModel } = await import('../src/models/notificationModel.js');

test('ASVS: producción rechaza fallback, orígenes inseguros y propietario inválido', () => {
  const config = { NODE_ENV:'production', SUPABASE_URL:'https://example.supabase.co', SUPABASE_ANON_KEY:'test-public', SUPABASE_SERVICE_ROLE_KEY:'test-private', CORS_ORIGINS:'https://valoria.example', SITE_OWNER_ID:randomUUID() };
  assert.doesNotThrow(() => validateProductionConfig(config));
  for (const key of ['SUPABASE_URL','SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','CORS_ORIGINS','SITE_OWNER_ID']) assert.throws(() => validateProductionConfig({...config,[key]:''}));
  for (const origin of ['*','http://valoria.example','https://localhost','https://valoria.example/path','https://valoria.example,']) assert.throws(() => validateProductionConfig({...config,CORS_ORIGINS:origin}));
  assert.throws(() => validateProductionConfig({...config,SUPABASE_URL:'http://example.supabase.co'}));
  assert.throws(() => validateProductionConfig({...config,SITE_OWNER_ID:'Blackat'}));
  assert.throws(() => validateProductionConfig({...config,SITE_BACKUP_ENABLED:'true',BACKUP_ENCRYPTION_KEY:''}));
  assert.doesNotThrow(() => validateProductionConfig({...config,SITE_BACKUP_ENABLED:'true',BACKUP_ENCRYPTION_KEY:'a'.repeat(64)}));
});

test('ASVS: API, autenticación y límites en un servidor aislado', async t => {
  const server=app.listen(0,'127.0.0.1'); await once(server,'listening');
  t.after(() => new Promise(resolve=>server.close(resolve)));
  const base=`http://127.0.0.1:${server.address().port}`;
  const req=(path,options={})=>fetch(base+'/api'+path,options);
  const credentials={email:`${randomUUID()}@example.invalid`,password:'Testing-QA-2026-strong!',displayName:'Security QA'};
  const json=body=>({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const registered=await req('/auth/register',json(credentials)); assert.equal(registered.status,201);
  const account=await registered.json(), auth={Authorization:`Bearer ${account.accessToken}`};
  await t.test('cabeceras, caché y MIME también protegen respuestas de error',async()=>{
    for(const path of ['/health','/auth/me','/unknown']){
      const result=await req(path);
      assert.equal(result.headers.get('cache-control'),'no-store');
      assert.equal(result.headers.get('x-content-type-options'),'nosniff');
      assert.equal(result.headers.get('referrer-policy'),'no-referrer');
      assert.match(result.headers.get('content-security-policy'),/frame-ancestors 'none'/);
      assert.equal(result.headers.get('x-powered-by'),null);
      assert.match(result.headers.get('content-type'),/application\/json/);
    }
    const result=await req('/unknown'); assert.equal(result.status,404); assert.doesNotMatch(JSON.stringify(await result.json()),/Express|stack|node_modules/);
  });
  await t.test('CORS exacto rechaza sufijos, puerto diferente y origen null',async()=>{
    const allowed=await req('/health',{headers:{Origin:'http://127.0.0.1:5174'}});assert.equal(allowed.status,200);
    assert.equal(allowed.headers.get('access-control-allow-origin'),'http://127.0.0.1:5174');
    for(const origin of ['https://attacker.example','http://127.0.0.1:5174.attacker.example','http://127.0.0.1:9999','null']){
      const response=await req('/auth/login',{...json(credentials),headers:{'Content-Type':'application/json',Origin:origin}});
      assert.equal(response.status,403);assert.equal(response.headers.get('access-control-allow-origin'),null);
    }
  });
  await t.test('tokens falsos, cookies y parámetros no autentican rutas privadas',async()=>{
    for(const path of ['/auth/me','/admin/users','/workspace/drafts','/recovery','/reports','/collaborations','/notifications']){
      assert.equal((await req(path,{headers:{Authorization:'Bearer fabricated.token.value'}})).status,401);
    }
    assert.equal((await req('/auth/me?access_token='+account.accessToken,{headers:{Cookie:'accessToken='+account.accessToken}})).status,401);
    assert.equal((await req('/auth/me',{headers:auth})).status,200);
  });
  await t.test('otra cuenta no puede leer ni marcar notificaciones ajenas',async()=>{
    const other=await (await req('/auth/register',json({...credentials,email:`${randomUUID()}@example.invalid`}))).json();
    const notification=await NotificationModel.create({recipientId:account.user.id,actorId:other.user.id,actorName:'QA',type:'follow',title:'Aviso privado QA',body:'Texto ficticio'});
    const otherHeaders={Authorization:`Bearer ${other.accessToken}`};
    const list=await (await req('/notifications',{headers:otherHeaders})).json();assert.equal(list.notifications.some(x=>x.id===notification.id),false);
    await req(`/notifications/${notification.id}/read`,{method:'POST',headers:otherHeaders});
    const own=await NotificationModel.getByRecipient(account.user.id);assert.equal(own.notifications.find(x=>x.id===notification.id).isRead,false);
  });
  await t.test('JSON malformado o demasiado grande no expone el cuerpo enviado',async()=>{
    const bad=await req('/auth/login',{...json({}),body:'{"password":"SECRET-DO-NOT-REFLECT",'});
    assert.equal(bad.status,400);assert.deepEqual(await bad.json(),{message:'JSON inválido.'});
    const large=await req('/workspace/drafts/oversize',{method:'PUT',headers:{...auth,'Content-Type':'application/json'},body:JSON.stringify({content:'a'.repeat(1100000)})});assert.equal(large.status,413);
  });
  await t.test('tipos y longitudes inválidas se rechazan antes de autenticar',async()=>{
    for(const body of [{email:{},password:'x'},{email:credentials.email,password:[]},{...credentials,password:'x'.repeat(129)}])assert.equal((await req('/auth/login',json(body))).status,400);
    assert.equal((await req('/auth/register',json({...credentials,password:'short'}))).status,400);
    const result=await req('/auth/login',json({...credentials,password:'wrong password'}));assert.equal(result.status,401);assert.deepEqual(await result.json(),{message:'Correo o contrasena invalidos'});
  });
  await t.test('sesión local caducada es denegada y eliminada',async()=>{
    demoSessions.get(account.accessToken).expires_at=Math.floor(Date.now()/1000)-1;
    assert.equal((await req('/auth/me',{headers:auth})).status,401); assert.equal(demoSessions.has(account.accessToken),false);
  });
  await t.test('logout local invalida el token y conserva las otras sesiones',async()=>{
    const first=await (await req('/auth/login',json(credentials))).json();
    const second=await (await req('/auth/login',json(credentials))).json();
    const headers={Authorization:`Bearer ${first.accessToken}`};
    assert.equal((await req('/auth/logout',{method:'POST',headers})).status,204);
    assert.equal((await req('/auth/me',{headers})).status,401);
    assert.equal((await req('/auth/me',{headers:{Authorization:`Bearer ${second.accessToken}`}})).status,200);
    assert.equal((await req('/auth/logout',{method:'POST'})).status,401);
  });
  await t.test('intentos de acceso quedan limitados; X-Forwarded-For no permite saltarlos',async()=>{
    let blocked=false;
    for(let index=0;index<22;index++){
      const response=await req('/auth/login',{...json({email:'not-an-email',password:'wrong'}),headers:{'Content-Type':'application/json','X-Forwarded-For':`192.0.2.${index+1}`}});
      if(response.status===429){assert.equal(response.headers.get('retry-after'),'900');blocked=true;break;}
    }
    assert.equal(blocked,true);assert.equal((await req('/health')).status,200);
  });
});
