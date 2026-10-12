import {Router} from 'express';
import {requireAuth} from '../middlewares/authMiddleware.js';
import {getSiteAccess,requireSitePermission,runAdminAction} from '../models/siteAdministration.js';
import {requireAdminMfa} from '../utils/sessionSecurity.js';
import {documentData,saveDocuments,listLaunch,createTicket,addSupportMessage,ticketStatus} from '../models/launchModel.js';
const router=Router(),route=fn=>async(req,res,next)=>{try{await fn(req,res);}catch(e){next(e);}};
router.get('/documents',route(async(req,res)=>res.json({documents:await documentData()})));
router.put('/documents',requireAuth,requireAdminMfa,requireSitePermission('owner'),route(async(req,res)=>{await runAdminAction(req.authUser.id,'documents.update','public-documents',{},()=>saveDocuments(req.body));res.json({message:'Cambios guardados.'});}));
router.use(requireAuth);
router.get('/support',route(async(req,res)=>res.json({tickets:await listLaunch('support_tickets',{user_id:req.authUser.id})})));
router.post('/support',route(async(req,res)=>res.status(201).json({ticket:await createTicket(req.authUser.id,req.body)})));
router.get('/support/manage',requireAdminMfa,requireSitePermission('support'),route(async(req,res)=>res.json({tickets:await listLaunch('support_tickets')})));
router.get('/support/:id',route(async(req,res)=>{
 const ticket=(await listLaunch('support_tickets',{id:req.params.id}))[0];if(!ticket)return res.status(404).json({message:'Solicitud no encontrada.'});
 if(ticket.user_id!==req.authUser.id){const access=await getSiteAccess(req.authUser.id);if(!access.isOwner&&!access.permissions.includes('support'))return res.status(404).json({message:'Solicitud no encontrada.'});requireAdminMfa(req,res,()=>{});if(res.headersSent)return;}
 res.json({ticket,messages:(await listLaunch('support_messages',{ticket_id:ticket.id})).reverse()});
}));
router.post('/support/:id/messages',route(async(req,res)=>{
 const ticket=(await listLaunch('support_tickets',{id:req.params.id}))[0];if(!ticket)return res.status(404).json({message:'Solicitud no encontrada.'});
 let staff=false;if(ticket.user_id!==req.authUser.id){const access=await getSiteAccess(req.authUser.id);if(!access.isOwner&&!access.permissions.includes('support'))return res.status(404).json({message:'Solicitud no encontrada.'});requireAdminMfa(req,res,()=>{});if(res.headersSent)return;staff=true;}
 if(Object.keys(req.body).some(k=>k!=='content'))return res.status(400).json({message:'Mensaje inválido.'});if(ticket.status==='closed')return res.status(409).json({message:'Solicitud cerrada.'});
 res.status(201).json({message:await addSupportMessage(ticket.id,req.authUser.id,staff,req.body.content)});
}));
router.patch('/support/:id',requireAdminMfa,requireSitePermission('support'),route(async(req,res)=>{if(Object.keys(req.body).some(k=>k!=='status'))return res.status(400).json({message:'Campo inválido.'});const ticket=(await listLaunch('support_tickets',{id:req.params.id}))[0];if(!ticket)return res.status(404).json({message:'Solicitud no encontrada.'});await runAdminAction(req.authUser.id,'support.status',ticket.id,{status:req.body.status},()=>ticketStatus(ticket.id,req.body.status));res.json({message:'Cambios guardados.'});}));
router.get('/alerts',requireAdminMfa,requireSitePermission('owner'),route(async(req,res)=>res.json({alerts:await listLaunch('operational_alerts'),externalConfigured:Boolean(process.env.OPERATIONS_WEBHOOK_URL),externalDelivery:'Se activa únicamente desde el servidor; sin credenciales expuestas.'})));
export default router;

