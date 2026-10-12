import { ui } from "../../i18n/runtime.js";
import {useEffect,useState} from 'react';
import {listWorkspace,deleteWorkspace} from '../../api/workspaceApi';
export function MutedNotifications({auth}){
 const [items,setItems]=useState([]),[message,setMessage]=useState('');
 useEffect(()=>{let active=true;if(auth.token)listWorkspace('preferences',auth.token).then(data=>{if(active)setItems(data.items.filter(item=>item.key.startsWith('mute-')&&item.data.enabled));}).catch(()=>{});return()=>{active=false;};},[auth.token]);
 if(!auth.token)return null;
 return <details><summary>{ui("Notificaciones silenciadas (")}{items.length})</summary>{items.map(item=><p key={item.key}>{item.data.name||ui("Hilo de conversación")} <button type="button" onClick={async()=>{try{await deleteWorkspace('preferences',item.key,auth.token);setItems(current=>current.filter(x=>x.key!==item.key));}catch(error){setMessage(error.message);}}}>{ui("Volver a recibir notificaciones")}</button></p>)}<p role="status">{ui(message)}</p></details>;
}
