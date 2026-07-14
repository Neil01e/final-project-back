import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import productModel from "../models/product.js";
import {
  errorResponse,
  paginatedResponse,
  successResponse,
} from "../utils/responseFormatter.js";
import { logger } from "../utils/logger.js";
import { Types } from "mongoose";
import { AuthenticatedRequest } from "../types/express.js";
import rateModel from "../models/rate.js";
import userModel from "../models/user.js";
import orderModel from "../models/order.js";

function toObjectId(id: string | string[] | undefined): Types.ObjectId {
  if (!id || Array.isArray(id)) throw new Error("Invalid ObjectId");
  return new Types.ObjectId(id);
}

export async function createProduct(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const product = await productModel.create(req.body);
    successResponse(
      res,
      product,
      "Product created successfully",
      StatusCodes.CREATED,
    );
  } catch (error) {
    logger.error("Error creating product:", { error });
    const err = error as Error & { code?: number };
    if (err.code === 11000) {
      errorResponse(res, err, "Product already exists", StatusCodes.CONFLICT);
    } else {
      errorResponse(
        res,
        err,
        "Failed to create product",
        StatusCodes.BAD_REQUEST,
      );
    }
  }
}

export async function getProducts(req: Request, res: Response): Promise<void> {
  try {
    // Parse query parameters with fallbacks
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100); // Max 100 per page
    const page = Math.max(parseInt(req.query.page as string) || 1, 1); // Min page 1
    const sortBy = (req.query.sortBy as string) || "createdAt";
    const sortOrder = (req.query.sortOrder as string) === "asc" ? 1 : -1;

    const search = req.query.search as string;
    const category = req.query.category as string;
    const subcategory = req.query.subcategory as string;
    const brand = req.query.brand as string;
    const platform = req.query.platform as string;
    const genre = req.query.genre as string;
    const minPrice = req.query.minPrice
      ? parseInt(req.query.minPrice as string)
      : undefined;
    const maxPrice = req.query.maxPrice
      ? parseInt(req.query.maxPrice as string)
      : undefined;
    const status = req.query.status as string;
    const availability = req.query.availability as string;

    // Build filter object
    const filter: Record<string, unknown> = {};

    if (search) filter.$text = { $search: search };
    if (category) filter.category = category;
    if (subcategory) filter.subcategory = subcategory;
    if (brand) filter.brand = { $regex: brand, $options: "i" };
    if (platform) filter.platform = { $regex: platform, $options: "i" };
    if (genre) filter.genre = { $regex: genre, $options: "i" };

    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined)
        (filter.price as Record<string, number>).$gte = minPrice;
      if (maxPrice !== undefined)
        (filter.price as Record<string, number>).$lte = maxPrice;
    }

    if (status) filter.status = status;
    if (availability)
      filter.stock = availability === "inStock" ? { $gt: 0 } : 0;

    // Calculate skip
    const skip = (page - 1) * limit;

    logger.info(
      `Fetching products - Page: ${page}, Limit: ${limit}, Skip: ${skip}, SortBy: ${sortBy}, SortOrder: ${sortOrder}`,
    );

    // Fetch products with pagination
    const [products, total] = await Promise.all([
      productModel
        .find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ [sortBy]: sortOrder, _id: 1 })
        .lean(),
      productModel.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    logger.info(
      `Fetched ${products.length} products. Total: ${total}, Pages: ${totalPages}`,
    );

    paginatedResponse(
      res,
      products,
      {
        total,
        page,
        limit,
        totalPages,
      },
      "Products fetched successfully",
    );
  } catch (error) {
    logger.error("Error fetching products:", { error });
    errorResponse(res, error, "Failed to fetch products");
  }
}

export async function getProductById(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const product = await productModel.findById(toObjectId(req.params.id));
    if (!product) {
      errorResponse(res, null, "Product not found", StatusCodes.NOT_FOUND);
      return;
    }
    successResponse(res, product, "Product fetched successfully");
  } catch (error) {
    logger.error("Error fetching product:", { error });
    errorResponse(res, error, `Failed to fetch product ${req.params.id}`);
  }
}

export async function updateProduct(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const product = await productModel.findByIdAndUpdate(
      toObjectId(req.params.id),
      { $set: req.body },
      { new: true },
    );
    if (!product) {
      errorResponse(res, null, "Product not found", StatusCodes.NOT_FOUND);
      return;
    }
    successResponse(res, product, "Product updated successfully");
  } catch (error) {
    logger.error("Error updating product:", { error });
    errorResponse(res, error, `Failed to update product ${req.params.id}`);
  }
}

export async function deleteProduct(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const activeOrders = await orderModel.countDocuments({
      "products.productId": toObjectId(req.params.id),
      status: { $in: ["pending", "processing"] },
    });
    if (activeOrders > 0) {
      errorResponse(
        res,
        null,
        `Cannot delete product with ${activeOrders} active order(s)`,
        StatusCodes.BAD_REQUEST,
      );
      return;
    }
    const product = await productModel.findByIdAndDelete(
      toObjectId(req.params.id),
    );
    if (!product) {
      errorResponse(res, null, "Product not found", StatusCodes.NOT_FOUND);
      return;
    }
    successResponse(res, null, "Product deleted successfully");
  } catch (error) {
    logger.error("Error deleting product:", { error });
    errorResponse(res, error, `Failed to delete product ${req.params.id}`);
  }
}

export async function getProductRatings(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const ratings = await rateModel
      .find({ productId: toObjectId(req.params.id) })
      .populate("ratedBy", "firstName lastName avatar")
      .sort({ createdAt: -1 });
    successResponse(res, ratings, "Ratings fetched successfully");
  } catch (error) {
    logger.error("Error fetching product ratings:", { error });
    errorResponse(res, error, "Failed to fetch ratings");
  }
}

export async function addProductRating(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id: productId } = req.params;
    const { rating } = req.body;
    const userId = authReq.user._id;

    const hasPurchased = await orderModel.exists({
      userId: userId,
      "products.productId": toObjectId(productId),
      status: { $in: ["completed", "delivered"] },
    });

    if (!hasPurchased) {
      errorResponse(
        res,
        null,
        "You can only rate products that you have purchased",
        StatusCodes.FORBIDDEN,
      );
      return;
    }

    const existingRating = await rateModel.findOne({
      ratedBy: userId,
      productId: toObjectId(productId),
    });
    let ratingDoc;
    if (existingRating) {
      ratingDoc = await rateModel.findByIdAndUpdate(
        existingRating._id,
        { $set: { rating } },
        { new: true },
      );
    } else {
      ratingDoc = await rateModel.create({
        ratedBy: userId,
        productId: toObjectId(productId),
        rating,
      });
    }

    const allRatings = await rateModel.find({
      productId: toObjectId(productId),
    });
    const avgRating =
      allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length;
    await productModel.findByIdAndUpdate(productId, {
      $set: {
        avgRating: Math.round(avgRating * 10) / 10,
        ratingCount: allRatings.length,
      },
    });

    successResponse(
      res,
      ratingDoc,
      existingRating ? "Rating updated" : "Rating added",
    );
  } catch (error) {
    logger.error("Error adding product rating:", { error });
    const err = error as Error & { code?: number };
    if (err.code === 11000) {
      errorResponse(
        res,
        err,
        "You have already rated this product",
        StatusCodes.CONFLICT,
      );
    } else {
      errorResponse(res, err, "Failed to add rating");
    }
  }
}

export async function deleteProductRating(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id: productId, ratingId } = req.params;
    const userId = authReq.user._id;

    const rating = await rateModel.findById(ratingId);
    if (!rating) {
      errorResponse(res, null, "Rating not found", StatusCodes.NOT_FOUND);
      return;
    }
    if (
      rating.ratedBy.toString() !== userId.toString() &&
      (authReq.user as { role?: string }).role !== "admin"
    ) {
      errorResponse(
        res,
        null,
        "You can only delete your own ratings",
        StatusCodes.FORBIDDEN,
      );
      return;
    }
    await rating.deleteOne();

    const remainingRatings = await rateModel.find({
      productId: toObjectId(productId),
    });
    const avgRating =
      remainingRatings.length > 0
        ? remainingRatings.reduce((sum, r) => sum + r.rating, 0) /
          remainingRatings.length
        : 0;
    await productModel.findByIdAndUpdate(productId, {
      $set: {
        avgRating: Math.round(avgRating * 10) / 10,
        ratingCount: remainingRatings.length,
      },
    });

    successResponse(res, null, "Rating deleted successfully");
  } catch (error) {
    logger.error("Error deleting product rating:", { error });
    errorResponse(res, error, "Failed to delete rating");
  }
}

export async function getRecommendations(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user._id;
    const limit = parseInt(req.query.limit as string) || 10;

    const user = await userModel.findById(userId).select("products");
    const favoriteIds = user?.products?.favorites || [];
    const purchasedIds = user?.products?.purchased || [];

    const userProducts = await productModel
      .find({ _id: { $in: [...favoriteIds, ...purchasedIds] } })
      .select("category brand");
    const categories = [
      ...new Set(userProducts.map((p) => p.category).filter(Boolean)),
    ];
    const brands = [
      ...new Set(userProducts.map((p) => p.brand).filter(Boolean)),
    ];

    const recommendations = await productModel
      .find({
        _id: { $nin: [...favoriteIds, ...purchasedIds] },
        $or: [{ category: { $in: categories } }, { brand: { $in: brands } }],
        status: "active",
        stock: { $gt: 0 },
      })
      .sort({ avgRating: -1, ratingCount: -1 })
      .limit(limit);

    successResponse(
      res,
      recommendations,
      "Recommendations fetched successfully",
    );
  } catch (error) {
    logger.error("Error fetching recommendations:", { error });
    errorResponse(res, error, "Failed to fetch recommendations");
  }
}

export async function getPopularProducts(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const products = await productModel
      .find({ status: "active" })
      .sort({ ratingCount: -1, avgRating: -1 })
      .limit(limit);
    successResponse(res, products, "Popular products fetched successfully");
  } catch (error) {
    logger.error("Error fetching popular products:", { error });
    errorResponse(res, error, "Failed to fetch popular products");
  }
}

export async function getNewArrivals(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const products = await productModel
      .find({ status: "active" })
      .sort({ createdAt: -1 })
      .limit(limit);
    successResponse(res, products, "New arrivals fetched successfully");
  } catch (error) {
    logger.error("Error fetching new arrivals:", { error });
    errorResponse(res, error, "Failed to fetch new arrivals");
  }
}

export async function getComingSoon(req: Request, res: Response): Promise<void> {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const products = await productModel
      .find({ stock: 0 }) 
      .sort({ createdAt: -1 })
      .limit(limit);
    successResponse(res, products, "Coming soon products fetched successfully");
  } catch (error) {
    logger.error("Error fetching coming soon products:", { error });
    errorResponse(res, error, "Failed to fetch coming soon products");
  }
}

export async function getMostSold(req: Request, res: Response): Promise<void> {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const products = await productModel
      .find({ status: "active" })
      .sort({ salesCount: -1 })
      .limit(limit);
    successResponse(res, products, "Most sold products fetched successfully");
  } catch (error) {
    logger.error("Error fetching most sold products:", { error });
    errorResponse(res, error, "Failed to fetch most sold products");
  }
}

export async function getMostLiked(req: Request, res: Response): Promise<void> {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const products = await productModel
      .find({ status: "active" })
      .sort({ avgRating: -1 })
      .limit(limit);
    successResponse(res, products, "Most liked products fetched successfully");
  } catch (error) {
    logger.error("Error fetching most liked products:", { error });
    errorResponse(res, error, "Failed to fetch most liked products");
  }
}
