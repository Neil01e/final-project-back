import { z } from "zod";
import { mongoIdSchema } from "./utils.js";

export const productSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required"),
  category: z.enum(["game", "console", "pc", "accessory", "collectible", "giftcard"]),
  subcategory: z.string().optional(),
  type: z.enum(["video", "society"]).optional(),
  price: z.number().min(0, "Price must be positive"),
  stock: z.number().min(0, "Stock must be positive integer").default(0),
  description: z.string().min(10, "Description must be at least 10 characters long"),
  coverImage: z.string().url().optional(),
  images: z.array(z.string().url()).optional(),
  brand: z.string().optional(),
  platform: z.array(z.string()).optional(),
  publisher: z.string().optional(),
  releaseYear: z.number().min(1900).max(new Date().getFullYear()).optional(),
  categoryId: mongoIdSchema.optional(),
});

export const productQuerySchema = z.object({
  page: z.string().default("1").transform(Number).pipe(z.number().int().min(1)),
  limit: z.string().default("10").transform(Number).pipe(z.number().int().min(1).max(100)),
  sortBy: z.enum(["createdAt", "title", "price", "avgRating", "ratingCount"]).optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc").transform((val) => val === "asc" ? 1 : -1),
  search: z.string().optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  brand: z.string().optional(),
  platform: z.string().optional(),
  genre: z.string().optional(),               // <-- ADDED
  minPrice: z.string().transform(Number).pipe(z.number().min(0)).optional(),
  maxPrice: z.string().transform(Number).pipe(z.number().min(0)).optional(),
  status: z.enum(["active", "out-of-stock"]).optional(),
  availability: z.enum(["inStock", "outOfStock"]).optional(),
});

export const productRatingParamsSchema = z.object({
  id: mongoIdSchema,
  ratingId: mongoIdSchema,
});