// Router de uploads multipart para portadas e imagenes de capitulos.
import { Router } from "express";
import multer from "multer";
import {
  uploadProfileAvatar,
  uploadProfileCover,
  uploadChapterImage,
  uploadStoryCover,
  uploadIllustrationCover,
  uploadIllustrationImage
} from "../controllers/uploadController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024
  },
  fileFilter(request, file, callback) {
    if (!file.mimetype.startsWith("image/")) {
      callback(new Error("Solo se permiten imagenes"));
      return;
    }

    callback(null, true);
  }
});

router.post("/story-cover", requireAuth, upload.single("image"), uploadStoryCover);
router.post("/chapter-image", requireAuth, upload.single("image"), uploadChapterImage);
router.post("/profile-avatar", requireAuth, upload.single("image"), uploadProfileAvatar);
router.post("/profile-cover", requireAuth, upload.single("image"), uploadProfileCover);
router.post(
  "/illustration-cover",
  requireAuth,
  upload.single("image"),
  uploadIllustrationCover
);
router.post(
  "/illustration-image",
  requireAuth,
  upload.single("image"),
  uploadIllustrationImage
);

export default router;
