import {useState} from 'react';
import {ui} from '../../i18n/runtime.js';
import {getSupabaseBrowserClient} from '../../lib/supabaseClient';
import {changePassword,logoutAllUsersSessions} from '../../api/authApi';
import {validateNewPassword} from '../../utils/passwordRecovery.js';
import {AccountSecurity} from './AccountSecurity';
import {PasswordInput} from './PasswordInput';
import styles from '../../styles/ProductTools.module.css';
export function PasswordForm({auth,recovery=false,onComplete,providerClient}){
  const [current,setCurrent]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[nonce,setNonce]=useState('');
  const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[needsNonce,setNeedsNonce]=useState(false);
  const client=providerClient===undefined?getSupabaseBrowserClient():providerClient;
  const needsMfa=auth.user?.mfaEnrolled&&!auth.user?.mfaVerified;
  async function sendCode(){if(busy||!client)return;setBusy(true);setMessage('');try{const r=await client.auth.reauthenticate();if(r.error)throw r.error;setMessage('Revisa tu correo e introduce el código de confirmación.');}catch{setMessage('No se pudo solicitar el correo. Espera unos minutos y reintenta.');}finally{setBusy(false);}}
  async function submit(event){event.preventDefault();if(busy)return;setMessage('');try{validateNewPassword(password,confirm);}catch(e){setMessage(e.message);return;}
    if(needsMfa){setMessage('Confirma un código de autenticación antes de cambiar la contraseña.');return;}
    setBusy(true);
    try{
      let result;
      if(recovery){
        if(!client||!auth.recoveryRequired)throw new Error('Solicita un nuevo enlace de recuperación.');
        const updated=await client.auth.updateUser({password,...(nonce?{nonce}:{})});
        if(updated.error){if(updated.error.code==='reauthentication_needed')setNeedsNonce(true);throw new Error('No se pudo cambiar la contraseña. Comprueba los datos y reintenta.');}
        const session=(await client.auth.getSession()).data.session;
        let closed=true;try{await logoutAllUsersSessions(session?.access_token||auth.token);}catch{closed=false;}
        result={sessionsClosed:closed};
      }else result=await changePassword(auth.token,{currentPassword:current,newPassword:password,...(nonce?{nonce}:{})});
      setCurrent('');setPassword('');setConfirm('');setNonce('');
      await auth.clearAfterPasswordChange();
      onComplete?.(result.sessionsClosed?'Contraseña actualizada. Inicia sesión con la nueva contraseña.':'Contraseña actualizada. Inicia sesión de nuevo y revisa tus accesos abiertos.');
    }catch(e){setCurrent('');setNonce('');if(e.code==='REAUTHENTICATION_REQUIRED')setNeedsNonce(true);setMessage(e.message||'No se pudo cambiar la contraseña. Comprueba los datos y reintenta.');}
    finally{setBusy(false);}
  }
  return <section className={styles.panel}>
    <h2>{recovery?ui('Elige tu nueva contraseña'):ui('Cambiar contraseña')}</h2>
    <p>{ui('Usa una frase larga y única. Al cambiarla, cerraremos tus accesos abiertos.')}</p>
    {needsMfa&&<AccountSecurity auth={auth} required purpose="password" providerClient={client}/>}
    <form onSubmit={submit}>
      {!recovery&&<PasswordInput label="Contraseña actual" autoComplete="current-password" value={current} onChange={e=>setCurrent(e.target.value)} disabled={busy}/>}
      <PasswordInput label="Nueva contraseña" value={password} onChange={e=>setPassword(e.target.value)} minLength={15} disabled={busy}/>
      <PasswordInput label="Repite la nueva contraseña" value={confirm} onChange={e=>setConfirm(e.target.value)} minLength={15} disabled={busy}/>
      {needsNonce&&<><button type="button" onClick={sendCode} disabled={busy}>{ui('Enviar código de confirmación')}</button><label>{ui('Código de confirmación')}<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" value={nonce} onChange={e=>setNonce(e.target.value.replace(/\D/g,'').slice(0,6))} maxLength={6} required disabled={busy}/></label></>}
      <div className={styles.actions}><button type="submit" disabled={busy||needsMfa}>{busy?ui('Guardando…'):ui('Guardar nueva contraseña')}</button></div>
    </form>
    {!recovery&&<p><a href="#/forgot-password">{ui('Si usas Google o no recuerdas tu contraseña, recupera el acceso por correo.')}</a></p>}
    {message&&<p role="status">{ui(message)}</p>}
  </section>;
}
