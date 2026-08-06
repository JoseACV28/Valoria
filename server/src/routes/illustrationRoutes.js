// Router de la vertical de ilustraciones.
import { Router } from "express";
import {
  createIllustrationComment,
  createIllustration,
  createIllustrationFanart,
  deleteIllustration,
  getIllustrationComments,
  getIllustrationById,
  getIllustrationFanarts,
  getIllustrations,
  getMyIllustrations,
  likeIllustration,
  likeIllustrationComment,
  updateIllustration
} from "../controllers/illustrationController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";

const router = Router();

router.get("/", getIllustrations);
router.get("/mine/list", requireAuth, getMyIllustrations);
router.post("/", requireAuth, createIllustration);
router.get("/:identifier/comments", getIllustrationComments);
router.post("/:identifier/comments", requireAuth, createIllustrationComment);
router.get("/:identifier/fanarts", getIllustrationFanarts);
router.post("/:identifier/fanarts", requireAuth, createIllustrationFanart);
router.post("/:identifier/like", requireAuth, likeIllustration);
router.post(
  "/:identifier/comments/:commentId/like",
  requireAuth,
  likeIllustrationComment
);
router.patch("/:illustrationId", requireAuth, updateIllustration);
router.delete("/:illustrationId", requireAuth, deleteIllustration);
router.get("/:identifier", getIllustrationById);

export default router;
