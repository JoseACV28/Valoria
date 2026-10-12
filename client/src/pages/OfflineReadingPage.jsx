import { ui } from "../i18n/runtime.js";
import { downloadOfflineDocument } from '../utils/offlineDocument';
import { offlineSupportState,subscribeOfflineSupport } from '../utils/offlineSupport';
import { useEffect, useState } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { Navbar } from '../components/layout/Navbar';
import { readOfflineWorks, removeOfflineWork } from '../utils/offlineReading';
import { contentToHtml } from '../utils/richContent';
import styles from '../styles/ProductTools.module.css';
export function OfflineReadingPage({auth,navFilters,onNavigate,identifier=''}){
  const [downloadMessage,setDownloadMessage]=useState('');
  function download(work){try{downloadOfflineDocument(work);setDownloadMessage('Archivo preparado. Guárdalo y ábrelo en tu navegador para leer sin conexión.');}catch{setDownloadMessage('No se pudo preparar el archivo. Reintenta.');}}
  const [support,setSupport]=useState(offlineSupportState);
  useEffect(()=>subscribeOfflineSupport(setSupport),[]);
  const [items,setItems]=useState(()=>readOfflineWorks(auth.user?.id)),[chapter,setChapter]=useState(0);
  const selected=items.find(x=>x.id===identifier);
  function remove(id){removeOfflineWork(auth.user?.id,id);setItems(readOfflineWorks(auth.user?.id));}
  return <AppShell auth={auth} currentView="offline" onNavigate={onNavigate}><main><Navbar auth={auth} {...navFilters} onNavigate={onNavigate}/><section className={styles.panel}><h1>{ui("Lectura sin conexión")}</h1><p>{ui("Copias de texto y formato guardadas en este navegador: hasta 10 obras. Las imágenes, las reseñas y las actualizaciones requieren conexión. Abre primero el sitio con conexión para preparar la lectura. Tus copias se guardan solo en este navegador. También puedes descargarlas como archivo HTML para abrirlas cuando quieras.")}</p><p role="status">{({ready:'Este navegador está preparado para abrir tus copias sin conexión.',preparing:'Preparando el acceso sin conexión… Mantén el sitio abierto hasta terminar.',preview:'Esta vista previa necesita permanecer abierta para acceder a tus copias.',unsupported:'Este navegador no permite preparar el acceso sin conexión. Tus copias locales se conservan.',failed:'No se pudo preparar el acceso sin conexión. Recarga con conexión para reintentar.'})[support]}</p>{downloadMessage&&<p role="status">{downloadMessage}</p>}{selected?<><button type="button" onClick={()=>onNavigate('offline')}>{ui("Ver mis copias")}</button><button type="button" onClick={()=>download(selected)}>{ui("Descargar archivo de lectura")}</button><h2>{selected.title}</h2><p>{selected.author}{ui(" · Copia del ")}{new Date(selected.savedAt).toLocaleDateString()}</p><label>{ui("Capítulo")}<select value={chapter} onChange={event=>setChapter(Number(event.target.value))}>{selected.chapters.map((c,index)=><option key={c.id} value={index}>{c.title}</option>)}</select></label><article className={styles.manuscript} dangerouslySetInnerHTML={{__html:contentToHtml(selected.chapters[chapter]?.content||'')}}/></>:<div className={styles.offlineList}>{items.map(item=><article key={item.id} className={styles.panel}><div><strong>{item.title}</strong><p>{item.chapters.length}{ui(" capítulos guardados")}</p></div><div className={styles.actions}><button type="button" onClick={()=>{setChapter(0);onNavigate('offline',{storyIdentifier:item.id});}}>{ui("Leer copia")}</button><button type="button" onClick={()=>download(item)}>{ui("Descargar archivo")}</button><button type="button" onClick={()=>remove(item.id)}>{ui("Quitar copia")}</button></div></article>)}{!items.length&&<p>{ui("Abre una historia y pulsa “Guardar para leer sin conexión” para conservar su texto aquí.")}</p>}</div>}</section></main></AppShell>;
}
