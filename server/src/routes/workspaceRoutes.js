import { Router } from "express";
import { requireAuth } from "../middlewares/authMiddleware.js";
const router = Router();
import {listWorkspaceRows,saveWorkspaceRow,deleteWorkspaceRow} from '../models/workspaceModel.js';
const namespaces = new Set(['drafts','library','notes','preferences','collections','blocks']);
router.use(requireAuth);
router.use('/:namespace', (req,res,next) => namespaces.has(req.params.namespace) ? next() : res.status(400).json({message:'Tipo de datos inválido'}));
router.get('/:namespace', async(req,res,next)=> {
  try {
    const data=await listWorkspaceRows(req.authUser.id,req.params.namespace);
    res.json({items:data});
  } catch(error) {next(error);}
});
router.put('/:namespace/:key', async(req,res,next)=> {
  try {
    if(req.params.key.length>180 || JSON.stringify(req.body).length>600000) return res.status(400).json({message:'El contenido supera el límite permitido'});
    const item=await saveWorkspaceRow(req.authUser.id,req.params.namespace,req.params.key,req.body);
    res.json({item});
  } catch(error) {next(error);}
});
router.delete('/:namespace/:key',async(req,res,next)=> {
  try {
    await deleteWorkspaceRow(req.authUser.id,req.params.namespace,req.params.key);
    res.sendStatus(204);
  } catch(error) {next(error);}
});
export default router;
