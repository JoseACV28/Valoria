import { ui } from "../../i18n/runtime.js";
import { contentToHtml } from '../../utils/richContent';
import styles from '../../styles/ProductTools.module.css';
import { useEffect, useRef, useState } from 'react';
import { listWorkspace, saveWorkspace } from '../../api/workspaceApi';
export function WriterPlanning({storyId='new',auth,content=''}) {
  const key=`${auth.user?.id}:${storyId}`;
  const [notes,setNotes]=useState(()=>{try{return JSON.parse(localStorage.getItem(`valoria-notes:${key}`)||'{}');}catch{return {};}});
  const [message,setMessage]=useState('');
  const changed=useRef(false);
  useEffect(()=>{let active=true;listWorkspace('notes',auth.token).then(({items})=>{if(active && !changed.current && !notes._pending){const item=items.find(x=>x.key===storyId);if(item){setNotes(item.data);try{localStorage.setItem(`valoria-notes:${key}`,JSON.stringify(item.data));}catch{}};}}).catch(()=>{});return()=>{active=false;};},[storyId,auth.token]);
  function change(field,value){changed.current=true;const next={...notes,[field]:value,_pending:true};setNotes(next);try{localStorage.setItem(`valoria-notes:${key}`,JSON.stringify(next));}catch{setMessage('No se pudo guardar la copia local.');}}
  async function save(){try{const snapshot=notes;const saved={...snapshot,_pending:false};await saveWorkspace('notes',storyId,saved,auth.token);setNotes(current=>{if(current!==snapshot)return current;try{localStorage.setItem(`valoria-notes:${key}`,JSON.stringify(saved));}catch{}return saved;});setMessage('Planificación privada guardada.');}catch(error){setMessage(error.message);}}
  const plain=typeof DOMParser==='undefined'?content:new DOMParser().parseFromString(contentToHtml(content).replace(/<\/(p|div|h[2-4]|li|blockquote|pre)>/gi,'</$1> '),'text/html').body.textContent;
  const words=(plain||'').trim().split(/\s+/).filter(Boolean).length;
  const target=Number(notes.wordTarget)||0;
  return <details className={styles.panel}><summary>{ui("Planificación privada: personajes, escenas y cronología")}</summary><p>{ui("Estas notas son privadas y no se publican con tu historia.")}</p>{[['characters','Fichas de personajes'],['scenes','Notas de escenas'],['timeline','Cronología'],['goal','Meta de escritura']].map(([field,label])=><label key={field} style={{display:'block',margin:'12px 0'}}>{ui(label)}<textarea style={{display:"block",width:"100%",minHeight:110,padding:14,marginTop:6}} value={notes[field]||''} onChange={event=>change(field,event.target.value)} /></label>)}<label>{ui("Meta de palabras para este texto")}<input type="number" min="0" max="1000000" step="100" value={notes.wordTarget||''} placeholder={ui("Por ejemplo, 1500")} onChange={event=>change('wordTarget',Math.max(0,Math.min(1000000,Number(event.target.value)||0)))}/></label><p>{words}{ui(" palabras")}{target?ui(" de {0} · {1} % de la meta",[target,Math.round(words/target*100)]):''}</p>{target>0 && <progress aria-label={ui("Avance de la meta de palabras")} max={target} value={Math.min(words,target)} style={{width:'100%',accentColor:'var(--brand-400)'}}/>}<button type="button" onClick={save}>{ui("Guardar planificación")}</button><p role="status">{ui(message)}</p></details>;
}
