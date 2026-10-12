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
let activeUploads=0;
router.use(requireAuth,(req,res,next)=>{
  if(activeUploads>=4)return res.status(429).json({message:'Hay varias imágenes procesándose. Reintenta en unos segundos.'});
  activeUploads++;let released=false;const release=()=>{if(!released){released=true;activeUploads--;}};
  res.once('finish',release);res.once('close',release);next();
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024,
    files: 1,
    fields: 5,
    fieldSize: 4000,
    parts: 6
  },
  fileFilter(request, file, callback) {
    if (!["image/png","image/jpeg","image/jpg","image/gif","image/webp"].includes(file.mimetype)) {
      callback(Object.assign(new Error("Solo se permiten PNG, JPG, GIF y WebP"),{status:400}));
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
