import {useEffect,useState} from 'react';
import {ui} from '../../i18n/runtime';
import {CONTENT_WARNINGS} from '../../data/contentWarnings';
import {workspaceRequest} from '../../api/workspaceApi';
import {ActivityState} from './ActivityState';
import styles from '../../styles/Experience.module.css';
export function ContentWarningsEditor({value=[],onChange,disabled=false}){return <fieldset className={styles.inset} disabled={disabled}><legend>{ui('Avisos de contenido')}</legend><p>{ui('Ayuda a los lectores a elegir. Marca los temas presentes en la obra.')}</p>{CONTENT_WARNINGS.map(([key,label])=><label className={styles.check} key={key}><input type="checkbox" checked={value.includes(key)} onChange={e=>onChange(e.target.checked?[...value,key]:value.filter(x=>x!==key))}/>{ui(label)}</label>)}</fieldset>;}
export function ContentGate({work,type,auth,onNavigate,onAccessChange,children}){
 const [warnings,setWarnings]=useState([]),[status,setStatus]=useState('loading'),[accepted,setAccepted]=useState(false),[retry,setRetry]=useState(0);
 useEffect(()=>{let active=true;setStatus('loading');setAccepted(false);workspaceRequest(`experience/works/${type}/${work.id}`,auth.token).then(({detail})=>{if(!active)return;const codes=detail.data?.contentWarnings||[];setWarnings(CONTENT_WARNINGS.filter(([key])=>codes.includes(key)).map(([,label])=>label));setStatus('ready');}).catch(()=>{if(active)setStatus('error');});return()=>{active=false;};},[work.id,type,auth.token,retry,work.mature]);
 const labels=[...warnings,...(work.mature?['Contenido para adultos']:[])];
 useEffect(()=>{onAccessChange?.(status==='ready'&&(accepted||!labels.length));},[status,accepted,labels.length,onAccessChange]);
 if(status==='loading')return <ActivityState kind="loading" title="Comprobando avisos de contenido…"/>;
 if(status==='error')return <ActivityState kind="error" message="No se pudieron consultar los avisos de esta obra." action="Reintentar" onAction={()=>setRetry(x=>x+1)}/>;
 if(labels.length&&!accepted)return <section className={styles.card} aria-label={ui('Avisos de contenido')}><h2>{work.title}</h2><h3>{ui('Antes de continuar')}</h3><p>{ui('El autor ha indicado estos contenidos para esta obra:')}</p><ul>{labels.map(label=><li key={label}>{ui(label)}</li>)}</ul><p>{ui('Puedes continuar o elegir otra lectura.')}</p><div className={styles.actions}><button type="button" onClick={()=>setAccepted(true)}>{ui('Ver contenido')}</button><button type="button" onClick={()=>onNavigate('home')}>{ui('Elegir otra obra')}</button></div></section>;
 return <>{labels.length>0&&<details className={styles.inset}><summary>{ui('Avisos de contenido')}</summary><ul>{labels.map(label=><li key={label}>{ui(label)}</li>)}</ul></details>}{children}</>;
}
