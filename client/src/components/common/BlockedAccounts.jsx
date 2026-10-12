import { ui } from "../../i18n/runtime.js";
import { useEffect, useState } from 'react';
import { listWorkspace, deleteWorkspace } from '../../api/workspaceApi';
export function BlockedAccounts({auth}) {
  const [items,setItems]=useState([]),[message,setMessage]=useState('');
  useEffect(()=>{listWorkspace('blocks',auth.token).then(data=>setItems(data.items)).catch(()=>{});},[auth.token]);
  if(!auth.token)return null;
  return <details><summary>{ui("Cuentas bloqueadas (")}{items.length})</summary>{items.map(item=><div key={item.key}><span>{item.data.name||ui("Cuenta bloqueada")}</span><button type="button" onClick={async()=>{try{await deleteWorkspace('blocks',item.key,auth.token);setItems(current=>current.filter(x=>x.key!==item.key));}catch(error){setMessage(error.message);}}}>{ui("Desbloquear")}</button></div>)}<small role="status">{ui(message)}</small></details>;
}
