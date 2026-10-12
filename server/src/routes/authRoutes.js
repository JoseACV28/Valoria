// Router agrupado de autenticacion.
import { Router } from "express";
import {
  getCurrentUser,
  login,
  register
} from "../controllers/authController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";
import { AuthModel } from '../models/authModel.js';
import {changeAccountPassword,closeAllAccountSessions} from '../models/passwordModel.js';
import {passwordChangeLimits} from '../middlewares/requestLimits.js';

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", requireAuth, getCurrentUser);
router.post('/change-password',requireAuth,passwordChangeLimits,async(req,res,next)=>{try{res.json(await changeAccountPassword(req.authToken,req.authUser,req.body));}catch(error){next(error);}});
router.post('/logout-all',requireAuth,async(req,res,next)=>{try{await closeAllAccountSessions(req.authToken,req.authUser.id);res.sendStatus(204);}catch(error){next(error);}});
router.post('/logout', requireAuth, async (req, res, next) => {
  try { await AuthModel.logout(req.authToken, req.authUser.id); res.sendStatus(204); }
  catch (error) { next(error); }
});

export default router;
