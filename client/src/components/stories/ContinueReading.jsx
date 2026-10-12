import { ui } from "../../i18n/runtime.js";
import { useEffect, useState } from 'react';
import { loadLibrary, readLibrary } from '../../utils/library';
import styles from '../../styles/ContinueReading.module.css';
import libraryStyles from '../../styles/LibraryHome.module.css';
export function ContinueReading({auth,onNavigate,variant,stories=[]}) {
  const [items,setItems]=useState(()=>readLibrary(auth.user?.id));
  useEffect(()=>{let active=true;loadLibrary(auth).then(data=>{if(active)setItems(data);}).catch(()=>{});return()=>{active=false;};},[auth.token]);
  const current=Object.values(items).filter(item=>item.status==='reading'&&item.type!=='illustration').sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0)).slice(0,4);
  if(!current.length)return null;
  if(variant==='library')return <section className={libraryStyles.resume}><h2>{ui('Continúa donde lo dejaste')}</h2><div className={libraryStyles.resumeGrid}>{current.slice(0,3).map(item=>{
    const story=stories.find(story=>story.id===item.id);
    const cover=item.cover||story?.cover;
    return <button type="button" className={libraryStyles.resumeCard} key={item.id} onClick={()=>onNavigate('reading',{storyIdentifier:item.slug||item.id})}>
      {cover?<img src={cover} alt="" />:<span className={libraryStyles.resumePlaceholder} aria-hidden="true">⌑</span>}
      <span><strong>{item.title}</strong><small>{item.chapterTitle||ui('Continuar leyendo')}</small><small className={libraryStyles.resumeAction}>{ui('Continuar leyendo')} →</small></span>
    </button>;
  })}</div></section>;
  return <ContinueReadingShelf items={current} onNavigate={onNavigate}/>;
}

export function ContinueReadingShelf({items,onNavigate}) {
  return <section className={styles.panel}>
    <h2>{ui("Continúa donde lo dejaste")}</h2>
    <div className={styles.grid}>{items.map(item=><button className={styles.card} key={item.id} type="button" onClick={()=>onNavigate('reading',{storyIdentifier:item.slug||item.id})}>
      <strong>{item.title}</strong>
      <small>{item.chapterTitle||ui("Continuar leyendo")}</small>
      <span className={styles.arrow} aria-hidden="true">→</span>
    </button>)}</div>
  </section>;
}
