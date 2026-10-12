import { useEffect, useRef, useState } from 'react';
import { listWorkspace, saveWorkspace } from '../api/workspaceApi';
export function readEditorialDraft(key) {
  try { return JSON.parse(localStorage.getItem(`valoria-draft:${key}`) || 'null'); } catch { return null; }
}
export function useEditorialDraft(key,value,onRestore,token,enabled=true) {
  const [status,setStatus]=useState('');
  const restore=useRef(onRestore);restore.current=onRestore;
  const previousValue=useRef('');
  const revision=useRef(0);
  const savedKey=useRef('');
  useEffect(()=>{
    if(!enabled)return;
    let active=true;
    const local=readEditorialDraft(key);
    if(local){restore.current(local.data);setStatus('Copia recuperada de este dispositivo');}
    if(!token)return ()=>{active=false;};
    const baseline=revision.current;
    listWorkspace('drafts',token).then(({items})=>{
      const cloud=items.find(item=>item.key===key);
      if(active && baseline===revision.current && cloud && Date.parse(cloud.updated_at)>(local?.savedAt||0)){
        try{localStorage.setItem(`valoria-draft:${key}`,JSON.stringify({data:cloud.data.current,savedAt:Date.parse(cloud.updated_at),versionAt:Date.parse(cloud.updated_at),versions:cloud.data.versions||[]}));}catch{}
        previousValue.current=JSON.stringify(cloud.data.current);
        restore.current(cloud.data.current);setStatus('Borrador recuperado de tu cuenta');
      }
    }).catch(()=>{});
    return ()=>{active=false;};
  },[key,token,enabled]);
  useEffect(()=>{
    if(!enabled)return;
    const serialized=JSON.stringify(value);
    if(savedKey.current!==key){savedKey.current=key;previousValue.current=serialized;return;}
    const previous=readEditorialDraft(key);
    if(serialized===previousValue.current || serialized===JSON.stringify(previous?.data)){previousValue.current=serialized;return;}
    previousValue.current=serialized;
    revision.current++;
    const now=Date.now();
    const versions=previous?.versions || [];
    const snapshot = previous && now-(previous.versionAt||0)>30000 && JSON.stringify(previous.data)!==JSON.stringify(value);
    if(snapshot) versions.unshift({at:previous.savedAt,data:previous.data});
    const item={data:value,savedAt:now,versionAt:snapshot ? now : previous?.versionAt || now,versions:versions.slice(0,20)};
    let localSaved=true;
    try {localStorage.setItem(`valoria-draft:${key}`,JSON.stringify(item));setStatus(token?'Guardado en este dispositivo · sincronización pendiente':'Guardado en este dispositivo');}
    catch {localSaved=false;setStatus('No se pudo guardar la copia local. Guarda antes de salir.');}
    if(!token)return;
    if(navigator.onLine===false){setStatus('Sin conexión · guardado en este dispositivo');return;}
    let active=true;
    const timer=setTimeout(()=>{
      setStatus('Guardando en tu cuenta…');
      saveWorkspace('drafts',key,{current:value,versions:item.versions.filter((version,index)=>index<5 && JSON.stringify(version).length<100000)},token).then(()=>{if(active)setStatus('Borrador guardado en tu cuenta');}).catch(()=>{if(active)setStatus(localSaved?'Sin sincronizar: tu copia local se conserva':'No se pudo guardar. Conserva el contenido y reintenta antes de salir.');});
    },1200);
    return ()=>{active=false;clearTimeout(timer);};
  },[key,value,token,enabled]);
  useEffect(()=>{
    if(!enabled||!token)return;
    let active=true;
    const retry=()=>{
      const item=readEditorialDraft(key);if(!item)return;
      const baseline=revision.current;setStatus('Guardando en tu cuenta…');
      saveWorkspace('drafts',key,{current:item.data,versions:(item.versions||[]).slice(0,5)},token).then(()=>{if(active&&baseline===revision.current)setStatus('Borrador guardado en tu cuenta');}).catch(()=>{if(active)setStatus('Sin sincronizar: tu copia local se conserva');});
    };
    window.addEventListener('online',retry);
    return()=>{active=false;window.removeEventListener('online',retry);};
  },[key,token,enabled]);
  return status;
}
