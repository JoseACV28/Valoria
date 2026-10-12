import { useEffect, useState } from 'react';
import { ui } from '../i18n/runtime';
import { STORY_LANGUAGES, languageLabel } from '../data/languages';
import { fetchStories } from '../api/storyApi';
import { AppShell } from '../components/layout/AppShell';
import { Navbar } from '../components/layout/Navbar';
import styles from '../styles/DirectoryPage.module.css';
export function LanguagesPage({auth,navFilters,onNavigate}){
 const [counts,setCounts]=useState(null),[error,setError]=useState('');
 useEffect(()=>{let active=true;setCounts(null);setError('');fetchStories(auth.token).then(data=>{if(!active)return;const totals={};for(const story of data.stories||[]){const key=story.language||'Espanol';totals[key]=(totals[key]||0)+1;}setCounts(totals);}).catch(()=>{if(active)setError('No se pudieron cargar las historias');});return()=>{active=false;};},[auth.token]);
 const languages=[...STORY_LANGUAGES,...Object.keys(counts||{}).filter(key=>!STORY_LANGUAGES.some(([value])=>value===key)).map(key=>[key,key])];
 return <AppShell auth={auth} currentView="languages" onNavigate={onNavigate}><main className={styles.page}><Navbar auth={auth} currentView="languages" {...navFilters} onNavigate={onNavigate}/><section className={styles.hero}><span>{ui('Idiomas de lectura')}</span><h1>{ui('Encuentra historias en tu idioma')}</h1><p>{ui('El idioma de cada obra lo elige su autor. Cambia el idioma de la interfaz desde la bandera de la barra superior.')}</p></section><section className={styles.section}>{error&&<p role="alert">{ui(error)}</p>}<div className={styles.languageGrid}>{languages.map(([value,label])=><article className={styles.languageCard} key={value}><strong lang={({'Espanol':'es','English':'en','Frances':'fr','Chino':'zh','Coreano':'ko','Japones':'ja'})[value]}>{languageLabel(value)}</strong><small>{counts?(counts[value]||0):error?'—':'…'} {ui('historias')}</small><button type="button" onClick={()=>{window.location.hash=`/search?type=stories&language=${encodeURIComponent(value)}`;}}>{ui('Explorar obras')}</button></article>)}</div></section></main></AppShell>;
}
