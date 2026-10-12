import { ui } from "../../i18n/runtime.js";
import { useDialogFocus } from "../../hooks/useDialogFocus";
import { useState } from 'react';
import { submitReport } from '../../api/workspaceApi';
export function ReportDialog({target,auth,onClose,onSent}) {
  const dialogRef=useDialogFocus(true,onClose);
  const [reason,setReason]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  async function send(event){event.preventDefault();if(busy)return;setBusy(true);try{const result=await submitReport({...target,reason},auth.token);onSent(result.message);onClose();}catch(error){setMessage(error.message);}finally{setBusy(false);}}
  return <div style={{position:'fixed',inset:0,background:'#100b18cc',zIndex:2000,display:'grid',placeItems:'center',padding:16}} onKeyDown={event=>{if(event.key==='Escape')onClose();}}><section ref={dialogRef} role="dialog" aria-modal="true" aria-label={ui("Denunciar contenido")} style={{background:'var(--panel-dark)',borderRadius:'var(--radius-panel)',padding:24,width:'min(100%,480px)'}}><h2>{ui("Denunciar contenido")}</h2>{auth.isAuthenticated?<form onSubmit={send}><label style={{display:"block",marginBottom:16}}>{ui("Motivo")}<textarea style={{display:"block",width:"100%",minHeight:140,padding:14,marginTop:8}} autoFocus required minLength={5} maxLength={2000} value={reason} onChange={event=>setReason(event.target.value)} /></label><button disabled={busy} type="submit">{busy?ui("Enviando…"):ui("Enviar denuncia")}</button></form>:<p>{ui("Inicia sesión para enviar una denuncia.")}</p>}<button type="button" onClick={onClose}>{ui("Cancelar")}</button><p role="alert">{ui(message)}</p></section></div>;
}
