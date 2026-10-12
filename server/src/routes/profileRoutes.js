import { profileBlocks } from "../middlewares/profileBlocks.js";
// Router del perfil y muro del creador.
import { Router } from "express";
import {
  followProfile,
  getFollowingProfiles,
  getProfile,
  updateProfile,
  unfollowProfile
} from "../controllers/profileController.js";
import {
  createCreatorPost,
  createWallComment,
  deleteCreatorPost,
  deleteWallComment,
  getCommunityFeed,
  getCreatorWall,
  likeWallComment,
  updateCreatorPost,
  updateWallComment
} from "../controllers/wallController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";

const router = Router();

router.get("/community/feed", getCommunityFeed);
router.use("/:profileId",profileBlocks);
router.get("/:profileId", getProfile);
router.patch("/:profileId", requireAuth, updateProfile);
router.get("/:profileId/following", getFollowingProfiles);
router.post("/:profileId/follow", requireAuth, followProfile);
router.delete("/:profileId/follow", requireAuth, unfollowProfile);
router.get("/:profileId/wall", getCreatorWall);
router.post("/:profileId/wall/posts", requireAuth, createCreatorPost);
router.patch("/:profileId/wall/posts/:postId", requireAuth, updateCreatorPost);
router.delete("/:profileId/wall/posts/:postId", requireAuth, deleteCreatorPost);
router.post("/:profileId/wall/posts/:postId/comments", requireAuth, createWallComment);
router.patch("/:profileId/wall/comments/:commentId", requireAuth, updateWallComment);
router.delete("/:profileId/wall/comments/:commentId", requireAuth, deleteWallComment);
router.post("/:profileId/wall/comments/:commentId/like", requireAuth, likeWallComment);

export default router;
