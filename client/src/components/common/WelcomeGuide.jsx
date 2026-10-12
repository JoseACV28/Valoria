import { ui } from "../../i18n/runtime.js";
import { useState } from 'react';
import styles from '../../styles/ProductTools.module.css';
export function WelcomeGuide({auth,onNavigate}){
  const key=`valoria-welcome:${auth.user?.id||'guest'}`;
  const [dismissed,setDismissed]=useState(()=>{try{return localStorage.getItem(key)==='done';}catch{return false;}});
  if(dismissed)return null;
  return <aside className={styles.panel} aria-label={ui("Primeros pasos")}><h3>{ui("Tu próxima historia empieza aquí")}</h3><p>{ui("Descubre obras, guarda tus lecturas y abre tu espacio para escribir o ilustrar.")}</p><div className={styles.actions}><button type="button" onClick={()=>onNavigate('search',{query:'',scope:'all'})}>{ui("Explorar obras")}</button><button type="button" onClick={()=>onNavigate(auth.user?'library':'login')}>{ui("Mi biblioteca")}</button><button type="button" onClick={()=>onNavigate(auth.user?'creator':'login')}>{ui("Crear una obra")}</button><button type="button" onClick={()=>{setDismissed(true);try{localStorage.setItem(key,'done');}catch{}}}>{ui("Entendido")}</button></div></aside>;
}
