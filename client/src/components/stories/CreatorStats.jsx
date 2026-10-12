import { ui } from "../../i18n/runtime.js";
import { useEffect, useState } from 'react';
import { workspaceRequest } from '../../api/workspaceApi';
import styles from '../../styles/CreatorInsights.module.css';
export function CreatorStats({story,auth,initialStats=null}) {
 const [refresh,setRefresh]=useState(0),[stats,setStats]=useState(initialStats),[message,setMessage]=useState(''),[page,setPage]=useState(0);
 useEffect(()=>{if(initialStats)return;let active=true;setMessage('');workspaceRequest(`stories/${story.id}/stats`,auth.token).then(data=>{if(active)setStats(data);}).catch(error=>{if(active)setMessage(error.message);});return()=>{active=false;};},[story.id,auth.token,refresh,initialStats]);
 useEffect(()=>{setPage(0);setStats(initialStats);},[story.id,initialStats]);
 const days=[...(stats?.daily||[])].sort((a,b)=>b.day.localeCompare(a.day));
 const pages=Math.max(1,Math.ceil(days.length/5)),currentPage=Math.min(page,pages-1);
 return <details className={styles.panel}>
 <summary className={styles.summary}><span className={styles.icon} aria-hidden="true">↗</span><span className={styles.heading}><strong>{ui("Estadísticas de «{0}»",[story.title])}</strong><small>{ui("Lectores, capítulos y audiencia diaria")}</small></span></summary>
 <div className={styles.body}><div className={styles.toolbar}><h3>{ui("Tu obra en números")}</h3><button type="button" onClick={()=>setRefresh(value=>value+1)}>{ui("Actualizar estadísticas")}</button></div>
 {stats ? <><div className={styles.metrics}>{[[stats.visits,'Visitas'],[stats.readers,'Lectores con avance'],[stats.reviews,'Reseñas']].map(([value,label])=><div className={styles.metric} key={ui(label)}><strong>{value}</strong><span>{ui(label)}</span></div>)}</div>
 <p className={styles.note}>{ui("Las visitas pueden incluir recargas. Los lectores conservan la obra en su biblioteca; el último avance no demuestra abandono.")}</p>
 {(stats.chapters||[]).map(chapter=><article className={styles.chapter} key={chapter.id}><div className={styles.toolbar}><strong>{chapter.title}</strong><span>{chapter.readers}{ui(" lectores")}</span></div><div className={styles.track} role="progressbar" aria-label={ui("Continuidad de {0}",[chapter.title])} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.max(0,Math.min(100,chapter.retention||0))}><span style={{width:`${Math.max(0,Math.min(100,chapter.retention||0))}%`}}/></div><small className={styles.note}>{ui("Continuidad: ")}{chapter.retention}{ui("% respecto al primer capítulo · último avance de ")}{chapter.lastVisited||0}{ui(" cuentas")}</small></article>)}
 <div className={styles.toolbar}><h3>{ui("Audiencia diaria · últimos 30 días")}</h3><small className={styles.note}>{ui("5 días por página · más recientes primero")}</small></div>
 <p className={styles.note}>{ui("Fechas en UTC. El historial se registra desde la activación de las estadísticas.")}</p>
 <div className={styles.days}>{days.slice(currentPage*5,currentPage*5+5).map(day=><article className={styles.day} key={day.day}><time dateTime={day.day}>{day.day.slice(5).split('-').reverse().join('/')}</time><strong>{day.readers}</strong><small>{ui("Lectores activos")}</small><small>+{day.newReaders}{ui(" nuevos")}</small></article>)}</div>
 {!days.length && <p>{ui("Aún no hay registros de audiencia.")}</p>}
 <nav className={styles.pager} aria-label={ui("Historial de audiencia")}><button type="button" aria-label={ui("Días más recientes")} disabled={currentPage===0} onClick={()=>setPage(currentPage-1)}>←</button><span>{currentPage+1} / {pages}</span><button type="button" aria-label={ui("Días anteriores")} disabled={currentPage===pages-1} onClick={()=>setPage(currentPage+1)}>→</button></nav>
 </> : <p role="status">{message||ui("Cargando estadísticas…")}</p>}{stats&&message&&<p role="alert">{ui(message)}</p>}</div></details>;
}
