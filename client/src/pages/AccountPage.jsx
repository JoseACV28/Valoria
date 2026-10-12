import {StorySubscriptions} from '../components/stories/StoryFollowing';
import {useEffect,useState} from 'react';
import {ui} from '../i18n/runtime';
import {AppShell} from '../components/layout/AppShell';
import {Navbar} from '../components/layout/Navbar';
import {AccountSecurity} from '../components/common/AccountSecurity';
import {PasswordForm} from '../components/common/PasswordForm';
import {NotificationPreferences} from '../components/common/NotificationPreferences';
import {MutedNotifications} from '../components/common/MutedNotifications';
import {BlockedAccounts} from '../components/common/BlockedAccounts';
import {AccessibilityPreferences} from '../components/common/AccessibilityPreferences';
import {workspaceRequest} from '../api/workspaceApi';
import styles from '../styles/Experience.module.css';
export function AccountPage({auth,navFilters,onNavigate,securityClient}){
  const [requests,setRequests]=useState([]),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[confirmation,setConfirmation]=useState(''),[note,setNote]=useState('');
  useEffect(()=>{let active=true;setRequests([]);if(auth.token)workspaceRequest('experience/account',auth.token).then(x=>{if(active)setRequests(x.requests);}).catch(e=>{if(active)setMessage(e.message);});return()=>{active=false;};},[auth.token]);
  async function action(fn){if(busy)return;setBusy(true);setMessage('');try{await fn();}catch(e){setMessage(e.message);}finally{setBusy(false);}}
  const labels={pending:'Pendiente',reviewing:'En revisión',cancelled:'Cancelada',completed:'Completada'};
  return <AppShell auth={auth} currentView="account" onNavigate={onNavigate}><main className={styles.page}><Navbar auth={auth} currentView="account" {...navFilters} onNavigate={onNavigate}/><header className={styles.hero}><h1>{ui('Cuenta y privacidad')}</h1><p>{ui('Controla tu acceso, tus datos y tus preferencias.')}</p></header><p role="status">{ui(message)}</p>{!auth.token?<button type="button" onClick={()=>onNavigate('login')}>{ui('Iniciar sesión')}</button>:<>
  <section className={styles.card}><h2>{ui('Seguridad de la cuenta')}</h2><AccountSecurity auth={auth} providerClient={securityClient}/><details><summary>{ui('Cambiar contraseña')}</summary><PasswordForm auth={auth} onComplete={setMessage}/></details><details><summary>{ui('Cerrar todas las sesiones')}</summary><p>{ui('También se cerrará la sesión de este navegador.')}</p><button type="button" disabled={busy} onClick={()=>action(async()=>{await workspaceRequest('experience/account/logout-all',auth.token,'POST',{});await auth.clearAfterPasswordChange();setMessage('Sesiones cerradas.');})}>{ui('Confirmar cierre de sesiones')}</button></details></section>
  <AccessibilityPreferences auth={auth}/><section className={styles.card}><h2>{ui('Preferencias')}</h2><NotificationPreferences auth={auth}/><StorySubscriptions auth={auth} onNavigate={onNavigate}/><MutedNotifications auth={auth}/><BlockedAccounts auth={auth}/></section>
  <section className={styles.card}><h2>{ui('Mis datos personales')}</h2><p>{ui('Descarga tus datos en JSON. Las imágenes se incluyen como enlaces.')}</p><button disabled={busy} type="button" onClick={()=>action(async()=>{const data=await workspaceRequest('experience/account/export',auth.token);const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='valoria-mis-datos.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setMessage('Descarga preparada.');})}>{ui('Descargar mis datos')}</button></section>
  <section className={styles.card}><h2>{ui('Solicitar eliminación de cuenta')}</h2><p>{ui('La solicitud será revisada por el propietario. No elimina tu cuenta ni tus obras de inmediato.')}</p>{requests.map(x=><article className={styles.inset} key={x.id}><strong>{ui(labels[x.status])}</strong><p>{new Date(x.created_at).toLocaleString()}</p><p>{x.response}</p>{['pending','reviewing'].includes(x.status)&&<button type="button" disabled={busy} onClick={()=>action(async()=>{await workspaceRequest(`experience/account/deletion-request/${x.id}`,auth.token,'DELETE');setRequests(current=>current.map(r=>r.id===x.id?{...r,status:'cancelled'}:r));})}>{ui('Cancelar solicitud')}</button>}</article>)}{!requests.some(x=>['pending','reviewing'].includes(x.status))&&<form onSubmit={e=>{e.preventDefault();action(async()=>{const x=await workspaceRequest('experience/account/deletion-request',auth.token,'POST',{confirmation,note});setRequests(current=>[x.request,...current]);setConfirmation('');setNote('');});}}><label>{ui('Motivo opcional')}<textarea maxLength={2000} value={note} onChange={e=>setNote(e.target.value)}/></label><label>{ui('Escribe ELIMINAR para confirmar')}<input required value={confirmation} onChange={e=>setConfirmation(e.target.value)} autoComplete="off"/></label><button type="submit" disabled={busy||confirmation!=='ELIMINAR'}>{ui('Enviar solicitud')}</button></form>}</section></>}</main></AppShell>;
}


