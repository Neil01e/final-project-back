import { Router } from "express";
import {
  createCategory,
  deleteCategory,
  getCategories,
  getCategoryById,
  updateCategory,
} from "../handlers/category.js";
import {
  validateBodySchema,
  validateParamsSchema,
} from "../middlewares/validation.js";
import { idParamsSchema } from "../validation/utils.js";
import { CheckAuth, isAdmin } from "../middlewares/auth.js";
import { categorySchema } from "../validation/categories.js";

const categoryRouter = Router();

// Public routes
categoryRouter.get("/", getCategories);
categoryRouter.get(
  "/:id",
  validateParamsSchema(idParamsSchema),
  getCategoryById,
);

// Admin routes
categoryRouter.post(
  "/",
  CheckAuth,
  isAdmin,
  validateBodySchema(categorySchema),
  createCategory,
);

categoryRouter.put(
  "/:id",
  CheckAuth,
  isAdmin,
  validateParamsSchema(idParamsSchema),
  validateBodySchema(categorySchema),
  updateCategory,
);

categoryRouter.delete(
  "/:id",
  CheckAuth,
  isAdmin,
  validateParamsSchema(idParamsSchema),
  deleteCategory,
);

export default categoryRouter;
