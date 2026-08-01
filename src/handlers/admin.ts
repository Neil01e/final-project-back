import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import userModel from "../models/user.js";
import productModel from "../models/product.js";
import orderModel from "../models/order.js";
import categoryModel from "../models/category.js";
import rateModel from "../models/rate.js";
import { logger } from "../utils/logger.js";
import { successResponse, errorResponse } from "../utils/responseFormatter.js";

interface DashboardStats {
  users: { total: number; admins: number; active: number; newThisMonth: number };
  products: { total: number; active: number; outOfStock: number; categories: number };
  orders: { total: number; pending: number; completed: number; cancelled: number; revenue: number; revenueThisMonth: number };
  ratings: { total: number; average: number };
}

export async function getDashboardStats(_req: Request, res: Response): Promise<void> {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const [
      totalUsers, adminUsers, activeUsers, newUsersThisMonth,
      totalProducts, activeProducts, outOfStockProducts, totalCategories,
      totalOrders, pendingOrders, completedOrders, cancelledOrders,
      revenueAgg, revenueThisMonthAgg,
      totalRatings, avgRatingAgg,
    ] = await Promise.all([
      userModel.countDocuments(),
      userModel.countDocuments({ role: "admin" }),
      userModel.countDocuments({ isActive: true }),
      userModel.countDocuments({ createdAt: { $gte: startOfMonth } }),
      productModel.countDocuments(),
      productModel.countDocuments({ status: "active" }),
      productModel.countDocuments({ stock: 0 }),
      categoryModel.countDocuments(),
      orderModel.countDocuments(),
      orderModel.countDocuments({ status: "pending" }),
      orderModel.countDocuments({ status: "completed" }),
      orderModel.countDocuments({ status: "cancelled" }),
      orderModel.aggregate([{ $match: { paymentStatus: "paid" } }, { $group: { _id: null, total: { $sum: "$totalPrice" } } }]),
      orderModel.aggregate([{ $match: { paymentStatus: "paid", createdAt: { $gte: startOfMonth } } }, { $group: { _id: null, total: { $sum: "$totalPrice" } } }]),
      rateModel.countDocuments(),
      rateModel.aggregate([{ $group: { _id: null, avg: { $avg: "$rating" } } }]),
    ]);
    const stats: DashboardStats = {
      users: { total: totalUsers, admins: adminUsers, active: activeUsers, newThisMonth: newUsersThisMonth },
      products: { total: totalProducts, active: activeProducts, outOfStock: outOfStockProducts, categories: totalCategories },
      orders: { total: totalOrders, pending: pendingOrders, completed: completedOrders, cancelled: cancelledOrders, revenue: revenueAgg[0]?.total || 0, revenueThisMonth: revenueThisMonthAgg[0]?.total || 0 },
      ratings: { total: totalRatings, average: avgRatingAgg[0]?.avg ? Math.round(avgRatingAgg[0].avg * 10) / 10 : 0 },
    };
    res.status(StatusCodes.OK).json({ success: true, message: "Dashboard statistics fetched successfully", data: stats });
  } catch (error) {
    logger.error("Error fetching dashboard stats:", { error });
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Failed to fetch dashboard statistics", error: error instanceof Error ? error.message : String(error) });
  }
}

export async function getRecentActivity(req: Request, res: Response): Promise<void> {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const [recentOrders, recentUsers, recentRatings] = await Promise.all([
      orderModel.find().populate("userId", "firstName lastName email").sort({ createdAt: -1 }).limit(limit).lean(),
      userModel.find().select("firstName lastName email role createdAt").sort({ createdAt: -1 }).limit(limit).lean(),
      rateModel.find().populate("ratedBy", "firstName lastName").populate("productId", "title").sort({ createdAt: -1 }).limit(limit).lean(),
    ]);
    res.status(StatusCodes.OK).json({ success: true, message: "Recent activity fetched successfully", data: { orders: recentOrders, users: recentUsers, ratings: recentRatings } });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Failed to fetch recent activity", error: error instanceof Error ? error.message : String(error) });
  }
}

export async function getRevenueChart(req: Request, res: Response): Promise<void> {
  try {
    const period = (req.query.period as string) || "month";
    let dateFormat: string;
    let startDate: Date;
    const now = new Date();
    switch (period) {
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateFormat = "%Y-%m-%d";
        break;
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1);
        dateFormat = "%Y-%m";
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        dateFormat = "%Y-%m-%d";
        break;
    }
    const revenueData = await orderModel.aggregate([
      { $match: { paymentStatus: "paid", createdAt: { $gte: startDate } } },
      { $group: { _id: { $dateToString: { format: dateFormat, date: "$createdAt" } }, revenue: { $sum: "$totalPrice" }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $project: { date: "$_id", revenue: 1, orders: "$count", _id: 0 } },
    ]);
    res.status(StatusCodes.OK).json({ success: true, message: "Revenue chart data fetched", data: revenueData });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Failed to fetch revenue chart data", error: error instanceof Error ? error.message : String(error) });
  }
}

export async function getTopProducts(req: Request, res: Response): Promise<void> {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const metric = (req.query.metric as string) || "sales";
    let topProducts;
    if (metric === "ratings") {
      topProducts = await productModel.find({ ratingCount: { $gt: 0 } }).sort({ avgRating: -1, ratingCount: -1 }).limit(limit);
    } else {
      topProducts = await orderModel.aggregate([
        { $unwind: "$products" },
        { $group: { _id: "$products.productId", salesCount: { $sum: "$products.quantity" }, revenue: { $sum: "$products.price" } } },
        { $sort: { salesCount: -1 } },
        { $limit: limit },
        { $lookup: { from: "products", localField: "_id", foreignField: "_id", as: "product" } },
        { $unwind: "$product" },
        { $project: { _id: "$product._id", title: "$product.title", coverImage: "$product.coverImage", category: "$product.category", salesCount: 1, revenue: 1 } },
      ]);
    }
    res.status(StatusCodes.OK).json({ success: true, message: "Top products fetched", data: topProducts });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Failed to fetch top products", error: error instanceof Error ? error.message : String(error) });
  }
}

export async function getTopSellingProducts(req: Request, res: Response): Promise<void> {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const topProducts = await orderModel.aggregate([
      { $unwind: "$products" },
      { $group: { _id: "$products.productId", totalSold: { $sum: "$products.quantity" }, revenue: { $sum: { $multiply: ["$products.price", "$products.quantity"] } } } },
      { $sort: { totalSold: -1 } },
      { $limit: limit },
      { $lookup: { from: "products", localField: "_id", foreignField: "_id", as: "product" } },
      { $unwind: "$product" },
      { $project: { _id: "$product._id", title: "$product.title", coverImage: "$product.coverImage", category: "$product.category", totalSold: 1, revenue: 1 } },
    ]);
    res.status(StatusCodes.OK).json({ success: true, message: "Top selling products fetched successfully", data: topProducts });
  } catch (error) {
    logger.error("Error fetching top selling products:", { error });
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Failed to fetch top selling products", error: error instanceof Error ? error.message : String(error) });
  }
}

export async function getUserStats(_req: Request, res: Response): Promise<void> {
  try {
    const usersByRole = await userModel.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]);
    const usersByMonth = await userModel.aggregate([
      { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, count: { $sum: 1 } } },
      { $sort: { "_id.year": -1, "_id.month": -1 } },
      { $limit: 12 },
    ]);
    res.status(StatusCodes.OK).json({ success: true, message: "User statistics fetched", data: { byRole: usersByRole, byMonth: usersByMonth } });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Failed to fetch user statistics", error: error instanceof Error ? error.message : String(error) });
  }
}

export async function getCategoryStats(_req: Request, res: Response): Promise<void> {
  try {
    const categoryStats = await productModel.aggregate([
      { $group: { _id: "$category", productCount: { $sum: 1 } } },
      { $lookup: { from: "categories", localField: "_id", foreignField: "_id", as: "category" } },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
      { $project: { _id: 1, name: "$category.name", productCount: 1 } },
      { $sort: { productCount: -1 } },
    ]);
    res.status(StatusCodes.OK).json({ success: true, message: "Category statistics fetched", data: categoryStats });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Failed to fetch category statistics", error: error instanceof Error ? error.message : String(error) });
  }
}

export async function getInventoryAlerts(req: Request, res: Response): Promise<void> {
  try {
    const threshold = parseInt(req.query.threshold as string) || 5;
    const lowStockProducts = await productModel.find({ status: "active", stock: { $lte: threshold, $gt: 0 } }).sort({ stock: 1 });
    const outOfStockProducts = await productModel.find({ stock: 0 });
    res.status(StatusCodes.OK).json({ success: true, message: "Inventory alerts fetched", data: { lowStock: lowStockProducts, outOfStock: outOfStockProducts, lowStockCount: lowStockProducts.length, outOfStockCount: outOfStockProducts.length } });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Failed to fetch inventory alerts", error: error instanceof Error ? error.message : String(error) });
  }
}

export async function exportData(req: Request, res: Response): Promise<void> {
  try {
    const { type } = req.params as { type: string };
    let data: unknown;
    let filename: string;
    switch (type) {
      case "users":
        data = await userModel.find().select("-password").lean();
        filename = "users-export.json";
        break;
      case "products":
        data = await productModel.find().lean();
        filename = "products-export.json";
        break;
      case "orders":
        data = await orderModel.find().populate("userId", "firstName lastName email").populate("products.productId", "title").lean();
        filename = "orders-export.json";
        break;
      default:
        res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: "Invalid export type. Valid types: users, products, orders" });
        return;
    }
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    res.status(StatusCodes.OK).send(JSON.stringify(data, null, 2));
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Failed to export data", error: error instanceof Error ? error.message : String(error) });
  }
}

// ====================
// Admin Management Routes
// ====================

export async function getAdminProducts(_req: Request, res: Response): Promise<void> {
  try {
    const products = await productModel.find().sort({ createdAt: -1 });
    successResponse(res, products, "Products fetched successfully");
  } catch (error) {
    logger.error("Error fetching admin products:", { error });
    errorResponse(res, error, "Failed to fetch products");
  }
}

export async function getAdminOrders(_req: Request, res: Response): Promise<void> {
  try {
    const orders = await orderModel
      .find()
      .populate("userId", "firstName lastName email")
      .sort({ createdAt: -1 });
    successResponse(res, orders, "Orders fetched successfully");
  } catch (error) {
    logger.error("Error fetching admin orders:", { error });
    errorResponse(res, error, "Failed to fetch orders");
  }
}

export async function getAdminUsers(_req: Request, res: Response): Promise<void> {
  try {
    const users = await userModel.find().select("-password").sort({ createdAt: -1 });
    successResponse(res, users, "Users fetched successfully");
  } catch (error) {
    logger.error("Error fetching admin users:", { error });
    errorResponse(res, error, "Failed to fetch users");
  }
}

export async function updateUserRole(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const user = await userModel.findByIdAndUpdate(id, { role }, { new: true }).select("-password");
    if (!user) {
      errorResponse(res, null, "User not found", StatusCodes.NOT_FOUND);
      return;
    }
    successResponse(res, user, "User role updated successfully");
  } catch (error) {
    logger.error("Error updating user role:", { error });
    errorResponse(res, error, "Failed to update user role");
  }
}

export async function deleteUser(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const user = await userModel.findByIdAndDelete(id);
    if (!user) {
      errorResponse(res, null, "User not found", StatusCodes.NOT_FOUND);
      return;
    }
    successResponse(res, null, "User deleted successfully");
  } catch (error) {
    logger.error("Error deleting user:", { error });
    errorResponse(res, error, "Failed to delete user");
  }
}