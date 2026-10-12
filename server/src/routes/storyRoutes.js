import { StoryModel } from "../models/storyModel.js";
import { ChapterModel } from "../models/chapterModel.js";
import { isSupabaseEnabled, supabaseAdmin } from "../config/supabase.js";
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
router.get('/:storyId/stats',requireAuth,async(req,res,next)=>{try{
  const story=await StoryModel.getByIdOrSlug(req.params.storyId);
  if(story?.authorId!==req.authUser.id)return res.status(403).json({message:'Estadísticas privadas del autor.'});
  const chapters=await ChapterModel.getByStoryId(story.id);
  let entries=[];
  if(isSupabaseEnabled()){const result=await supabaseAdmin.from('user_workspace').select('user_id,data').neq('user_id',req.authUser.id).eq('namespace','library').eq('key',story.id);if(result.error)throw result.error;entries=result.data;}
  const first=entries.filter(x=>x.data.chaptersVisited?.includes(chapters[0]?.id)).length;
  const days=Array.from({length:30},(_,index)=>new Date(Date.now()-(29-index)*86400000).toISOString().slice(0,10));
  const daily=days.map(day=>({day,readers:entries.filter(x=>x.data.readDays?.includes(day)).length,newReaders:entries.filter(x=>x.data.firstReadAt?.slice(0,10)===day).length}));
  res.json({visits:Number(story.reads_count||0),readers:entries.length,reviews:Number(story.ratingCount||0),daily,chapters:chapters.map(chapter=>{const readers=entries.filter(x=>x.data.chaptersVisited?.includes(chapter.id)).length;return {id:chapter.id,title:chapter.title,readers,lastVisited:entries.filter(x=>x.data.chapterId===chapter.id).length,retention:first?Math.round(entries.filter(x=>x.data.chaptersVisited?.includes(chapters[0]?.id)&&x.data.chaptersVisited?.includes(chapter.id)).length/first*100):0};})});
}catch(error){next(error);}});
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
