import { Router } from "express";
import {
  getOrders,
  getUserOrders,
  createOrder,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
  processPayment,
  getOrderStats,
} from "../handlers/order.js";
import { CheckAuth, isAdmin } from "../middlewares/auth.js";
import {
  validateBodySchema,
  validateParamsSchema,
  validateQuerySchema,
} from "../middlewares/validation.js";
import { idParamsSchema } from "../validation/utils.js";
import {
  cartSchema,
  updateOrderStatusSchema,
  cancelOrderSchema,
  orderQuerySchema,
} from "../validation/order.js";

const orderRouter = Router();

// =====================
// Protected routes (User)
// =====================

/**
 * @route   GET /api/orders/my
 * @desc    Get current user's orders
 * @access  Private
 */
orderRouter.get("/my", CheckAuth, getUserOrders);

/**
 * @route   POST /api/orders
 * @desc    Create new order
 * @access  Private
 */
orderRouter.post("/", CheckAuth, validateBodySchema(cartSchema), createOrder);

// =====================
// Admin routes (fixed-path — must come BEFORE /:id)
// =====================

/**
 * @route   GET /api/orders
 * @desc    Get all orders (Admin)
 * @access  Private/Admin
 */
orderRouter.get(
  "/",
  CheckAuth,
  isAdmin,
  validateQuerySchema(orderQuerySchema),
  getOrders,
);

/**
 * @route   GET /api/orders/stats
 * @desc    Get order statistics (Admin)
 * @access  Private/Admin
 *
 * NOTE: Must be defined before GET /:id so Express does not
 * treat "stats" as a MongoDB ObjectId parameter.
 */
orderRouter.get("/stats", CheckAuth, isAdmin, getOrderStats);

/**
 * @route   PUT /api/orders/:id/status
 * @desc    Update order status (Admin)
 * @access  Private/Admin
 */
orderRouter.put(
  "/:id/status",
  CheckAuth,
  isAdmin,
  validateParamsSchema(idParamsSchema),
  validateBodySchema(updateOrderStatusSchema),
  updateOrderStatus,
);

// =====================
// Param routes (after all fixed-path routes)
// =====================

/**
 * @route   GET /api/orders/:id
 * @desc    Get order by ID
 * @access  Private
 */
orderRouter.get(
  "/:id",
  CheckAuth,
  validateParamsSchema(idParamsSchema),
  getOrderById,
);

/**
 * @route   POST /api/orders/:id/cancel
 * @desc    Cancel order
 * @access  Private
 */
orderRouter.post(
  "/:id/cancel",
  CheckAuth,
  validateParamsSchema(idParamsSchema),
  validateBodySchema(cancelOrderSchema),
  cancelOrder,
);

/**
 * @route   POST /api/orders/:id/pay
 * @desc    Process payment for order
 * @access  Private
 */
orderRouter.post(
  "/:id/pay",
  CheckAuth,
  validateParamsSchema(idParamsSchema),
  processPayment,
);

export default orderRouter;
