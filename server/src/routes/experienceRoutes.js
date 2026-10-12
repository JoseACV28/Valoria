import {Router} from 'express';
import {requireAuth} from '../middlewares/authMiddleware.js';
import {requireAdminMfa} from '../utils/sessionSecurity.js';
import {requireSitePermission,runAdminAction,SITE_OWNER_ID} from '../models/siteAdministration.js';
import {rows,putRow,removeRow,visibleWork,ownedWork,validateDetails,updatePrivacyRequest} from '../models/experienceModel.js';
import {isSupabaseEnabled,supabaseAdmin} from '../config/supabase.js';
import {ChapterModel} from '../models/chapterModel.js';
import {StoryModel} from '../models/storyModel.js';
import {closeAllAccountSessions} from '../models/passwordModel.js';
import {personalExportLimits} from '../middlewares/requestLimits.js';
import {httpError} from '../utils/contentAccess.js';
const router=Router();
const route=fn=>async(req,res,next)=>{try{await fn(req,res);}catch(e){next(e);}};
const page=req=>Math.max(1,Math.min(1000,parseInt(req.query.page,10)||1));

router.get('/works/:type/:id',route(async(req,res)=>{
  const work=await visibleWork(req.params.type,req.params.id,req.authUser);
  const detail=(await rows('work_details',{work_type:req.params.type,work_id:work.id}))[0]||{};
  const saga=[];
  if(req.params.type==='story'&&detail.series_name){
    const siblings=await rows('work_details',{owner_id:work.authorId,work_type:'story'});
    for(const item of siblings.filter(x=>x.series_name.toLocaleLowerCase()===detail.series_name.toLocaleLowerCase()).sort((a,b)=>a.series_position-b.series_position)){
      try{const sibling=await visibleWork('story',item.work_id,null);saga.push({id:sibling.id,title:sibling.title,slug:sibling.slug,position:item.series_position});}catch(e){if(e.status!==404)throw e;}
    }
  }
  res.json({detail,saga});
}));
router.put('/works/:type/:id',requireAuth,route(async(req,res)=>{
  const work=await ownedWork(req.params.type,req.params.id,req.authUser);const data=validateDetails(req.params.type,req.body);
  const previous=(await rows('work_details',{work_type:req.params.type,work_id:work.id}))[0];
  data.data={...(previous?.data||{}),...data.data};
  if(!isSupabaseEnabled()&&req.params.type==='story'&&data.series_name){
    const other=(await rows('work_details',{owner_id:req.authUser.id,work_type:'story'})).find(x=>x.work_id!==work.id&&x.series_name.toLowerCase()===data.series_name.toLowerCase()&&x.series_position===data.series_position);
    if(other)throw httpError(409,'Ese lugar ya está ocupado en la saga.');
  }
  res.json({detail:await putRow('work_details',{owner_id:req.authUser.id,work_type:req.params.type,work_id:work.id,...data,updated_at:new Date().toISOString()},'work_type,work_id')});
}));
router.get('/picks',route(async(req,res)=>{
  const picks=[];const now=Date.now();
  for(const item of (await rows('editorial_picks')).filter(x=>Date.parse(x.starts_at)<=now&&Date.parse(x.ends_at)>now).sort((a,b)=>a.sort_order-b.sort_order)){
    try{const work=await visibleWork(item.work_type,item.work_id,null);if(work.visibility&&work.visibility!=='public')continue;picks.push({...item,work});}catch(e){if(e.status!==404)throw e;}
  }res.json({picks});
}));
router.get('/picks/manage',requireAuth,requireAdminMfa,requireSitePermission('settings'),route(async(req,res)=>res.json({picks:await rows('editorial_picks')})));
router.put('/picks',requireAuth,requireAdminMfa,requireSitePermission('settings'),route(async(req,res)=>{
  const b=req.body;
  if(Object.keys(b).some(k=>!['workType','workId','heading','note','sortOrder','startsAt','endsAt'].includes(k))||typeof b.heading!=='string'||!b.heading.trim()||b.heading.length>100||typeof b.note!=='string'||b.note.length>500||!Number.isInteger(b.sortOrder)||b.sortOrder<1||b.sortOrder>1000||!Number.isFinite(Date.parse(b.startsAt))||!Number.isFinite(Date.parse(b.endsAt))||Date.parse(b.endsAt)<=Date.parse(b.startsAt))throw httpError(400,'Revisa el título, la descripción, el orden y las fechas.');
  const work=await visibleWork(b.workType,b.workId,null);if(work.visibility&&work.visibility!=='public')throw httpError(400,'Solo se pueden destacar obras públicas.');
  await runAdminAction(req.authUser.id,'editorial.pick',work.id,{type:b.workType},()=>putRow('editorial_picks',{work_type:b.workType,work_id:work.id,heading:b.heading.trim(),note:b.note,sort_order:b.sortOrder,starts_at:b.startsAt,ends_at:b.endsAt,created_by:req.authUser.id},'work_type,work_id'));
  res.json({message:'Cambios guardados.'});
}));
router.delete('/picks/:id',requireAuth,requireAdminMfa,requireSitePermission('settings'),route(async(req,res)=>{await runAdminAction(req.authUser.id,'editorial.remove',req.params.id,{},()=>removeRow('editorial_picks',req.params.id));res.sendStatus(204);}));

router.use(requireAuth);
router.get('/account',route(async(req,res)=>res.json({requests:await rows('account_privacy_requests',{user_id:req.authUser.id}),session:{verified:req.authUser.sessionCheck==='verified',mfaVerified:req.authUser.mfaVerified===true}})));
router.post('/account/logout-all',route(async(req,res)=>{await closeAllAccountSessions(req.authToken,req.authUser.id);res.sendStatus(204);}));
router.post('/account/deletion-request',route(async(req,res)=>{
  if(req.authUser.id===SITE_OWNER_ID)throw httpError(403,'Transfiere la propiedad del sitio antes de solicitar la eliminación de tu cuenta.');
  if(Object.keys(req.body).some(k=>!['confirmation','note'].includes(k))||req.body.confirmation!=='ELIMINAR'||typeof req.body.note!=='string'||req.body.note.length>2000)throw httpError(400,'Escribe ELIMINAR para confirmar la solicitud.');
  if((await rows('account_privacy_requests',{user_id:req.authUser.id})).some(x=>['pending','reviewing'].includes(x.status)))throw httpError(409,'Ya tienes una solicitud pendiente.');
  res.status(201).json({request:await putRow('account_privacy_requests',{user_id:req.authUser.id,note:req.body.note,status:'pending',response:'',updated_at:new Date().toISOString()})});
}));
router.delete('/account/deletion-request/:id',route(async(req,res)=>{
  const item=(await rows('account_privacy_requests',{user_id:req.authUser.id})).find(x=>x.id===req.params.id);
  if(!item)throw httpError(404,'Solicitud no encontrada.');if(!['pending','reviewing'].includes(item.status))throw httpError(409,'La solicitud ya está cerrada.');
  await updatePrivacyRequest(item,{status:'cancelled',updated_at:new Date().toISOString()});res.sendStatus(204);
}));
router.get('/account/export',personalExportLimits,route(async(req,res)=>{
  const data={format:'valoria-personal-data-v1',exportedAt:new Date().toISOString(),account:{id:req.authUser.id,displayName:req.authUser.displayName,email:req.authUser.email},images:'Las imágenes se referencian por enlace; no se incluyen sus archivos.'};
  if(isSupabaseEnabled()){
    let bytes=0;const budget=items=>{bytes+=Buffer.byteLength(JSON.stringify(items));if(bytes>25*1024*1024)throw httpError(413,'Solicita a administración una exportación de mayor tamaño.');};
    const scopes={profiles:'id',profile_roles:'profile_id',user_workspace:'user_id',stories:'author_id',illustration_posts:'author_id',illustration_series:'author_id',story_reviews:'reviewer_id',story_review_likes:'user_id',creator_wall_posts:'author_id',creator_wall_comments:'author_id',creator_wall_comment_likes:'user_id',profile_follows:'follower_id',user_notifications:'recipient_id',illustration_comments:'author_id',illustration_comment_likes:'user_id',illustration_post_likes:'user_id',illustration_saves:'user_id',illustration_fanarts:'contributor_id',chapter_images:'contributor_id',account_privacy_requests:'user_id',work_details:'owner_id'};
    for(const [table,column]of Object.entries(scopes)){
      data[table]=[];
      for(let offset=0;offset<50000;offset+=500){
        const {data:items,error}=await supabaseAdmin.from(table).select('*').eq(column,req.authUser.id).order(table==='user_workspace'?'key':'id').range(offset,offset+499);
        if(error)throw httpError(503,'No se pudo completar la exportación. Reintenta más tarde.');budget(items);data[table].push(...items);if(items.length<500)break;if(offset===49500)throw httpError(413,'Solicita a administración una exportación de mayor tamaño.');
      }
    }
    const {data:support,error:supportError}=await supabaseAdmin.from('support_tickets').select('*').eq('user_id',req.authUser.id).limit(10000);if(supportError)throw httpError(503,'No se pudo completar la exportación.');budget(support);data.support=support;data.supportMessages=[];
    for(const ticket of support){const {data:messages,error}=await supabaseAdmin.from('support_messages').select('*').eq('ticket_id',ticket.id).limit(10000);if(error)throw httpError(503,'No se pudo completar la exportación.');budget(messages);data.supportMessages.push(...messages);}
    // Reports expose only the explanation intended for the reporter, never internal resolution.
    const {data:reports,error}=await supabaseAdmin.from('content_reports').select('id,target_type,target_id,reason,status,reporter_message,appeal,created_at,updated_at').eq('reporter_id',req.authUser.id);if(error)throw httpError(503,'No se pudo completar la exportación.');data.reports=reports;
    data.chapters=[];data.chapterVersions=[];
    for(const story of data.stories){const chapters=await ChapterModel.getByStoryId(story.id,{includeDeleted:true});budget(chapters);data.chapters.push(...chapters);for(const chapter of chapters){const versions=await rows('chapter_versions',{chapter_id:chapter.id});budget(versions);data.chapterVersions.push(...versions);}}
    data.collaborations=[];for(const column of ['sender_id','recipient_id']){const {data:items,error}=await supabaseAdmin.from('collaboration_invites').select('*').eq(column,req.authUser.id).limit(10000);if(error)throw httpError(503,'No se pudo completar la exportación.');budget(items);data.collaborations.push(...items);}data.collaborations=[...new Map(data.collaborations.map(x=>[x.id,x])).values()];
  }else{data.stories=await StoryModel.getByAuthorId(req.authUser.id);data.requests=await rows('account_privacy_requests',{user_id:req.authUser.id});}
  res.setHeader('Content-Disposition','attachment; filename="valoria-mis-datos.json"');res.json(data);
}));
router.get('/privacy/manage',requireAdminMfa,requireSitePermission('owner'),route(async(req,res)=>{const items=await rows('account_privacy_requests');const start=(page(req)-1)*10;res.json({items:items.sort((a,b)=>b.created_at.localeCompare(a.created_at)).slice(start,start+10),total:items.length});}));
router.patch('/privacy/:id',requireAdminMfa,requireSitePermission('owner'),route(async(req,res)=>{
  const b=req.body;if(Object.keys(b).some(k=>!['status','response'].includes(k))||!['reviewing','completed'].includes(b.status)||typeof b.response!=='string'||b.response.trim().length<5||b.response.length>2000)throw httpError(400,'Indica una respuesta y un estado válido.');
  const item=(await rows('account_privacy_requests',{id:req.params.id}))[0];if(!item)throw httpError(404,'Solicitud no encontrada.');if(!['pending','reviewing'].includes(item.status))throw httpError(409,'Solicitud cerrada.');
  await runAdminAction(req.authUser.id,'privacy.request.update',item.id,{status:b.status},()=>updatePrivacyRequest(item,{status:b.status,response:b.response,updated_at:new Date().toISOString()}));res.json({message:'Cambios guardados.'});
}));
router.get('/versions/:story/:chapter',route(async(req,res)=>{
  const story=await ownedWork('story',req.params.story,req.authUser);const chapter=(await ChapterModel.getByStoryId(story.id)).find(x=>x.id===req.params.chapter);if(!chapter)throw httpError(404,'Capítulo no encontrado.');
  const versions=(await rows('chapter_versions',{chapter_id:chapter.id})).reverse();const start=(page(req)-1)*5;res.json({versions:versions.slice(start,start+5),total:versions.length});
}));
router.post('/versions/:story/:chapter/:version/restore',route(async(req,res)=>{
  const story=await ownedWork('story',req.params.story,req.authUser);const chapter=(await ChapterModel.getByStoryId(story.id)).find(x=>x.id===req.params.chapter);if(!chapter)throw httpError(404,'Capítulo no encontrado.');
  if(Object.keys(req.body).some(k=>!['expectedContent','expectedTitle'].includes(k))||typeof req.body.expectedContent!=='string'||typeof req.body.expectedTitle!=='string')throw httpError(400,'Actualiza el capítulo antes de restaurar.');
  if(chapter.content!==req.body.expectedContent||chapter.title!==req.body.expectedTitle)throw httpError(409,'El capítulo cambió. Actualiza antes de restaurar.');
  let restored;
  if(isSupabaseEnabled()){
    const {data,error}=await supabaseAdmin.rpc('restore_chapter_version',{p_actor:req.authUser.id,p_chapter:chapter.id,p_version:req.params.version,p_content:req.body.expectedContent,p_title:req.body.expectedTitle});
    if(error)throw httpError(error.message.includes('version_conflict')||error.message.includes('publication_processing')?409:503,error.message.includes('publication_processing')?'La publicación está en curso. Espera y actualiza el capítulo antes de recuperar una versión.':'No se pudo restaurar. Actualiza el capítulo y comprueba la migración.');restored=data;
  }else{
    const version=(await rows('chapter_versions',{chapter_id:chapter.id})).find(x=>x.id===req.params.version);if(!version)throw httpError(404,'Versión no encontrada.');
    restored=await ChapterModel.update(story.id,chapter.id,{title:version.title,content:version.content,excerpt:version.excerpt,chapterNumber:chapter.chapter_number,status:'draft'});
  }
  // Remote restoration cancels scheduling in the same SQL transaction.
  res.json({chapter:restored,message:'Versión recuperada como borrador.'});
}));
export default router;
