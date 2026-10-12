import {randomUUID} from 'node:crypto';
import {isSupabaseEnabled,supabaseAdmin} from '../config/supabase.js';
import {StoryModel} from './storyModel.js';
import {IllustrationModel} from './illustrationModel.js';
import {canReadContent,httpError} from '../utils/contentAccess.js';
import {validateContentWarnings} from '../utils/contentWarnings.js';
const local=new Map();
export const EXPERIENCE_TABLES=['account_privacy_requests','chapter_versions','work_details','editorial_picks'];
export async function rows(table,filters={}) {
  if(!EXPERIENCE_TABLES.includes(table))throw new Error('Invalid table');
  if(!isSupabaseEnabled())return [...(local.get(table)||[])].filter(row=>Object.entries(filters).every(([key,value])=>row[key]===value)).map(row=>structuredClone(row));
  let query=supabaseAdmin.from(table).select('*');
  for(const [key,value]of Object.entries(filters))query=query.eq(key,value);
  const {data,error}=await query.order(table==='chapter_versions'?'created_at':'id').limit(1000);
  if(error)throw httpError(503,'Aplica la migración 20261006_reader_creator_experience.sql para activar esta función.');
  return data;
}
export async function putRow(table,data,conflict='id') {
  if(!EXPERIENCE_TABLES.includes(table))throw new Error('Invalid table');
  if(!isSupabaseEnabled()){
    const list=local.get(table)||[];const keys=conflict.split(',');const index=list.findIndex(x=>keys.every(k=>x[k]===data[k]));
    const row={id:randomUUID(),created_at:new Date().toISOString(),...(index<0?{}:list[index]),...data};
    if(index<0)list.push(row);else list[index]=row;local.set(table,list);return row;
  }
  const {data:row,error}=await supabaseAdmin.from(table).upsert(data,{onConflict:conflict}).select('*').single();
  if(error)throw httpError(error.code==='23505'?409:503,error.code==='23505'?'Ese lugar ya está ocupado en la saga o hay una solicitud pendiente.':'No se pudo guardar. Comprueba la migración y reintenta.');return row;
}
export async function removeRow(table,id){
  if(!EXPERIENCE_TABLES.includes(table))throw new Error('Invalid table');
  if(!isSupabaseEnabled())local.set(table,(local.get(table)||[]).filter(x=>x.id!==id));
  else {const {error}=await supabaseAdmin.from(table).delete().eq('id',id);if(error)throw httpError(503,'No se pudo eliminar.');}
}
export async function updatePrivacyRequest(previous,changes){
  if(!isSupabaseEnabled()){
    const current=(local.get('account_privacy_requests')||[]).find(x=>x.id===previous.id);
    if(!current||current.status!==previous.status||current.updated_at!==previous.updated_at)throw httpError(409,'La solicitud cambió. Actualiza antes de continuar.');
    Object.assign(current,changes);return current;
  }
  const {data,error}=await supabaseAdmin.from('account_privacy_requests').update(changes).eq('id',previous.id).eq('user_id',previous.user_id).eq('status',previous.status).eq('updated_at',previous.updated_at).select('*').maybeSingle();
  if(error)throw httpError(503,'No se pudo actualizar la solicitud.');if(!data)throw httpError(409,'La solicitud cambió. Actualiza antes de continuar.');return data;
}
export async function visibleWork(type,id,user){
  if(!['story','illustration'].includes(type))throw httpError(400,'Tipo de obra inválido.');
  const work=await (type==='story'?StoryModel:IllustrationModel).getByIdOrSlug(id);
  if(!canReadContent(work,user))throw httpError(404,'Obra no disponible.');return work;
}
export async function ownedWork(type,id,user){const work=await visibleWork(type,id,user);if(work.authorId!==user.id)throw httpError(403,'Solo el autor puede modificar esta obra.');return work;}
export function validateDetails(type,body){
  const allowed=type==='story'?['seriesName','seriesPosition','contentWarnings']:['technique','tools','process','available','contentWarnings'];
  const warnings=body.contentWarnings===undefined?{}:{contentWarnings:validateContentWarnings(body.contentWarnings)};
  if(Object.keys(body).some(k=>!allowed.includes(k)))throw httpError(400,'Campo no permitido.');
  if(type==='story'){
    if(typeof body.seriesName!=='string'||body.seriesName.length>100||!Number.isInteger(body.seriesPosition)||body.seriesPosition<1||body.seriesPosition>1000)throw httpError(400,'Indica una saga de hasta 100 caracteres y un orden entre 1 y 1000.');
    return {series_name:body.seriesName.trim().replace(/\s+/g,' '),series_position:body.seriesPosition,data:warnings};
  }
  if(['technique','tools','process'].some(k=>typeof body[k]!=='string'||body[k].length>(k==='process'?10000:500))||typeof body.available!=='boolean')throw httpError(400,'Revisa los datos del portafolio.');
  return {data:{...Object.fromEntries(['technique','tools','process','available'].map(k=>[k,body[k]])),...warnings}};
}
export function captureLocalVersion(chapter){
  const list=local.get('chapter_versions')||[];
  list.push({id:randomUUID(),chapter_id:chapter.id,title:chapter.title,content:chapter.content||'',excerpt:chapter.excerpt||'',created_at:new Date().toISOString()});
  const chapterRows=list.filter(x=>x.chapter_id===chapter.id);const expired=new Set(chapterRows.slice(0,Math.max(0,chapterRows.length-50)).map(x=>x.id));local.set('chapter_versions',list.filter(x=>!expired.has(x.id)));
}
