import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
process.env.SUPABASE_URL='';process.env.SUPABASE_ANON_KEY='';process.env.SUPABASE_SERVICE_ROLE_KEY='';
const {verifySiteSession,revokeSiteSession,requireAdminMfa}=await import('../src/utils/sessionSecurity.js');
const user=randomUUID(),sid=randomUUID();
const jwt=claims=>`test.${Buffer.from(JSON.stringify({sub:user,session_id:sid,exp:Math.floor(Date.now()/1000)+60,...claims})).toString('base64url')}.test`;
const client=result=>({rpc:async()=>result});

test('sesión revocada o expirada y UUID ajeno no pasan; MFA exige factor y aal2',async()=>{
  assert.equal((await verifySiteSession(jwt({}),user,client({data:{active:false}}))).active,false);
  const noCall={rpc:()=>{throw new Error('invalid claims must not query');}};
  for(const claims of [{exp:0},{sub:randomUUID()},{session_id:'invalid'}])assert.equal((await verifySiteSession(jwt(claims),user,noCall)).active,false);
  for(const [enrolled,aal,expected] of [[true,'aal2',true],[true,'aal1',false],[false,'aal2',false]]){
    const result=await verifySiteSession(jwt({aal}),user,client({data:{active:true,mfa_enrolled:enrolled}}));assert.equal(result.mfaVerified,expected);
  }
});
test('la migración faltante solo permite transición en desarrollo; otras caídas deniegan',async t=>{
  const before=process.env.SESSION_CHECK_REQUIRED;t.after(()=>{if(before===undefined)delete process.env.SESSION_CHECK_REQUIRED;else process.env.SESSION_CHECK_REQUIRED=before;});
  process.env.SESSION_CHECK_REQUIRED='false';
  assert.equal((await verifySiteSession(jwt({}),user,client({error:{code:'PGRST202'}}))).sessionCheck,'pending-migration');
  await assert.rejects(verifySiteSession(jwt({}),user,client({error:{code:'42501'}})),{status:503});
  process.env.SESSION_CHECK_REQUIRED='true';
  await assert.rejects(verifySiteSession(jwt({}),user,client({error:{code:'PGRST202'}})),{status:503});
  await assert.rejects(revokeSiteSession(jwt({}),user,client({error:{code:'PGRST202'}})),{status:503});
});
test('revocación usa la identidad verificada y permite bloquear solicitudes posteriores',async()=>{
  let revoked=false;
  const db={rpc:async(name,args)=>{
    assert.equal(args.p_user_id,user);assert.equal(args.p_session_id,sid);
    if(name==='revoke_site_session'){revoked=true;return {data:null};}
    return {data:{active:!revoked,mfa_enrolled:true}};
  }};
  assert.equal((await verifySiteSession(jwt({}),user,db)).active,true);
  await revokeSiteSession(jwt({}),user,db);
  assert.equal((await verifySiteSession(jwt({}),user,db)).active,false);
  await assert.rejects(revokeSiteSession(jwt({sub:randomUUID()}),user,db),{status:401});
});
test('el propietario y metadatos aal2 del navegador no saltan el guard MFA',async t=>{
  const before=process.env.ADMIN_MFA_REQUIRED;process.env.ADMIN_MFA_REQUIRED='true';t.after(()=>{if(before===undefined)delete process.env.ADMIN_MFA_REQUIRED;else process.env.ADMIN_MFA_REQUIRED=before;});
  for(const authUser of [{isOwner:true,mfaVerified:false},{user_metadata:{aal:'aal2'},mfaVerified:false},null]){
    let status,body,passed=false;const res={status(n){status=n;return this;},json(data){body=data;}};
    requireAdminMfa({authUser},res,()=>{passed=true;});assert.equal(passed,false);assert.equal(status,403);assert.equal(body.code,'MFA_REQUIRED');
  }
  let passed=false;requireAdminMfa({authUser:{mfaVerified:true}},{},()=>{passed=true;});assert.equal(passed,true);
});
test('MFA no puede desactivarse por una bandera de desarrollo en producción',async t=>{
  const before=process.env.NODE_ENV,flag=process.env.ADMIN_MFA_REQUIRED;
  t.after(()=>{if(before===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=before;if(flag===undefined)delete process.env.ADMIN_MFA_REQUIRED;else process.env.ADMIN_MFA_REQUIRED=flag;});
  process.env.NODE_ENV='production';process.env.ADMIN_MFA_REQUIRED='false';
  let status;requireAdminMfa({authUser:{isOwner:true,mfaVerified:false}},{status(n){status=n;return this;},json(){}},()=>assert.fail('must deny'));
  assert.equal(status,403);
});
