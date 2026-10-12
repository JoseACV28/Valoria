import {isSupabaseEnabled,supabaseAdmin} from '../config/supabase.js';
const recent=new Map();
const unsaved=new Set();
export async function operationalAlert(kind,message,active=true){
 if(!isSupabaseEnabled())return;
 const key=kind+':'+active;if(Date.now()-(recent.get(key)||0)<60000)return;recent.set(key,Date.now());
 const {data,error}=await supabaseAdmin.from('operational_alerts').select('id').eq('kind',kind).eq('status','open').maybeSingle();if(error){if(active&&!unsaved.has(kind)){unsaved.add(kind);await deliver(kind,'open');}return;}
 if(!active&&unsaved.has(kind)){unsaved.delete(kind);await deliver(kind,'resolved');}
 if(active&&!data){const result=await supabaseAdmin.from('operational_alerts').insert({kind,message});if(result.error)return;await deliver(kind,'open');}
 if(!active&&data){const result=await supabaseAdmin.from('operational_alerts').update({status:'resolved',updated_at:new Date().toISOString()}).eq('id',data.id);if(!result.error)await deliver(kind,'resolved');}
}
async function deliver(kind,status){
 const raw=process.env.OPERATIONS_WEBHOOK_URL;if(!raw)return;
 try{const url=new URL(raw);if(url.protocol!=='https:'||url.username||url.password)throw new Error('Invalid webhook');
 const response=await fetch(url,{method:'POST',redirect:'error',headers:{'Content-Type':'application/json'},body:JSON.stringify({service:'Valoria',event:kind,status,at:new Date().toISOString()}),signal:AbortSignal.timeout(10000)});if(!response.ok)throw new Error('Delivery failed');
 }catch{console.error({event:'operations.delivery_failed'});}
}
export async function checkOperations({backup,publication}){
 if(isSupabaseEnabled()){const {error}=await supabaseAdmin.from('site_settings').select('id').limit(1);await operationalAlert('database.unavailable','No se pudo consultar la base de datos.',Boolean(error));}
 await operationalAlert('backup.failed','No se completó el respaldo.',Boolean(backup.lastError));
 await operationalAlert('publication.failed','Hay un problema con publicaciones programadas.',Boolean(publication.lastError||publication.failed));
}
