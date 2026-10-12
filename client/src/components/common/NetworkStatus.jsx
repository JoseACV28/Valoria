import { ui } from "../../i18n/runtime.js";
import { useEffect, useState } from 'react';
export function NetworkStatus(){
  const [online,setOnline]=useState(()=>typeof navigator==='undefined'||navigator.onLine!==false);
  useEffect(()=>{const update=()=>setOnline(navigator.onLine);window.addEventListener('online',update);window.addEventListener('offline',update);return()=>{window.removeEventListener('online',update);window.removeEventListener('offline',update);};},[]);
  return !online?<p role="status" style={{padding:'12px 16px',borderRadius:'var(--radius-panel)',background:'var(--brand-900)',color:'var(--text-main)'}}>{ui("Sin conexión. Puedes leer tus copias y conservar los borradores en este dispositivo.")}</p>:null;
}
