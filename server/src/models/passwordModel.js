import {createClient} from '@supabase/supabase-js';
import {env} from '../config/env.js';
import {supabaseAdmin,isSupabaseAuthEnabled} from '../config/supabase.js';
import {demoUsers,demoSessions,comparePassword,buildPasswordHash} from '../data/authStore.js';
import {revokeSiteSession} from '../utils/sessionSecurity.js';
const error=(status,message,code)=>Object.assign(new Error(message),{status,code});
export function passwordProviderError(payload,status){
  const code=typeof payload?.code==='string'?payload.code:payload?.error_code;
  if(code==='reauthentication_needed')return error(409,'Confirma el código enviado a tu correo para cambiar la contraseña.','REAUTHENTICATION_REQUIRED');
  if(code==='reauthentication_not_valid')return error(400,'El código de confirmación no es válido. Solicita uno nuevo.','INVALID_REAUTH_CODE');
  if(status===429)return error(429,'Demasiados intentos. Espera y reintenta.');
  return error(400,'No se pudo cambiar la contraseña. Comprueba los datos y reintenta.');
}
export function validatePasswordChange(body){
  if(!body||Object.keys(body).some(key=>!['currentPassword','newPassword','nonce'].includes(key))||typeof body.currentPassword!=='string'||!body.currentPassword.length||body.currentPassword.length>128||typeof body.newPassword!=='string'||[...body.newPassword].length<15||body.newPassword.length>128||(body.nonce!==undefined&&(typeof body.nonce!=='string'||!/^\d{6}$/.test(body.nonce))))throw error(400,'Indica tu contraseña actual y una nueva de 15 a 128 caracteres.');
}
export async function closeAllAccountSessions(token,userId){
  if(!isSupabaseAuthEnabled()){for(const [key,value] of demoSessions)if(value.user.id===userId)demoSessions.delete(key);return;}
  await revokeSiteSession(token,userId);
  const result=await supabaseAdmin.auth.admin.signOut(token,'global');
  if(result.error)throw error(503,'No se pudo confirmar el cierre de todos los accesos.');
}
export async function changeAccountPassword(token,user,body){
  validatePasswordChange(body);
  if(user.mfaEnrolled&&!user.mfaVerified)throw error(403,'Confirma un código de autenticación antes de cambiar la contraseña.','MFA_REQUIRED');
  if(!isSupabaseAuthEnabled()){
    const account=demoUsers.find(x=>x.id===user.id);
    if(!account||!comparePassword(body.currentPassword,account.passwordHash))throw error(400,'La contraseña actual no es correcta.');
    account.passwordHash=buildPasswordHash(body.newPassword);await closeAllAccountSessions(token,user.id);return {passwordChanged:true,sessionsClosed:true};
  }
  const verifier=createClient(env.supabaseUrl,env.supabaseAnonKey,{auth:{persistSession:false,autoRefreshToken:false}});
  let verificationToken;
  try{
    const verified=await verifier.auth.signInWithPassword({email:user.email,password:body.currentPassword});
    if(verified.error||verified.data?.user?.id!==user.id)throw error(400,'La contraseña actual no es correcta.');
    verificationToken=verified.data.session.access_token;
    // Use the original verified user session, not the service key, for the
    // mutation. Provider MFA/reauthentication/password rules still apply.
    const response=await fetch(env.supabaseUrl+'/auth/v1/user',{method:'PUT',headers:{apikey:env.supabaseAnonKey,Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({password:body.newPassword,current_password:body.currentPassword,...(body.nonce?{nonce:body.nonce}:{})}),signal:AbortSignal.timeout(20000)});
    if(!response.ok)throw passwordProviderError(await response.json().catch(()=>({})),response.status);
    try{await closeAllAccountSessions(token,user.id);return {passwordChanged:true,sessionsClosed:true};}
    catch{console.error({event:'auth.password_session_close_failed'});return {passwordChanged:true,sessionsClosed:false};}
  }finally{
    // This short-lived proof session is never exposed or persisted in the API.
    if(verificationToken)await supabaseAdmin.auth.admin.signOut(verificationToken,'local').catch(()=>{});
  }
}
