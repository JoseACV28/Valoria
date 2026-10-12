import { supabaseAdmin } from '../config/supabase.js';

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const sessionChecksRequired=()=>process.env.NODE_ENV==='production'||process.env.SESSION_CHECK_REQUIRED==='true';
export const adminMfaRequired=(user)=>process.env.NODE_ENV==='production'||process.env.ADMIN_MFA_REQUIRED==='true'||user?.mfaEnrolled===true;
function claimsFromVerifiedToken(token) {
  // Call only AFTER Auth.getUser has validated this exact token, not as a verifier.
  try { return JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString('utf8')); }
  catch { return {}; }
}
export async function verifySiteSession(token,userId,client=supabaseAdmin) {
  const claims=claimsFromVerifiedToken(token);
  if(!uuid.test(claims.session_id||'') || claims.sub!==userId || !Number.isFinite(claims.exp) || claims.exp<=Date.now()/1000) return {active:false};
  const {data,error}=await client.rpc('verify_site_session',{
    p_session_id:claims.session_id,p_user_id:userId,
    p_max_age_seconds:7*24*60*60,p_idle_seconds:24*60*60
  });
  if(error){
    if(['PGRST202','42883'].includes(error.code)&&!sessionChecksRequired())return {active:true,sessionId:claims.session_id,mfaVerified:false,sessionCheck:'pending-migration'};
    throw Object.assign(new Error('No se pudo verificar la sesión. Reintenta más tarde.'),{status:503});
  }
  return {active:data?.active===true,sessionId:claims.session_id,mfaEnrolled:data?.mfa_enrolled===true,mfaVerified:data?.mfa_enrolled===true&&claims.aal==='aal2',sessionCheck:'verified'};
}
export async function revokeSiteSession(token,userId,client=supabaseAdmin) {
  const claims=claimsFromVerifiedToken(token);
  if(!uuid.test(claims.session_id||'') || claims.sub!==userId)throw Object.assign(new Error('Sesión inválida.'),{status:401});
  const {error}=await client.rpc('revoke_site_session',{p_session_id:claims.session_id,p_user_id:userId});
  if(error && !(['PGRST202','42883'].includes(error.code)&&!sessionChecksRequired()))throw Object.assign(new Error('No se pudo revocar la sesión.'),{status:503});
}
export function requireAdminMfa(req,res,next) {
  if(adminMfaRequired(req.authUser) && req.authUser?.mfaVerified!==true)return res.status(403).json({code:'MFA_REQUIRED',message:'Verifica tu acceso con un código de autenticación para administrar el sitio.'});
  next();
}
