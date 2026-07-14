import express from "express";
import {
  submitContact,
  getAdminMessages,
  markMessageAsRead,
  deleteMessage,
  sendReplyToMessage,
} from "../handlers/contact.js";
import { CheckAuth, isAdmin } from "../middlewares/auth.js";

const router = express.Router();

// Public route
router.post("/", submitContact);

// Admin only routes (with both CheckAuth and isAdmin middleware)
router.get("/admin/messages", CheckAuth, isAdmin, getAdminMessages);
router.put("/admin/messages/:id", CheckAuth, isAdmin, markMessageAsRead);
router.delete("/admin/messages/:id", CheckAuth, isAdmin, deleteMessage);
router.post(
  "/admin/messages/:id/reply",
  CheckAuth,
  isAdmin,
  sendReplyToMessage,
);

export default router;
