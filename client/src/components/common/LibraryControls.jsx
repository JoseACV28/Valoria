import { ui } from "../../i18n/runtime.js";
import { useEffect, useState } from 'react';
import { loadLibrary, readLibrary, saveLibraryItem } from '../../utils/library';
import styles from '../../styles/LibraryControls.module.css';
export function LibraryControls({auth,work,type='story',onNavigate}) {
  const key=type==='story'?work.id:`illustration:${work.id}`;
  const [item,setItem]=useState(()=>readLibrary(auth.user?.id)[key]);
  const [message,setMessage]=useState('');
  useEffect(()=>{const update=()=>setItem(readLibrary(auth.user?.id)[key]);window.addEventListener('valoria-library-updated',update);loadLibrary(auth).catch(()=>{});return()=>window.removeEventListener('valoria-library-updated',update);},[key,auth.token]);
  async function save(status){if(!auth.isAuthenticated){onNavigate('login');return;}try{await saveLibraryItem(auth,key,{type,id:work.id,title:work.title,slug:work.slug,cover:work.cover||work.coverUrl||'',author:work.author,authorId:work.authorId,category:work.category,status});setMessage('Guardado en tu biblioteca.');}catch(error){setMessage(`${error.message} La copia local se conserva.`);}}
  return <div className={styles.panel}>
    <label className={styles.field}>
      <span className={styles.label}>
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 4h12v17l-6-4-6 4V4Z" strokeLinejoin="round"/></svg>
        {ui("Mi biblioteca")}
      </span>
      <select aria-label={ui("Estado en mi biblioteca")} value={item?.status||''} onChange={event=>save(event.target.value)}>
        <option value="" disabled>{ui("Guardar ")}{type==='story'?ui("historia"):ui("ilustración")}</option>
        <option value="want">{ui("Quiero leer / ver")}</option>
        <option value="reading">{ui("Leyendo / viendo")}</option>
        <option value="completed">{ui("Terminada")}</option>
      </select>
    </label>
    {message && <small className={styles.message} role="status">{ui(message)}</small>}
  </div>;
}
