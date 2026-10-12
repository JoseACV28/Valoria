import { ui } from "../../i18n/runtime.js";
import { useEffect, useRef, useState } from 'react';
import { listWorkspace, saveWorkspace } from '../../api/workspaceApi';
import styles from '../../styles/ReadingSettings.module.css';
export function readReadingSettings(){try{return JSON.parse(localStorage.getItem('valoria-reading-settings')||'null')||{fontSize:18,lineHeight:1.9,width:760,theme:'sepia'};}catch{return {fontSize:18,lineHeight:1.9,width:760,theme:'sepia'};}}
export function ReadingSettings({auth,value,onChange}) {
  const [message,setMessage]=useState('');
  const changed=useRef(false);
  useEffect(()=>{let active=true;listWorkspace('preferences',auth.token).then(({items})=>{const item=items.find(x=>x.key==='reading');if(active && !changed.current && item)onChange({...readReadingSettings(),...item.data});}).catch(()=>{});return()=>{active=false;};},[auth.token]);
  function change(field,next){changed.current=true;const updated={...value,[field]:next};onChange(updated);try{localStorage.setItem('valoria-reading-settings',JSON.stringify(updated));}catch{setMessage('No se pudieron guardar las preferencias locales.');}if(auth.token)saveWorkspace('preferences','reading',updated,auth.token).then(()=>setMessage('Preferencias guardadas')).catch(()=>setMessage('Preferencias guardadas solo en este dispositivo'));}
  return <details className={styles.panel}>
    <summary>{ui("Ajustes de lectura ")}<span>{ui("Personaliza tu experiencia")}</span></summary>
    <div className={styles.fields}>
      <label>{ui("Tamaño de letra")}<select value={value.fontSize} onChange={event=>change('fontSize',Number(event.target.value))}>{[16,18,20,22,24].map(n=><option key={n} value={n}>{n}{ui(" px")}</option>)}</select></label>
      <label>{ui("Interlineado")}<select value={value.lineHeight} onChange={event=>change('lineHeight',Number(event.target.value))}>{[1.5,1.7,1.9,2.1].map(n=><option key={n} value={n}>{n}</option>)}</select></label>
      <label>{ui("Ancho de lectura")}<select value={value.width} onChange={event=>change('width',Number(event.target.value))}><option value={620}>{ui("Estrecho")}</option><option value={760}>{ui("Medio")}</option><option value={1100}>{ui("Amplio")}</option></select></label>
      <label>{ui("Tema")}<select value={value.theme} onChange={event=>change('theme',event.target.value)}><option value="sepia">{ui("Sepia")}</option><option value="light">{ui("Claro")}</option><option value="dark">{ui("Noche")}</option></select></label>
    </div>
    {message && <small className={styles.message} role="status">{ui(message)}</small>}
  </details>;
}
