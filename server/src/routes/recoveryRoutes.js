import { Router } from 'express';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { getTrash, restoreFromTrash, RECOVERY_DAYS } from '../models/contentRecovery.js';
import { StoryModel } from '../models/storyModel.js';
import { ChapterModel } from '../models/chapterModel.js';
const router = Router(); router.use(requireAuth);
router.get('/', async (req,res,next) => { try { res.json({ items: await getTrash(req.authUser.id), recoveryDays: RECOVERY_DAYS }); } catch(e) { next(e); } });
router.post('/:type/:id/restore', async (req,res,next) => { try { await restoreFromTrash(req.params.type,req.params.id,req.authUser.id); res.json({ message: 'Contenido recuperado como borrador. Revísalo antes de publicar.' }); } catch(e) { next(e); } });
router.get('/export/:id', async (req,res,next) => {
  try {
    const story = await StoryModel.getByIdOrSlug(req.params.id);
    if (!story || story.authorId !== req.authUser.id) return res.status(403).json({ message: 'Solo puedes exportar tus propias obras.' });
    const chapters = await ChapterModel.getByStoryId(story.id);
    res.json({ format: 'valoria-story-v1', exportedAt: new Date().toISOString(), story, chapters });
  } catch(e) { next(e); }
});
export default router;
