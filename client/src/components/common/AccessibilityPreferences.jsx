import {useEffect,useState,useRef} from 'react';
import {ui} from '../../i18n/runtime';
import {listWorkspace,saveWorkspace} from '../../api/workspaceApi';
import styles from '../../styles/Experience.module.css';
export function applyAccessibility(value){document.documentElement.dataset.contrast=value.contrast?'high':'normal';document.documentElement.dataset.motion=value.motion?'reduced':'system';}
export function AccessibilityPreferences({auth}){
  const changed=useRef(false);
  const [value,setValue]=useState(()=>{try{return JSON.parse(localStorage.getItem('valoria-accessibility')||'{}');}catch{return {};}}),[message,setMessage]=useState('');
  useEffect(()=>{let active=true;if(auth.token)listWorkspace('preferences',auth.token).then(x=>{const saved=x.items.find(x=>x.key==='accessibility');if(active&&saved&&!changed.current){setValue(saved.data);applyAccessibility(saved.data);}}).catch(()=>{});return()=>{active=false;};},[auth.token]);
  function change(key,next){changed.current=true;const updated={...value,[key]:next};setValue(updated);applyAccessibility(updated);try{localStorage.setItem('valoria-accessibility',JSON.stringify(updated));}catch{}if(auth.token)saveWorkspace('preferences','accessibility',updated,auth.token).then(()=>setMessage('Preferencias guardadas')).catch(e=>setMessage(e.message));}
  return <section className={styles.card}><h2>{ui('Accesibilidad')}</h2><label className={styles.check}><input type="checkbox" checked={Boolean(value.contrast)} onChange={e=>change('contrast',e.target.checked)}/>{ui('Aumentar contraste')}</label><label className={styles.check}><input type="checkbox" checked={Boolean(value.motion)} onChange={e=>change('motion',e.target.checked)}/>{ui('Reducir animaciones')}</label><p role="status">{ui(message)}</p></section>;
}
