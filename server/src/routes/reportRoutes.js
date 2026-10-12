import { canReadContent } from '../utils/contentAccess.js';
import { rawWork, setModerationVisibility } from '../models/contentRecovery.js';
import { ChapterModel } from '../models/chapterModel.js';
import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { isSupabaseEnabled, supabaseAdmin } from '../config/supabase.js';
import { getSiteAccess, recordAdminAction, runAdminAction } from '../models/siteAdministration.js';
import { requireAdminMfa } from '../utils/sessionSecurity.js';
const router=Router(), local=[];
router.use(requireAuth);
// Reporter routes precede the moderator gate and expose an explicit safe projection.
router.get('/mine',async(req,res,next)=>{try{
  let reports;
  if(!isSupabaseEnabled())reports=local.filter(x=>x.reporter_id===req.authUser.id).map(({id,target_type,target_id,reason,status,reporter_message,appeal,appealed_at,created_at,updated_at})=>({id,target_type,target_id,reason,status,reporter_message,appeal,appealed_at,created_at,updated_at}));
  else {const {data,error}=await supabaseAdmin.from('content_reports').select('id,target_type,target_id,reason,status,reporter_message,appeal,appealed_at,created_at,updated_at').eq('reporter_id',req.authUser.id).order('created_at',{ascending:false}).limit(100);if(error)throw Object.assign(new Error('Comprueba la migración de seguimiento de denuncias.'),{status:503});reports=data;}
  res.json({reports});
}catch(e){next(e);}});
router.post('/:id/appeal',async(req,res,next)=>{try{
  if(Object.keys(req.body).some(k=>k!=='reason')||typeof req.body.reason!=='string'||req.body.reason.trim().length<10||req.body.reason.length>2000)return res.status(400).json({message:'Indica un motivo de entre 10 y 2000 caracteres.'});
  const update={appeal:req.body.reason.trim(),appealed_at:new Date().toISOString(),status:'reviewing',updated_at:new Date().toISOString()};
  if(!isSupabaseEnabled()){const report=local.find(x=>x.id===req.params.id&&x.reporter_id===req.authUser.id);if(!report)return res.status(404).json({message:'Denuncia no encontrada.'});if(!['resolved','dismissed'].includes(report.status)||report.appealed_at)return res.status(409).json({message:'La denuncia ya está en revisión o ya fue apelada.'});Object.assign(report,update);}
  else {const {data,error}=await supabaseAdmin.from('content_reports').update(update).eq('id',req.params.id).eq('reporter_id',req.authUser.id).in('status',['resolved','dismissed']).is('appealed_at',null).select('id').maybeSingle();if(error)throw error;if(!data)return res.status(409).json({message:'No se puede solicitar otra revisión de esta denuncia.'});}
  res.json({message:'Cambios guardados.'});
}catch(e){next(e);}});
router.post('/',async(req,res,next)=>{
  try {
    const {targetType,targetId,reason}=req.body;
    if(!['profile','comment','story','illustration'].includes(targetType)|| !/^[0-9a-f-]{36}$/i.test(targetId||'') || typeof reason!=='string'|| reason.trim().length<5||reason.length>2000) return res.status(400).json({message:'Indica el contenido y un motivo de entre 5 y 2000 caracteres.'});
    if(['story','illustration'].includes(targetType)){const row=await rawWork(targetType,targetId);if(!canReadContent(row&&{...row,authorId:row.author_id},req.authUser))return res.status(404).json({message:'Contenido no disponible para denunciar.'});}
    const report={reporter_id:req.authUser.id,target_type:targetType,target_id:targetId,reason:reason.trim()};
    let id=randomUUID();
    if(!isSupabaseEnabled()) local.push({...report,id,status:'pending',created_at:new Date().toISOString()});
    else {const {data,error}=await supabaseAdmin.from('content_reports').insert(report).select('id').single(); if(error) throw Object.assign(new Error('No se pudo enviar la denuncia. Reintenta más tarde.'),{status:503}); id=data.id;}
    res.status(201).json({id,message:'Denuncia enviada para revisión.'});
  }catch(error){next(error);}
});
router.use(async(req,res,next)=>{
  try {
    if(!isSupabaseEnabled()) {
      const access=await getSiteAccess(req.authUser.id);
      return access.isOwner || access.permissions.includes('reports') ? next() : res.status(403).json({message:'Se requiere un moderador registrado.'});
    }
    const {data,error}=await supabaseAdmin.from('profiles').select('is_moderator').eq('id',req.authUser.id).single();
    const access=await getSiteAccess(req.authUser.id);
    if(!access.isOwner && !access.permissions.includes('reports') && (error||!data?.is_moderator)) return res.status(403).json({message:'Acceso exclusivo de moderación.'}); next();
  }catch(error){next(error);}
});
router.use(requireAdminMfa);
router.get('/',async(req,res,next)=>{try{if(!isSupabaseEnabled())return res.json({reports:local});const {data,error}=await supabaseAdmin.from('content_reports').select('*').order('created_at',{ascending:false}).limit(100);if(error)throw error;res.json({reports:data});}catch(e){next(e);}});
router.patch('/:id',async(req,res,next)=>{try{
  if(!/^[0-9a-f-]{36}$/i.test(req.params.id)||!['reviewing','resolved','dismissed'].includes(req.body.status)) return res.status(400).json({message:'Estado inválido'});
  if(Object.keys(req.body).some(k=>!['status','resolution','reporterMessage'].includes(k))||(req.body.reporterMessage!==undefined&&(typeof req.body.reporterMessage!=='string'||req.body.reporterMessage.length>2000)))return res.status(400).json({message:'Respuesta inválida.'});
  const update={status:req.body.status,...(req.body.resolution===undefined?{}:{resolution:String(req.body.resolution||'').slice(0,2000)}),...(req.body.reporterMessage===undefined?{}:{reporter_message:req.body.reporterMessage.trim()}),updated_at:new Date().toISOString()};
  await runAdminAction(req.authUser.id,'report.update.requested',req.params.id,{fields:['status','resolution'],status:update.status},async()=>{
  if(!isSupabaseEnabled()){const report=local.find(x=>x.id===req.params.id);if(!report)throw Object.assign(new Error('Denuncia no encontrada.'),{status:404});Object.assign(report,update);}
  else{const {data,error}=await supabaseAdmin.from('content_reports').update(update).eq('id',req.params.id).select('id').maybeSingle();if(error)throw error;if(!data)throw Object.assign(new Error('Denuncia no encontrada.'),{status:404});}
  });
  res.json({message:'Revisión guardada'});
}catch(e){next(e);}});

async function findReport(id) {
  if(!isSupabaseEnabled())return local.find(x=>x.id===id);
  const {data,error}=await supabaseAdmin.from('content_reports').select('*').eq('id',id).maybeSingle();if(error)throw error;return data;
}
router.get('/:id/target',async(req,res,next)=>{try{
  const report=await findReport(req.params.id);if(!report)return res.status(404).json({message:'Denuncia no encontrada.'});
  let target;
  if(['story','illustration'].includes(report.target_type)) {
    const row=await rawWork(report.target_type,report.target_id);
    if(row&&!row.deleted_at)target={type:report.target_type,id:row.id,title:row.title,description:row.description||'',hidden:Boolean(row.moderation_hidden_at),chapters:report.target_type==='story'?await ChapterModel.getByStoryId(row.id):[],canHide:true};
  } else if(isSupabaseEnabled()) {
    const tables=report.target_type==='profile'?['profiles']:['story_reviews','creator_wall_comments','creator_wall_posts','illustration_comments'];
    for(const table of tables){const fields=table==='profiles'?'id,display_name,bio':'*';const {data,error}=await supabaseAdmin.from(table).select(fields).eq('id',report.target_id).maybeSingle();if(!error&&data){target={type:report.target_type,id:data.id,title:data.display_name||data.author_name||'Comentario denunciado',description:data.bio||data.review_text||data.content||'',canHide:false};break;}}
  }
  if(!target)return res.status(404).json({message:'El contenido ya no está disponible.'});res.json({target});
}catch(e){next(e);}});
router.put('/:id/visibility',async(req,res,next)=>{try{
  const report=await findReport(req.params.id);if(!report)return res.status(404).json({message:'Denuncia no encontrada.'});
  if(typeof req.body.hidden!=='boolean'||typeof req.body.reason!=='string'||req.body.reason.trim().length<5||req.body.reason.length>2000)return res.status(400).json({message:'Indica la decisión y un motivo de entre 5 y 2000 caracteres.'});
  await runAdminAction(req.authUser.id,'moderation.visibility',report.target_id,{hidden:req.body.hidden,reportId:report.id,reason:req.body.reason.trim()},()=>setModerationVisibility(report.target_type,report.target_id,req.body.hidden));
  res.json({message:req.body.hidden?'Obra oculta del catálogo y de los enlaces públicos.':'Visibilidad restaurada según el estado de publicación del autor.'});
}catch(e){next(e);}});
export default router;
