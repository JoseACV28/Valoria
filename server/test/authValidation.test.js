import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
process.env.SUPABASE_URL='https://example.invalid';
process.env.SUPABASE_ANON_KEY='test-only-public';
process.env.SUPABASE_SERVICE_ROLE_KEY='test-only-private';
const {supabaseAdmin,supabasePublic}=await import('../src/config/supabase.js');
const {AuthModel}=await import('../src/models/authModel.js');
const id=randomUUID(),sid=randomUUID();
const token=claims=>`test.${Buffer.from(JSON.stringify({sub:id,session_id:sid,exp:Math.floor(Date.now()/1000)+60,aal:'aal2',...claims})).toString('base64url')}.test`;
test('claims aal2 y session_id no sirven si Auth no valida el token firmado',async t=>{
  const getUser=supabasePublic.auth.getUser,rpc=supabaseAdmin.rpc;
  t.after(()=>{supabasePublic.auth.getUser=getUser;supabaseAdmin.rpc=rpc;});
  supabasePublic.auth.getUser=async()=>({data:{user:null},error:{message:'invalid signature'}});
  supabaseAdmin.rpc=()=>{throw new Error('No SQL query before token verification');};
  assert.equal(await AuthModel.getUserFromToken(token({})),null);
});
test('la sesión activa se comprueba antes de sincronizar perfiles; los fallos nunca habilitan acceso',async t=>{
  const getUser=supabasePublic.auth.getUser,rpc=supabaseAdmin.rpc,from=supabaseAdmin.from;
  t.after(()=>{supabasePublic.auth.getUser=getUser;supabaseAdmin.rpc=rpc;supabaseAdmin.from=from;});
  supabasePublic.auth.getUser=async()=>({data:{user:{id,email:'qa@example.invalid'}},error:null});
  supabaseAdmin.from=()=>{throw new Error('Private profile must not be accessed');};
  supabaseAdmin.rpc=async()=>({data:{active:false}});
  assert.equal(await AuthModel.getUserFromToken(token({})),null);
  supabaseAdmin.rpc=async()=>({error:{code:'42501'}});
  await assert.rejects(AuthModel.getUserFromToken(token({})),{status:503});
  assert.equal(await AuthModel.getUserFromToken(token({sub:randomUUID()})),null);
});
