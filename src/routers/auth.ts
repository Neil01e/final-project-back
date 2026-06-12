import { Router } from "express";
import { checkUser, login, register, changePassword } from "../handlers/auth.js";
import { validateBodySchema } from "../middlewares/validation.js";
import { loginSchema, userSchema, changePasswordSchema } from "../validation/user.js";
import { CheckAuth } from "../middlewares/auth.js";
import { authLimiter } from "../middlewares/rateLimit.js";

const authRouter = Router();

// Public routes with strict rate limiting
authRouter.post("/login", authLimiter, validateBodySchema(loginSchema), login);
authRouter.post("/register", validateBodySchema(userSchema), register);

// Protected routes
authRouter.get("/check", CheckAuth, checkUser);
authRouter.post(
  "/change-password",
  CheckAuth,
  validateBodySchema(changePasswordSchema),
  changePassword
);

export default authRouter;