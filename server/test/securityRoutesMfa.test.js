import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';
process.env.SUPABASE_URL='';process.env.SUPABASE_ANON_KEY='';process.env.SUPABASE_SERVICE_ROLE_KEY='';
process.env.ADMIN_MFA_REQUIRED='true';process.env.SITE_OWNER_ID=randomUUID();
const {default:app}=await import('../src/app.js');
const {AuthModel}=await import('../src/models/authModel.js');
const {demoUsers}=await import('../src/data/authStore.js');
test('las rutas administrativas y de moderación exigen MFA, que no concede permisos por sí sola',async t=>{
  const email=`${randomUUID()}@example.invalid`,password='Testing-QA-2026-strong!';
  await AuthModel.register({email,password,displayName:'Owner QA'});
  demoUsers.find(x=>x.email===email).id=process.env.SITE_OWNER_ID;
  const owner=await AuthModel.login({email,password});
  const other=await AuthModel.register({email:`${randomUUID()}@example.invalid`,password,displayName:'Reader QA'});
  const server=app.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>new Promise(resolve=>server.close(resolve)));
  const base=`http://127.0.0.1:${server.address().port}/api`;
  const request=(path,token=owner.accessToken,method='GET',body)=>fetch(base+path,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  const access=await (await request('/admin/access')).json();assert.equal(access.isOwner,true);assert.equal(access.mfaRequired,true);assert.equal(access.mfaVerified,false);
  for(const path of ['/admin/users','/admin/settings','/admin/roles','/admin/audit','/admin/system','/reports']){
    const res=await request(path);assert.equal(res.status,403);assert.equal((await res.json()).code,'MFA_REQUIRED');
  }
  assert.equal((await request(`/admin/roles/${other.user.id}`,owner.accessToken,'PUT',{permissions:['users'],mfaVerified:true,aal:'aal2'})).status,403);
  const original=AuthModel.getUserFromToken;t.after(()=>{AuthModel.getUserFromToken=original;});
  AuthModel.getUserFromToken=async token=>{const user=await original.call(AuthModel,token);return user&&{...user,mfaVerified:true,mfaEnrolled:true};};
  assert.equal((await request('/admin/users')).status,200);
  assert.equal((await request('/reports')).status,200);
  assert.equal((await request('/admin/users',other.accessToken)).status,403);
  assert.equal((await request('/admin/roles',other.accessToken)).status,403);
});
