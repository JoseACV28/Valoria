// Router de notificaciones del usuario autenticado.
import { Router } from "express";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from "../controllers/notificationController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";

const router = Router();

router.get("/", requireAuth, getNotifications);
router.post("/read-all", requireAuth, markAllNotificationsRead);
router.post("/:notificationId/read", requireAuth, markNotificationRead);

export default router;
