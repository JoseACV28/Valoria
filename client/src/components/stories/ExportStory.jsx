import { ui } from "../../i18n/runtime.js";
import { downloadFile } from '../../utils/offlineDocument';
import { useState } from 'react';
import { workspaceRequest } from '../../api/workspaceApi';
import { contentToHtml } from '../../utils/richContent';
import {downloadEpub,printBook,exportCover} from '../../utils/bookExport';
export function ExportStory({story,auth}) {
  const [message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  async function download(format){setBusy(true);try{
    const data=await workspaceRequest(`recovery/export/${story.id}`,auth.token);
    if(format==='epub'||format==='pdf'){const cover=await exportCover(data.story);if(format==='epub'){downloadEpub(data,cover);setMessage('Archivo preparado para descargar.');}else{printBook(data,cover);setMessage('Elige Guardar como PDF en el diálogo de impresión.');}return;}
    const plain=value=>{const element=document.createElement('div');element.innerHTML=contentToHtml(value||'');return element.innerText||element.textContent;};
    const text=format==='json'?JSON.stringify(data,null,2):`${data.story.title}\n${data.story.description||''}\n\n${data.chapters.map(c=>`${c.title}\n\n${plain(c.content)}`).join('\n\n──────────\n\n')}`;
    downloadFile(text,`${story.slug||'historia'}.${format}`,format==='json'?'application/json':'text/plain;charset=utf-8');setMessage('Archivo preparado para descargar.');
  }catch(e){setMessage(e.message);}finally{setBusy(false);}}
  return <details style={{padding:20,borderRadius:'var(--radius-panel)',border:'1px solid var(--line-soft)',margin:'16px 0'}}><summary>{ui("Descargar mi obra")}</summary><p>{ui("La exportación incluye los capítulos activos, publicados y en borrador. El JSON conserva el formato y los metadatos; las imágenes se referencian por enlace.")}</p><div style={{display:'flex',gap:12,flexWrap:'wrap'}}><button type="button" disabled={busy} onClick={()=>download('txt')}>{ui("Descargar texto")}</button><button type="button" disabled={busy} onClick={()=>download('json')}>{ui("Descargar JSON")}</button></div><div style={{display:'flex',gap:12,flexWrap:'wrap',marginTop:12}}><button type="button" disabled={busy} onClick={()=>download('epub')}>{ui('Descargar EPUB')}</button><button type="button" disabled={busy} onClick={()=>download('pdf')}>{ui('PDF / imprimir')}</button></div><p role="status">{ui(message)}</p></details>;
}

