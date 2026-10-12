import { randomUUID } from 'node:crypto';
import { NotificationModel } from '../models/notificationModel.js';
import { profilesBlocked } from '../middlewares/profileBlocks.js';
import { Router } from 'express';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { isSupabaseEnabled, supabaseAdmin } from '../config/supabase.js';
import { StoryModel } from '../models/storyModel.js';
import { ChapterModel } from '../models/chapterModel.js';
import { IllustrationModel } from '../models/illustrationModel.js';
import { demoUsers } from '../data/authStore.js';
import { httpError } from '../utils/contentAccess.js';
const router=Router(), local=[], suggestions=[];
router.use(requireAuth);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function inviteById(id){if(!uuid.test(id))return null;if(!isSupabaseEnabled())return local.find(x=>x.id===id);const {data,error}=await supabaseAdmin.from('collaboration_invites').select('*').eq('id',id).maybeSingle();if(error)throw error;return data;}
async function manuscriptAccess(id,actor){
  const invite=await inviteById(id);
  if(!invite||invite.work_type!=='story'||invite.status!=='accepted'||![invite.sender_id,invite.recipient_id].includes(actor))throw httpError(404,'Colaboración no disponible.');
  if(actor!==invite.sender_id&&!['read','suggest'].includes(invite.editorial_access))throw httpError(403,'El autor todavía no te ha compartido el manuscrito.');
  if(await profilesBlocked(invite.sender_id,invite.recipient_id))throw httpError(403,'Esta colaboración no está disponible entre estas cuentas.');
  const story=await StoryModel.getByIdOrSlug(invite.work_id);
  if(!story||story.authorId!==invite.sender_id||(story.moderation_hidden_at&&actor!==invite.sender_id))throw httpError(404,'La obra no está disponible.');
  return {invite,story};
}
router.get('/',async(req,res,next)=>{try{
  if(!isSupabaseEnabled())return res.json({invites:local.filter(x=>[x.sender_id,x.recipient_id].includes(req.authUser.id)).map(x=>({...x,sender:{display_name:demoUsers.find(u=>u.id===x.sender_id)?.displayName},recipient:{display_name:demoUsers.find(u=>u.id===x.recipient_id)?.displayName}}))});
  const {data,error}=await supabaseAdmin.from('collaboration_invites').select('*,sender:profiles!sender_id(display_name),recipient:profiles!recipient_id(display_name)').or(`sender_id.eq.${req.authUser.id},recipient_id.eq.${req.authUser.id}`).order('created_at',{ascending:false}).limit(100);
  if(error)throw httpError(503,'Aplica la migración de comunidad para activar las colaboraciones.');res.json({invites:data});
}catch(error){next(error);}});
router.post('/',async(req,res,next)=>{try{
  const {recipientId,workType,workId,role,note}=req.body;
  if(!['story','illustration'].includes(workType)||!['Ilustración','Corrección','Lectura beta','Coautoría'].includes(role)||recipientId===req.authUser.id||!uuid.test(recipientId||''))return res.status(400).json({message:'Selecciona una obra, un colaborador distinto y un rol válido.'});
  const work=await (workType==='story'?StoryModel:IllustrationModel).getByIdOrSlug(workId,req.authUser.id);
  if(work?.authorId!==req.authUser.id)return res.status(403).json({message:'Solo puedes invitar a colaborar en tus propias obras.'});
  if(await profilesBlocked(req.authUser.id,recipientId))return res.status(403).json({message:'Esta interacción no está disponible entre estas cuentas.'});
  const entry={id:randomUUID(),sender_id:req.authUser.id,recipient_id:recipientId,work_type:workType,work_id:work.id,role,note:String(note||'').slice(0,2000),status:'pending',editorial_access:'none',created_at:new Date().toISOString()};
  if(!isSupabaseEnabled()){
    if(!demoUsers.some(x=>x.id===recipientId))throw httpError(404,'Colaborador no encontrado.');
    if(local.some(x=>x.sender_id===entry.sender_id&&x.recipient_id===recipientId&&x.work_id===work.id))throw httpError(409,'Ya existe una invitación para esta obra.');local.push(entry);
  }else{const {error}=await supabaseAdmin.from('collaboration_invites').insert(entry);if(error)throw httpError(409,'No se pudo crear la invitación. Comprueba si ya existe para esta obra.');}
  await NotificationModel.create({recipientId,actorId:req.authUser.id,actorName:req.authUser.displayName,type:'collaboration_invite',title:`${req.authUser.displayName} te invita a colaborar`,body:`${work.title} · ${role}`,routeView:'collaborations'}).catch(()=>{});res.status(201).json({id:entry.id});
}catch(error){next(error);}});
router.patch('/:id',async(req,res,next)=>{try{
  const invite=await inviteById(req.params.id);if(!invite)throw httpError(404,'Invitación no encontrada.');
  const allowed=req.authUser.id===invite.recipient_id?['accepted','declined']:req.authUser.id===invite.sender_id?['cancelled']:[];
  if(!allowed.includes(req.body.status)||invite.status!=='pending')throw httpError(403,'No puedes cambiar esta invitación.');
  if(!isSupabaseEnabled())invite.status=req.body.status;
  else{const update=await supabaseAdmin.from('collaboration_invites').update({status:req.body.status}).eq('id',invite.id).eq('status','pending').select('id');if(update.error)throw update.error;if(!update.data.length)throw httpError(409,'La invitación ya fue respondida.');}
  await NotificationModel.create({recipientId:req.authUser.id===invite.sender_id?invite.recipient_id:invite.sender_id,actorId:req.authUser.id,actorName:req.authUser.displayName,type:'collaboration_response',title:'Tu invitación de colaboración fue actualizada',body:{accepted:'Colaboración aceptada',declined:'Invitación rechazada',cancelled:'Invitación cancelada'}[req.body.status],routeView:'collaborations'}).catch(()=>{});res.json({message:'Invitación actualizada.'});
}catch(error){next(error);}});
router.put('/:id/access',async(req,res,next)=>{try{
  const invite=await inviteById(req.params.id);
  if(!invite||invite.sender_id!==req.authUser.id||invite.status!=='accepted'||invite.work_type!=='story')throw httpError(403,'Solo el autor puede compartir una historia en una colaboración aceptada.');
  if(!['none','read','suggest'].includes(req.body.access))throw httpError(400,'Permiso editorial inválido.');
  const story=await StoryModel.getByIdOrSlug(invite.work_id);if(story?.authorId!==req.authUser.id)throw httpError(404,'Obra no disponible.');
  if(!isSupabaseEnabled())invite.editorial_access=req.body.access;
  else{const {error}=await supabaseAdmin.from('collaboration_invites').update({editorial_access:req.body.access}).eq('id',invite.id).eq('sender_id',req.authUser.id).eq('status','accepted');if(error)throw error;}
  res.json({message:req.body.access==='none'?'Acceso al manuscrito revocado.':'Acceso editorial actualizado.'});
}catch(error){next(error);}});
router.get('/:id/manuscript',async(req,res,next)=>{try{
  const {invite,story}=await manuscriptAccess(req.params.id,req.authUser.id);
  const chapters=await ChapterModel.getByStoryId(story.id);
  let notes;
  if(!isSupabaseEnabled())notes=suggestions.filter(x=>x.invite_id===invite.id);
  else{const {data,error}=await supabaseAdmin.from('collaboration_suggestions').select('*').eq('invite_id',invite.id).order('created_at',{ascending:false}).limit(100);if(error)throw error;notes=data;}
  res.json({invite,story,chapters,suggestions:notes,canSuggest:req.authUser.id===invite.recipient_id&&invite.editorial_access==='suggest',isAuthor:req.authUser.id===invite.sender_id});
}catch(error){next(error);}});
router.post('/:id/suggestions',async(req,res,next)=>{try{
  const {invite,story}=await manuscriptAccess(req.params.id,req.authUser.id);
  if(req.authUser.id!==invite.recipient_id||invite.editorial_access!=='suggest')throw httpError(403,'Necesitas permiso para enviar sugerencias.');
  const {chapterId,quote,note}=req.body;
  if(typeof note!=='string'||note.trim().length<3||note.length>4000||typeof quote!=='string'||quote.length>3000)throw httpError(400,'Añade una sugerencia de 3 a 4000 caracteres y una cita de hasta 3000.');
  if(!(await ChapterModel.getByStoryId(story.id)).some(x=>x.id===chapterId))throw httpError(404,'Capítulo no encontrado.');
  const entry={id:randomUUID(),invite_id:invite.id,chapter_id:chapterId,author_id:req.authUser.id,quote,note:note.trim(),status:'pending',created_at:new Date().toISOString()};
  if(!isSupabaseEnabled())suggestions.unshift(entry);else{const {error}=await supabaseAdmin.from('collaboration_suggestions').insert(entry);if(error)throw error;}
  res.status(201).json({message:'Sugerencia enviada. El texto original permanece intacto.'});
}catch(error){next(error);}});
router.patch('/:id/suggestions/:suggestionId',async(req,res,next)=>{try{
  const {invite}=await manuscriptAccess(req.params.id,req.authUser.id);
  if(req.authUser.id!==invite.sender_id||!['reviewed','dismissed'].includes(req.body.status))throw httpError(403,'Solo el autor puede revisar estas sugerencias.');
  if(!isSupabaseEnabled()){const note=suggestions.find(x=>x.id===req.params.suggestionId&&x.invite_id===invite.id);if(!note)throw httpError(404,'Sugerencia no encontrada.');note.status=req.body.status;}
  else{const {data,error}=await supabaseAdmin.from('collaboration_suggestions').update({status:req.body.status}).eq('id',req.params.suggestionId).eq('invite_id',invite.id).select('id');if(error)throw error;if(!data.length)throw httpError(404,'Sugerencia no encontrada.');}
  res.json({message:'Revisión guardada.'});
}catch(error){next(error);}});
export default router;
