import { Router } from "express";
import {
  getDashboardStats,
  getRecentActivity,
  getRevenueChart,
  getTopProducts,
  getTopSellingProducts,
  getUserStats,
  getCategoryStats,
  getInventoryAlerts,
  exportData,
  getAdminProducts,
  getAdminOrders,
  getAdminUsers,
  updateUserRole,
  deleteUser,
} from "../handlers/admin.js";
import { CheckAuth, isAdmin } from "../middlewares/auth.js";

const adminRouter = Router();
adminRouter.use(CheckAuth, isAdmin);

adminRouter.get("/dashboard", getDashboardStats);
adminRouter.get("/activity", getRecentActivity);
adminRouter.get("/revenue", getRevenueChart);
adminRouter.get("/top-products", getTopProducts);
adminRouter.get("/top-selling-products", getTopSellingProducts);
adminRouter.get("/user-stats", getUserStats);
adminRouter.get("/category-stats", getCategoryStats);
adminRouter.get("/inventory-alerts", getInventoryAlerts);
adminRouter.get("/export/:type", exportData);

// Admin management routes
adminRouter.get("/products", getAdminProducts);
adminRouter.get("/orders", getAdminOrders);
adminRouter.get("/users", getAdminUsers);
adminRouter.put("/users/:id/role", updateUserRole);
adminRouter.delete("/users/:id", deleteUser);

export default adminRouter;