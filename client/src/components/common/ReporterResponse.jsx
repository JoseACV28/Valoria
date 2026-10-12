import {useState} from 'react';
import {ui} from '../../i18n/runtime';
import {workspaceRequest} from '../../api/workspaceApi';
export function ReporterResponse({report,auth}){
  const [value,setValue]=useState(report.reporter_message||''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  return <div>{report.appeal&&<p>{ui('Solicitud de revisión')}: {report.appeal}</p>}<label>{ui('Explicación visible para quien denunció')}<textarea maxLength={2000} value={value} onChange={e=>setValue(e.target.value)}/></label><button type="button" disabled={busy} onClick={async()=>{if(busy)return;setBusy(true);try{await workspaceRequest(`reports/${report.id}`,auth.token,'PATCH',{status:report.status==='pending'?'reviewing':report.status,reporterMessage:value});setMessage('Cambios guardados.');}catch(e){setMessage(e.message);}finally{setBusy(false);}}}>{ui('Guardar respuesta pública')}</button><p role="status">{ui(message)}</p></div>;
}
