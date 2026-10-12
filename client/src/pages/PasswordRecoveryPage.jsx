import {useState} from 'react';
import {ui} from '../i18n/runtime.js';
import {AppShell} from '../components/layout/AppShell';
import {Navbar} from '../components/layout/Navbar';
import {PasswordForm} from '../components/common/PasswordForm';
import {requestRecovery} from '../utils/passwordRecovery.js';
import {getSupabaseBrowserClient} from '../lib/supabaseClient';
import styles from '../styles/PasswordRecovery.module.css';
export function PasswordRecoveryPage({auth,navFilters,onNavigate,reset=false}){
  const [email,setEmail]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[complete,setComplete]=useState(false);
  async function send(event){event.preventDefault();if(busy)return;setBusy(true);setMessage('');try{setMessage(await requestRecovery(getSupabaseBrowserClient(),email,window.location));}catch(e){setMessage(e.message);}finally{setBusy(false);}}
  return <AppShell auth={auth} currentView="password-recovery" onNavigate={onNavigate}><main className={styles.page}><Navbar auth={auth} currentView="password-recovery" {...navFilters} onNavigate={onNavigate}/>
    <section className={styles.card}><span className={styles.eyebrow}>{ui('Seguridad de la cuenta')}</span><h1>{reset?ui('Recupera tu acceso'):ui('¿Olvidaste tu contraseña?')}</h1>
      {reset&&auth.status==='loading'?<p role="status">{ui('Verificando tu enlace…')}</p>:reset&&auth.isAuthenticated&&auth.recoveryRequired&&!complete?<PasswordForm auth={auth} recovery onComplete={text=>{setMessage(text);setComplete(true);}}/>:reset&&!complete?<><p>{ui('El enlace no está disponible o ha vencido. Solicita uno nuevo desde el mismo navegador.')}</p><a href="#/forgot-password">{ui('Solicitar otro enlace')}</a></>:!complete?<><p>{ui('Escribe el correo de tu cuenta. Te enviaremos un enlace para elegir una nueva contraseña.')}</p><form onSubmit={send}><label>{ui('Correo')}<input type="email" autoComplete="email" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} required disabled={busy}/></label><button type="submit" disabled={busy}>{busy?ui('Enviando…'):ui('Enviar enlace de recuperación')}</button></form><p className={styles.hint}>{ui('Abre el enlace en este mismo navegador para completar la recuperación.')}</p></>:null}
      {message&&<p role="status" className={styles.message}>{ui(message)}</p>}<a href="#/login">{ui('Volver a iniciar sesión')}</a>
    </section>
  </main></AppShell>;
}
