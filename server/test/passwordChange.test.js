import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';
process.env.SUPABASE_URL='';process.env.SUPABASE_ANON_KEY='';process.env.SUPABASE_SERVICE_ROLE_KEY='';
const {default:app}=await import('../src/app.js');
const {validatePasswordChange,changeAccountPassword,passwordProviderError}=await import('../src/models/passwordModel.js');
test('password: old and current provider error formats require reauthentication without exposing details',()=>{
  for(const payload of [{code:'reauthentication_needed'},{code:400,error_code:'reauthentication_needed'}])assert.equal(passwordProviderError(payload,400).code,'REAUTHENTICATION_REQUIRED');
  assert.equal(passwordProviderError({error_code:'reauthentication_not_valid'},400).code,'INVALID_REAUTH_CODE');
  assert.ok(!passwordProviderError({msg:'private credentials'},500).message.includes('private'));
});
test('password: payload cannot choose another account or inject roles, and Unicode length is checked',()=>{
  assert.throws(()=>validatePasswordChange({currentPassword:'old',newPassword:'Long-QA-password-123!',nonce:123456}));
  for(const body of [{},{currentPassword:'old',newPassword:'short'},{currentPassword:'old',newPassword:'😀'.repeat(8)},{currentPassword:'old',newPassword:'Long-QA-password-123!',userId:randomUUID()},{currentPassword:'old',newPassword:'Long-QA-password-123!',nonce:'123'}])assert.throws(()=>validatePasswordChange(body));
});
test('password: verified MFA cannot be replaced by current password',async()=>{
  await assert.rejects(changeAccountPassword('qa',{mfaEnrolled:true,mfaVerified:false},{currentPassword:'old',newPassword:'Long-QA-password-123!'}),e=>e.code==='MFA_REQUIRED');
});
test('password: wrong current leaves sessions intact, correct closes all and cannot change another account',async t=>{
  const server=app.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>new Promise(resolve=>server.close(resolve)));const base=`http://127.0.0.1:${server.address().port}/api`;
  async function req(route,token='',body){const r=await fetch(base+route,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:r.status===204?null:await r.json()};}
  const email=randomUUID()+'@example.invalid',old='Old-QA-password-123!',next='New-QA-password-456!';
  const one=(await req('/auth/register','',{email,password:old,displayName:'Password QA'})).data,two=(await req('/auth/login','',{email,password:old})).data;
  assert.equal((await req('/auth/change-password','',{currentPassword:old,newPassword:next})).status,401);
  assert.equal((await req('/auth/change-password',one.accessToken,{currentPassword:'incorrect',newPassword:next})).status,400);
  assert.equal((await req('/auth/me',two.accessToken)).status,200);
  assert.equal((await req('/auth/change-password',one.accessToken,{currentPassword:old,newPassword:next,userId:randomUUID()})).status,400);
  const changed=await req('/auth/change-password',one.accessToken,{currentPassword:old,newPassword:next});assert.equal(changed.status,200);assert.equal(changed.data.sessionsClosed,true);
  for(const session of [one,two])assert.equal((await req('/auth/me',session.accessToken)).status,401);
  assert.equal((await req('/auth/login','',{email,password:old})).status,401);assert.equal((await req('/auth/login','',{email,password:next})).status,200);
});
