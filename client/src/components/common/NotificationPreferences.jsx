import { ui } from "../../i18n/runtime.js";
import { useEffect, useState } from 'react';
import { listWorkspace, saveWorkspace } from '../../api/workspaceApi';
export function NotificationPreferences({auth}) {
  const [value,setValue]=useState({newChapters:true,replies:true}),[message,setMessage]=useState('');
  useEffect(()=>{listWorkspace('preferences',auth.token).then(({items})=>{const item=items.find(x=>x.key==='notifications');if(item)setValue(item.data);}).catch(()=>{});},[auth.token]);
  async function change(key,enabled){const next={...value,[key]:enabled};setValue(next);try{await saveWorkspace('preferences','notifications',next,auth.token);setMessage('Preferencias guardadas.');}catch(error){setMessage(error.message);}}
  if(!auth.token)return null;
  return <details><summary>{ui("Preferencias de notificaciones")}</summary>{[['newChapters','Nuevos capítulos de autores y obras que sigo'],['replies','Comentarios y respuestas']].map(([key,label])=><label key={key} style={{display:'block',margin:12}}><input type="checkbox" checked={value[key]!==false} onChange={event=>change(key,event.target.checked)}/>{ui(label)}</label>)}<small role="status">{ui(message)}</small></details>;
}
