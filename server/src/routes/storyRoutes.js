// Router agrupado de historias, capitulos y reseñas relacionadas.
import { Router } from "express";
import {
  createStory,
  deleteStory,
  getMyStories,
  registerStoryRead,
  getStories,
  getStoryById,
  updateStory
} from "../controllers/storyController.js";
import {
  addChapterIllustration,
  createChapter,
  deleteChapter,
  getStoryChapters,
  updateChapter
} from "../controllers/chapterController.js";
import {
  createStoryReview,
  createStoryReviewReply,
  getStoryReviews,
  likeStoryReview
} from "../controllers/reviewController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";

const router = Router();

router.get("/", getStories);
router.get("/mine/list", requireAuth, getMyStories);
router.post("/", requireAuth, createStory);
router.patch("/:storyId", requireAuth, updateStory);
router.delete("/:storyId", requireAuth, deleteStory);
router.post("/:storyId/read", registerStoryRead);
router.get("/:storyId/chapters", getStoryChapters);
router.post("/:storyId/chapters", requireAuth, createChapter);
router.put("/:storyId/chapters/:chapterId", requireAuth, updateChapter);
router.delete("/:storyId/chapters/:chapterId", requireAuth, deleteChapter);
router.post(
  "/:storyId/chapters/:chapterId/illustrations",
  requireAuth,
  addChapterIllustration
);
router.get("/:storyId/reviews", getStoryReviews);
router.post("/:storyId/reviews", requireAuth, createStoryReview);
router.post("/:storyId/reviews/:reviewId/reply", requireAuth, createStoryReviewReply);
router.post("/:storyId/reviews/:reviewId/like", requireAuth, likeStoryReview);
router.get("/:identifier", getStoryById);

export default router;
