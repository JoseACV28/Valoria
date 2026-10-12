import { ui } from "../i18n/runtime.js";
import { useEffect, useState } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { Navbar } from '../components/layout/Navbar';
import { workspaceRequest } from '../api/workspaceApi';
import styles from '../styles/AdministrationPage.module.css';
export function TrashPage({auth,navFilters,onNavigate}) {
  const [items,setItems]=useState([]),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
  const load=()=>workspaceRequest('recovery',auth.token).then(data=>setItems(data.items));
  useEffect(()=>{let active=true;if(!auth.token){setLoading(false);return;}workspaceRequest('recovery',auth.token).then(data=>{if(active)setItems(data.items);}).catch(e=>{if(active)setMessage(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[auth.token]);
  async function restore(item){setBusy(true);try{const data=await workspaceRequest(`recovery/${item.type}/${item.id}/restore`,auth.token,'POST',{});setMessage(data.message);await load();}catch(e){setMessage(e.message);}finally{setBusy(false);}}
  return <AppShell auth={auth} currentView="trash" onNavigate={onNavigate}><main className={styles.page}><Navbar auth={auth} {...navFilters} onNavigate={onNavigate}/><header className={styles.header}><span>{ui("RECUPERACIÓN")}</span><h1>{ui("Tu papelera")}</h1><p>{ui("Puedes restaurar historias, capítulos e ilustraciones durante 30 días. Se recuperan como borradores para que revises su publicación.")}</p></header><section className={styles.card}>{!auth.token?<button type="button" onClick={()=>onNavigate('login')}>{ui("Iniciar sesión")}</button>:loading?<p>{ui("Cargando papelera…")}</p>:!items.length?<p>{ui("No tienes contenido en la papelera.")}</p>:items.map(item=><article key={`${item.type}:${item.id}`} className={styles.user}><div><strong>{item.title}</strong><small>{({story:'Historia',chapter:'Capítulo',illustration:'Ilustración'})[item.type]}{ui(" · Eliminado el ")}{new Date(item.deletedAt).toLocaleDateString()}</small><small>{item.canRestore?ui("Recuperable hasta {0}",[new Date(item.recoverUntil).toLocaleDateString()]):ui("Plazo de recuperación terminado")}</small></div><button disabled={busy||!item.canRestore} type="button" onClick={()=>restore(item)}>{ui("Restaurar")}</button></article>)}<button type="button" onClick={()=>onNavigate('creator')}>{ui("Ir al panel de creador")}</button></section>{message&&<p className={styles.message} role="status">{ui(message)}</p>}</main></AppShell>;
}
