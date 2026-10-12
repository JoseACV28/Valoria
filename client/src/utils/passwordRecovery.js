export const RECOVERY_MESSAGE='Si existe una cuenta con ese correo, recibirás un enlace para recuperar el acceso.';
export function recoveryRedirect(location){return `${location.origin}${location.pathname}?recovery=1#/reset-password`;}
export async function requestRecovery(client,email,location){
  if(!client)throw new Error('Esta función requiere una conexión con Supabase.');
  const result=await client.auth.resetPasswordForEmail(email.trim().toLowerCase(),{redirectTo:recoveryRedirect(location)});
  if(result.error)throw new Error('No se pudo solicitar el correo. Espera unos minutos y reintenta.');
  return RECOVERY_MESSAGE;
}
export function validateNewPassword(password,confirmation){
  if(typeof password!=='string'||[...password].length<15||password.length>128)throw new Error('Usa una contraseña de 15 a 128 caracteres.');
  if(password!==confirmation)throw new Error('Las contraseñas no coinciden.');
}
// This marker controls only presentation. Auth/API/provider still verify tokens.
export function recoverySessionKey(session){try{return `${session.user.id}:${JSON.parse(atob(session.access_token.split('.')[1].replaceAll('-','+').replaceAll('_','/'))).session_id}`;}catch{return '';}}
export function rememberRecovery(session,storage=window.sessionStorage,now=Date.now()){const key=recoverySessionKey(session);if(!key)return;try{storage.setItem('valoria-password-recovery',JSON.stringify({key,at:now}));}catch{}}
export function hasRecovery(session,storage=window.sessionStorage,now=Date.now()){try{const marker=JSON.parse(storage.getItem('valoria-password-recovery'));return Boolean(marker&&marker.key===recoverySessionKey(session)&&now-marker.at>=0&&now-marker.at<15*60000);}catch{return false;}}
export function clearRecovery(storage=window.sessionStorage){try{storage.removeItem('valoria-password-recovery');}catch{}}
export async function readCallbackSession(client,location,history){
  const url=new URL(location.href);if(!url.searchParams.has('code'))return null;
  // The configured SDK detects and exchanges PKCE while initializing. Calling
  // exchangeCodeForSession again would attempt to consume the same code twice.
  const result=await client.auth.getSession();
  for(const key of ['code','state','recovery'])url.searchParams.delete(key);
  history.replaceState({},'',`${url.pathname}${url.search}${url.hash}`);
  return result.error?null:result.data?.session||null;
}
