import { ui } from "../../i18n/runtime.js";
import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '../../lib/supabaseClient';
import styles from '../../styles/ProductTools.module.css';

export function AccountSecurity({auth,required=false,sessionCheck,providerClient,purpose='administration'}) {
  const [factor,setFactor]=useState(null),[pending,setPending]=useState(null);
  const [code,setCode]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[ready,setReady]=useState(false);
  const client=providerClient===undefined?getSupabaseBrowserClient():providerClient;
  const verified=auth.user?.mfaVerified===true;
  useEffect(()=>{
    let active=true;setReady(false);setPending(null);setCode('');
    if(!client||!auth.token){setReady(true);return;}
    client.auth.mfa.listFactors().then(({data,error})=>{
      if(!active)return;if(error){setMessage('No se pudo consultar la protección de la cuenta.');return;}
      setFactor(data.totp.find(item=>item.status==='verified')||null);
    }).catch(()=>{if(active)setMessage('No se pudo consultar la protección de la cuenta.');}).finally(()=>{if(active)setReady(true);});
    return()=>{active=false;};
  },[auth.token,client]);
  async function begin(){
    if(busy||!client)return;setBusy(true);setMessage('');
    try{const {data,error}=await client.auth.mfa.enroll({factorType:'totp',friendlyName:'Valoria'});if(error||typeof data?.id!=='string'||typeof data?.totp?.qr_code!=='string'||typeof data?.totp?.secret!=='string')throw new Error('Invalid enrollment');setPending({id:data.id,qr:data.totp.qr_code,secret:data.totp.secret});}
    catch{setMessage('No se pudo iniciar la configuración. Comprueba la conexión y reintenta.');}finally{setBusy(false);}
  }
  async function confirm(event){
    event.preventDefault();if(busy||!client||!/^\d{6}$/.test(code)||!(pending?.id||factor?.id))return;
    setBusy(true);setMessage('');
    try{const {error}=await client.auth.mfa.challengeAndVerify({factorId:pending?.id||factor.id,code});if(error)throw error;setPending(null);setCode('');setMessage('Código confirmado. Actualizando la protección de tu acceso…');await auth.refreshCurrentUser();setMessage('Protección confirmada para este acceso.');}
    catch{setCode('');setMessage('No se pudo confirmar el código. Usa el código actual de tu aplicación y reintenta.');}finally{setBusy(false);}
  }
  async function cancel(){
    if(busy||!pending||!client)return;setBusy(true);setMessage('');
    try{const {error}=await client.auth.mfa.unenroll({factorId:pending.id});if(error)throw error;setPending(null);setCode('');}
    catch{setMessage('No se pudo cancelar la configuración. Reintenta con conexión.');}finally{setBusy(false);}
  }
  const migrationPending=sessionCheck==='pending-migration';
  return <section className={styles.panel} aria-label={ui("Seguridad de la cuenta")}><h2>{ui("Seguridad de tu acceso")}</h2>
    <p>{verified?ui("Tu acceso está verificado con autenticación de dos pasos."):required?(purpose==='password'?ui('Confirma el código de tu aplicación para cambiar la contraseña.'):ui("Confirma un código de tu aplicación de autenticación para usar las herramientas administrativas.")):ui("Protege la administración con un segundo paso de autenticación.")}</p>
    {migrationPending&&<p role="status">{ui("Falta activar la comprobación de sesiones en Supabase. Completa ese paso antes de configurar la autenticación.")}</p>}
    {!client&&<p>{ui("Esta función requiere una sesión real de Supabase.")}</p>}
    {client&&ready&&!verified&&!migrationPending&&<>
      {!factor&&!pending&&<><p>{ui("Usa una aplicación de autenticación. Conserva tu acceso a Google o al correo y a esa aplicación; la recuperación de un factor perdido requiere el procedimiento del propietario.")}</p><button type="button" disabled={busy} onClick={begin}>{ui("Configurar autenticación de dos pasos")}</button></>}
      {pending&&<><p>{ui("Escanea este QR con tu aplicación. El segundo paso se activa al confirmar el primer código.")}</p><img width="220" height="220" style={{maxWidth:'100%',background:'#fff',padding:12,borderRadius:'var(--radius-panel)'}} src={pending.qr.startsWith('data:')?pending.qr:`data:image/svg+xml;charset=utf-8,${encodeURIComponent(pending.qr)}`} alt={ui("QR privado para configurar tu aplicación de autenticación")}/><details><summary>{ui("Configurar manualmente")}</summary><p>{ui("Clave privada: ")}<code>{pending.secret}</code></p></details></>}
      {(factor||pending)&&<form onSubmit={confirm}><label>{ui("Código de tu aplicación")}<input value={code} onChange={event=>setCode(event.target.value.replace(/\D/g,'').slice(0,6))} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required placeholder={ui("000000")}/></label><div className={styles.actions}><button type="submit" disabled={busy||code.length!==6}>{busy?ui("Verificando…"):ui("Confirmar código")}</button>{pending&&<button type="button" disabled={busy} onClick={cancel}>{ui("Cancelar configuración")}</button>}</div></form>}
    </>}
    {!ready&&client&&<p role="status">{ui("Consultando la protección de tu cuenta…")}</p>}
    {message&&<p role="status">{ui(message)}</p>}
  </section>;
}
