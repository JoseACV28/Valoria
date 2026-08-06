// Router agrupado de autenticacion.
import { Router } from "express";
import {
  getCurrentUser,
  login,
  register
} from "../controllers/authController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", requireAuth, getCurrentUser);

export default router;
