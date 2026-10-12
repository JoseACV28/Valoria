import {useEffect,useState} from 'react';
import {ui} from '../i18n/runtime';
import {AppShell} from '../components/layout/AppShell';
import {Navbar} from '../components/layout/Navbar';
import {ActivityState} from '../components/common/ActivityState';
import {CreativeChallenge} from '../components/common/CreativeChallenge';
import {creativeChallenge,challengeEntries} from '../utils/creativeChallenge';
import {fetchStories} from '../api/storyApi';
import {fetchIllustrations} from '../api/illustrationApi';
import styles from '../styles/Experience.module.css';
export function ChallengesPage({auth,navFilters,onNavigate}){
 const challenge=creativeChallenge();const [items,setItems]=useState([]),[status,setStatus]=useState('loading'),[retry,setRetry]=useState(0);
 useEffect(()=>{let active=true;setStatus('loading');Promise.all([fetchStories(),fetchIllustrations()]).then(([stories,illustrations])=>{if(!active)return;setItems([...challengeEntries(stories.stories||[],challenge.tag).map(x=>({...x,kind:'story'})),...challengeEntries(illustrations.illustrations||[],challenge.tag).map(x=>({...x,kind:'illustration'}))]);setStatus('ready');}).catch(()=>{if(active)setStatus('error');});return()=>{active=false;};},[challenge.tag,retry]);
 return <AppShell auth={auth} currentView="challenges" onNavigate={onNavigate}><main className={styles.page}><Navbar auth={auth} {...navFilters} onNavigate={onNavigate}/><h1>{ui('Desafíos creativos')}</h1><CreativeChallenge showLink={false} onNavigate={onNavigate}/><section className={styles.card}><h2>{ui('Cómo participar')}</h2><ol><li>{ui('Crea una obra inspirada en la propuesta.')}</li><li>{ui('Añade esta etiqueta a tu historia o ilustración:')} <strong>{challenge.tag}</strong></li><li>{ui('Publica la obra cuando estés listo. Solo aparecen participaciones públicas.')}</li></ol><p>{ui('Conservas la autoría de tu obra. Participar es opcional y puedes retirar la etiqueta cuando quieras.')}</p><button type="button" onClick={()=>onNavigate(auth.isAuthenticated?'creator':'login')}>{ui('Crear mi participación')}</button></section><section><h2>{ui('Participaciones del mes')}</h2>{status==='loading'?<ActivityState kind="loading"/>:status==='error'?<ActivityState kind="error" action="Reintentar" onAction={()=>setRetry(x=>x+1)}/>:!items.length?<ActivityState title="La primera participación puede ser la tuya" message="Comparte tu interpretación del desafío con la comunidad."/>:<div className={styles.grid}>{items.map(item=><article className={styles.card} key={`${item.kind}:${item.id}`}><img className={styles.cover} loading="lazy" src={item.cover||item.coverUrl||'/default-cover.svg'} alt=""/><h3>{item.title}</h3><p>{item.author}</p><button type="button" onClick={()=>onNavigate(item.kind==='story'?'reading':'illustration-detail',item.kind==='story'?{storyIdentifier:item.slug||item.id}:{illustrationIdentifier:item.slug||item.id})}>{ui('Ver obra')}</button></article>)}</div>}</section></main></AppShell>;
}
