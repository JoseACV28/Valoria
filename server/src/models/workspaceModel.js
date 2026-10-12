import {isSupabaseEnabled,supabaseAdmin} from '../config/supabase.js';
import {httpError} from '../utils/contentAccess.js';
const local=new Map();
export async function listWorkspaceRows(userId,namespace,key){
 if(!isSupabaseEnabled())return [...local.values()].filter(x=>(!userId||x.user_id===userId)&&x.namespace===namespace&&(!key||x.key===key)).map(x=>structuredClone(x));
 let query=supabaseAdmin.from('user_workspace').select('user_id,key,data,updated_at').eq('namespace',namespace);if(userId)query=query.eq('user_id',userId);if(key)query=query.eq('key',key);
 const result=[];for(let offset=0;;offset+=500){const {data,error}=await query.order('user_id').order('key').range(offset,offset+499);if(error)throw httpError(503,'No se pudieron consultar las preferencias. Reintenta.');result.push(...data);if(data.length<500)return result;}
}
export async function saveWorkspaceRow(userId,namespace,key,data){
 const item={user_id:userId,namespace,key,data,updated_at:new Date().toISOString()};
 if(!isSupabaseEnabled())local.set(`${userId}:${namespace}:${key}`,item);
 else {const {error}=await supabaseAdmin.from('user_workspace').upsert(item);if(error)throw httpError(503,'No se pudo guardar la preferencia. Reintenta.');}return item;
}
export async function deleteWorkspaceRow(userId,namespace,key){
 if(!isSupabaseEnabled())local.delete(`${userId}:${namespace}:${key}`);
 else {const {error}=await supabaseAdmin.from('user_workspace').delete().eq('user_id',userId).eq('namespace',namespace).eq('key',key);if(error)throw httpError(503,'No se pudo eliminar la preferencia.');}
}
