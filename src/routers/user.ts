import { Router } from "express";
import {
  getProfile,
  updateProfile,
  addToWishlist,
  removeFromWishlist,
  getWishlist,
  getUserStats,
  updateAvatar,
  removeAvatar,
  changeEmail,
  deleteAccount,
  getSettings,
  updateSettings,
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
} from "../handlers/user.js";
import { CheckAuth } from "../middlewares/auth.js";
import { profileLimiter } from "../middlewares/rateLimit.js";
import {
  validateBodySchema,
  validateParamsSchema,
} from "../middlewares/validation.js";
import {
  profileUpdateSchema,
  settingsSchema,
  changeEmailSchema,
  deleteAccountSchema,
} from "../validation/user.js";
import { idParamsSchema } from "../validation/utils.js";
import { upload } from "../middlewares/upload.js";

const userRouter = Router();

// All routes require authentication
userRouter.use(CheckAuth);

// Profile
userRouter.get("/profile", getProfile);
userRouter.put(
  "/profile",
  profileLimiter,
  validateBodySchema(profileUpdateSchema),
  updateProfile,
);
userRouter.get("/stats", getUserStats);

// Cart
userRouter.get("/cart", getCart);
userRouter.post("/cart", addToCart);
userRouter.put("/cart", updateCartItem);
userRouter.delete("/cart/:productId", removeFromCart);
userRouter.delete("/cart", clearCart);

// Wishlist
userRouter.get("/wishlist", getWishlist);
userRouter.post(
  "/wishlist/:id",
  validateParamsSchema(idParamsSchema),
  addToWishlist,
);
userRouter.delete(
  "/wishlist/:id",
  validateParamsSchema(idParamsSchema),
  removeFromWishlist,
);

// Avatar
userRouter.post("/avatar", upload.single("avatar"), updateAvatar);
userRouter.delete("/avatar", removeAvatar);

// Settings & Account
userRouter.get("/settings", getSettings);
userRouter.put("/settings", validateBodySchema(settingsSchema), updateSettings);
userRouter.put("/email", validateBodySchema(changeEmailSchema), changeEmail);
userRouter.delete(
  "/account",
  validateBodySchema(deleteAccountSchema),
  deleteAccount,
);

export default userRouter;
