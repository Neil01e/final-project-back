import { Router } from "express";
import {
  validateBodySchema,
  validateParamsSchema,
  validateQuerySchema,
} from "../middlewares/validation.js";
import { productQuerySchema, productRatingParamsSchema, productSchema } from "../validation/product.js";
import {
  addProductRating,
  createProduct,
  deleteProduct,
  deleteProductRating,
  getProductById,
  getProducts,
  getNewArrivals,
  getPopularProducts,
  getRecommendations,
  updateProduct,
  getProductRatings,
  getMostSold,
  getMostLiked,
  getComingSoon,
} from "../handlers/product.js";
import { CheckAuth, isAdmin } from "../middlewares/auth.js";
import { idParamsSchema } from "../validation/utils.js";
import { ratingSchema } from "../validation/rate.js";

const productRouter = Router();

// Public endpoints
productRouter.get("/", validateQuerySchema(productQuerySchema), getProducts);
productRouter.get("/popular", getPopularProducts);
productRouter.get("/new", getNewArrivals);
productRouter.get("/most-sold", getMostSold);
productRouter.get("/most-liked", getMostLiked);
productRouter.get("/coming-soon", getComingSoon);
productRouter.get("/recommendations", CheckAuth, getRecommendations);
productRouter.get("/:id", validateParamsSchema(idParamsSchema), getProductById);
productRouter.get("/:id/ratings", validateParamsSchema(idParamsSchema), getProductRatings);

// Protected endpoints
productRouter.post("/:id/ratings", CheckAuth, validateParamsSchema(idParamsSchema), validateBodySchema(ratingSchema), addProductRating);
productRouter.delete("/:id/ratings/:ratingId", CheckAuth, validateParamsSchema(productRatingParamsSchema), deleteProductRating);
productRouter.post("/", CheckAuth, isAdmin, validateBodySchema(productSchema), createProduct);
productRouter.put("/:id", CheckAuth, isAdmin, validateParamsSchema(idParamsSchema), updateProduct);
productRouter.delete("/:id", CheckAuth, isAdmin, validateParamsSchema(idParamsSchema), deleteProduct);

export default productRouter;