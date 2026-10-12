import {useEffect,useState} from 'react';
import {ui} from '../../i18n/runtime';
import {workspaceRequest} from '../../api/workspaceApi';
import styles from '../../styles/Experience.module.css';
export function EditorialPicks({onNavigate}){
  const [items,setItems]=useState([]);
  useEffect(()=>{let active=true;workspaceRequest('experience/picks').then(x=>{if(active)setItems(x.picks);}).catch(()=>{});return()=>{active=false;};},[]);
  if(!items.length)return null;
  return <section className={styles.card}><h2>{ui('Selecciones editoriales')}</h2><div className={styles.grid}>{items.map(x=><article className={styles.inset} key={x.id}><img className={styles.cover} src={x.work.cover||x.work.cover_url||'/default-cover.svg'} alt="" loading="lazy"/><h3>{x.heading}</h3><strong>{x.work.title}</strong><p>{x.note}</p><button type="button" onClick={()=>onNavigate(x.work_type==='story'?'reading':'illustration-detail',x.work_type==='story'?{storyIdentifier:x.work.slug||x.work.id}:{illustrationIdentifier:x.work.slug||x.work.id})}>{ui('Ver obra')}</button></article>)}</div></section>;
}
