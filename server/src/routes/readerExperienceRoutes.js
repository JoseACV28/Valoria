import {Router} from 'express';
import {requireAuth} from '../middlewares/authMiddleware.js';
import {visibleWork} from '../models/experienceModel.js';
import {listWorkspaceRows,saveWorkspaceRow} from '../models/workspaceModel.js';
import {httpError} from '../utils/contentAccess.js';
const router=Router();const route=fn=>async(req,res,next)=>{try{await fn(req,res);}catch(error){next(error);}};
router.use(requireAuth);
router.get('/story-following',route(async(req,res)=>{
 const items=(await listWorkspaceRows(req.authUser.id,'preferences')).filter(x=>x.key.startsWith('story-follow:')&&x.data?.following===true);
 res.json({items:items.map(x=>({storyId:x.key.slice(13),title:x.data.title||'',muted:x.data.muted===true}))});
}));
router.get('/story-following/:id',route(async(req,res)=>{
 const work=await visibleWork('story',req.params.id,req.authUser);const preference=(await listWorkspaceRows(req.authUser.id,'preferences',`story-follow:${work.id}`))[0];
 res.json({following:preference?.data?.following===true,muted:preference?.data?.muted===true});
}));
router.put('/story-following/:id',route(async(req,res)=>{
 const {following,muted}=req.body;
 if(!/^[0-9a-f-]{36}$/i.test(req.params.id)||Object.keys(req.body).some(k=>!['following','muted'].includes(k))||typeof following!=='boolean'||typeof muted!=='boolean'||(!following&&muted))throw httpError(400,'Revisa las opciones de seguimiento.');
 const previous=(await listWorkspaceRows(req.authUser.id,'preferences',`story-follow:${req.params.id}`))[0];
 // Opting out never grants access and must remain possible after a work becomes private.
 const work=following?await visibleWork('story',req.params.id,req.authUser):null;
 await saveWorkspaceRow(req.authUser.id,'preferences',`story-follow:${req.params.id}`,{following,muted,title:work?.title||previous?.data?.title||''});res.json({following,muted});
}));
export default router;
