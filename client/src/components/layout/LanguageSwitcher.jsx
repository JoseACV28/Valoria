import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { getLocale, subscribeLocale, setLocale, INTERFACE_LANGUAGES, ui } from '../../i18n/runtime';
import styles from '../../styles/LanguageSwitcher.module.css';
import { LanguageFlag } from './LanguageFlag';
import { usePopoverSpace } from '../../hooks/usePopoverSpace';
export function LanguageSwitcher({onOpen}){
 const locale=useSyncExternalStore(subscribeLocale,getLocale,()=> 'es');
 const [open,setOpen]=useState(false);const [busy,setBusy]=useState(false),[error,setError]=useState(false);const ref=useRef(null);
 const [menuRef,menuHeight]=usePopoverSpace(open);
 useEffect(()=>{if(!open)return;function outside(e){if(!ref.current?.contains(e.target))setOpen(false);}function escape(e){if(e.key==='Escape'){setOpen(false);ref.current?.querySelector('button')?.focus();}}document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);};},[open]);
 return <div className={styles.wrap} ref={ref}><button className={styles.trigger} type="button" aria-label={ui('Idioma de la interfaz')} aria-expanded={open} onClick={e=>{e.stopPropagation();if(!open)onOpen?.();setOpen(!open);}}><LanguageFlag code={locale}/><span>{locale.toUpperCase()}</span></button>{open&&<div ref={menuRef} style={{maxHeight:menuHeight}} className={styles.menu} onClick={e=>e.stopPropagation()}><strong>{ui('Idioma de la interfaz')}</strong>{INTERFACE_LANGUAGES.map(([id,flag,label])=><button key={id} type="button" lang={id} aria-pressed={id===locale} disabled={busy} onClick={async()=>{setBusy(true);setError(false);try{await setLocale(id);setOpen(false);}catch{setError(true);}finally{setBusy(false);}}}><LanguageFlag code={id}/>{label}{id===locale&&<span aria-hidden="true">✓</span>}</button>)}{error&&<p role="alert">{ui('No se pudo cargar el idioma. Inténtalo de nuevo.')}</p>}</div>}</div>;
}
