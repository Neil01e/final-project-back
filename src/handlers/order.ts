import { StatusCodes } from "http-status-codes";
import { errorResponse, paginatedResponse, successResponse } from "../utils/responseFormatter.js";
import { logger } from "../utils/logger.js";
import orderModel from "../models/order.js";
import productModel from "../models/product.js";
import mongoose, { Types } from "mongoose";
import { AuthenticatedRequest, RequestWithParsedQuery } from "../types/express.js";
import type { Request, Response } from "express";
import { OrderQueryInput } from "../validation/order.js";
import { OrderStatus } from "../types/common.js";

interface CartItem {
  productId: string;
  quantity: number;
}

interface ShippingAddress {
  fullName?: string;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  instructions?: string;
}

export async function createOrder(req: Request, res: Response): Promise<void> {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user._id;
    const {
      products: cartItems,
      shippingAddress,
      deliveryMethod = "pickup",
      paymentMethod = "cash_on_delivery",
      orderNotes,
    } = req.body as {
      products: CartItem[];
      shippingAddress?: ShippingAddress;
      deliveryMethod?: "pickup" | "delivery";
      paymentMethod?: "cash_on_delivery";
      orderNotes?: string;
    };

    if (!cartItems || cartItems.length === 0) {
      errorResponse(res, null, "Order must contain at least one item", StatusCodes.BAD_REQUEST);
      return;
    }

    const orderProducts: Array<{
      productId: Types.ObjectId;
      title: string;
      quantity: number;
      price: number;
    }> = [];
    let subtotal = 0;

    for (const item of cartItems) {
      const product = await productModel.findById(item.productId).session(session);
      if (!product) {
        await session.abortTransaction();
        errorResponse(res, null, `Product ${item.productId} not found`, StatusCodes.NOT_FOUND);
        return;
      }
      if (product.stock < item.quantity) {
        await session.abortTransaction();
        errorResponse(res, null, `Not enough stock for "${product.title}"`, StatusCodes.BAD_REQUEST);
        return;
      }
      const unitPrice = product.price;
      orderProducts.push({ productId: product._id, title: product.title, quantity: item.quantity, price: unitPrice });
      subtotal += unitPrice * item.quantity;
      await productModel.findByIdAndUpdate(item.productId, { $inc: { stock: -item.quantity } }, { session });
    }

    const shippingFee = deliveryMethod === "delivery" && subtotal < 50 ? 5 : 0;
    const totalPrice = subtotal + shippingFee;

    const [order] = await orderModel.create([{
      userId, products: orderProducts, shippingAddress, deliveryMethod, paymentMethod,
      subtotal, shippingFee, totalPrice, status: "pending", orderNotes,
      statusHistory: [{ status: "pending", changedAt: new Date(), changedBy: userId }],
    }], { session });

    await session.commitTransaction();
    const populatedOrder = await order.populate([{ path: "products.productId", select: "title coverImage" }, { path: "userId", select: "firstName lastName email" }]);
    successResponse(res, populatedOrder, "Order created successfully", StatusCodes.CREATED);
  } catch (error) {
    await session.abortTransaction();
    logger.error("Error creating order:", { error });
    errorResponse(res, error, "Failed to create order");
  } finally {
    session.endSession();
  }
}

export async function getOrders(req: Request, res: Response): Promise<void> {
  try {
    const parsedReq = req as RequestWithParsedQuery<OrderQueryInput>;
    const { limit = 10, page = 1, sortBy = "createdAt", sortOrder = "desc", status, userId } = parsedReq.parsedQuery;
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (userId) filter.userId = userId;

    const [orders, total] = await Promise.all([
      orderModel.find(filter).populate("userId", "firstName lastName email").populate("products.productId", "title coverImage price").limit(limit).skip((page - 1) * limit).sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 }).lean(),
      orderModel.countDocuments(filter),
    ]);
    paginatedResponse(res, orders, { total, page, limit, totalPages: Math.ceil(total / limit) }, "Orders fetched successfully");
  } catch (error) {
    logger.error("Error fetching orders:", { error });
    errorResponse(res, error, "Failed to fetch orders");
  }
}

export async function getUserOrders(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user._id;
    const { status, page = "1", limit = "10" } = req.query as { status?: OrderStatus; page?: string; limit?: string };
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const filter: Record<string, unknown> = { userId };
    if (status) filter.status = status;

    const [orders, total] = await Promise.all([
      orderModel.find(filter).populate("products.productId", "title coverImage price").sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum).lean(),
      orderModel.countDocuments(filter),
    ]);
    paginatedResponse(res, orders, { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) }, "Orders fetched successfully");
  } catch (error) {
    logger.error("Error fetching user orders:", { error });
    errorResponse(res, error, "Failed to fetch orders");
  }
}

export async function getOrderById(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    const userId = authReq.user._id;
    const isAdmin = (authReq.user as { role?: string }).role === "admin";
    const order = await orderModel.findById(id).populate("products.productId", "title coverImage price").populate("userId", "firstName lastName email");
    if (!order) { errorResponse(res, null, "Order not found", StatusCodes.NOT_FOUND); return; }
    const orderUserId = (order.userId as { _id?: unknown })._id || order.userId;
    if (!isAdmin && orderUserId.toString() !== userId.toString()) { errorResponse(res, null, "Access denied", StatusCodes.FORBIDDEN); return; }
    successResponse(res, order, "Order fetched successfully");
  } catch (error) {
    logger.error("Error fetching order by id:", { error });
    errorResponse(res, error, "Failed to fetch order");
  }
}

export async function updateOrderStatus(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    const { status, note } = req.body as { status: OrderStatus; note?: string };
    const adminId = authReq.user._id;
    const order = await orderModel.findById(id);
    if (!order) { errorResponse(res, null, "Order not found", StatusCodes.NOT_FOUND); return; }

    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      pending: ["processing", "cancelled"], processing: ["shipped", "cancelled"],
      shipped: ["delivered"], delivered: ["completed"], cancelled: [], completed: [],
    };
    const currentStatus = order.status as OrderStatus;
    if (!validTransitions[currentStatus].includes(status)) {
      errorResponse(res, null, `Cannot change status from ${currentStatus} to ${status}`, StatusCodes.BAD_REQUEST);
      return;
    }
    order.status = status;
    order.statusHistory.push({ status, changedAt: new Date(), changedBy: adminId, note });

    // ✅ Increment salesCount when order is delivered or completed
    if (status === "delivered" || status === "completed") {
      for (const item of order.products) {
        await productModel.findByIdAndUpdate(
          item.productId,
          { $inc: { salesCount: item.quantity } }
        );
      }
    }

    if (status === "cancelled") {
      for (const item of order.products) await productModel.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity } });
      order.cancellationReason = "Cancelled by admin";
      order.cancelledAt = new Date();
    }
    await order.save();
    successResponse(res, order, `Order status updated to ${status}`);
  } catch (error) {
    logger.error("Error updating order status:", { error });
    errorResponse(res, error, "Failed to update order status");
  }
}

export async function cancelOrder(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    const userId = authReq.user._id;
    const { reason } = req.body as { reason?: string };
    const order = await orderModel.findById(id);
    if (!order) { errorResponse(res, null, "Order not found", StatusCodes.NOT_FOUND); return; }
    if (order.userId.toString() !== userId.toString()) { errorResponse(res, null, "You can only cancel your own orders", StatusCodes.FORBIDDEN); return; }
    if (!["pending", "processing"].includes(order.status)) { errorResponse(res, null, "Order cannot be cancelled at this stage", StatusCodes.BAD_REQUEST); return; }
    for (const item of order.products) await productModel.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity } });
    order.status = "cancelled";
    order.cancellationReason = reason || "Cancelled by user";
    order.cancelledAt = new Date();
    order.statusHistory.push({ status: "cancelled", changedAt: new Date(), changedBy: userId });
    await order.save();
    successResponse(res, order, "Order cancelled successfully");
  } catch (error) {
    logger.error("Error cancelling order:", { error });
    errorResponse(res, error, "Failed to cancel order");
  }
}

export async function processPayment(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    const userId = authReq.user._id;
    const order = await orderModel.findById(id);
    if (!order) { errorResponse(res, null, "Order not found", StatusCodes.NOT_FOUND); return; }
    if (order.userId.toString() !== userId.toString()) { errorResponse(res, null, "Access denied", StatusCodes.FORBIDDEN); return; }
    if (order.paymentStatus !== "pending") { errorResponse(res, null, "Order payment is not pending", StatusCodes.BAD_REQUEST); return; }
    order.paymentStatus = "paid";
    order.status = "processing";
    order.statusHistory.push({ status: "processing", changedAt: new Date(), changedBy: userId });
    await order.save();
    successResponse(res, order, "Payment processed successfully");
  } catch (error) {
    logger.error("Error processing payment:", { error });
    errorResponse(res, error, "Failed to process payment");
  }
}

export async function getOrderStats(_req: Request, res: Response): Promise<void> {
  try {
    const [totalOrders, pendingOrders, completedOrders, cancelledOrders, revenueAgg] = await Promise.all([
      orderModel.countDocuments(),
      orderModel.countDocuments({ status: "pending" }),
      orderModel.countDocuments({ status: { $in: ["delivered", "completed"] } }),
      orderModel.countDocuments({ status: "cancelled" }),
      orderModel.aggregate([{ $match: { paymentStatus: "paid" } }, { $group: { _id: null, total: { $sum: "$totalPrice" } } }]),
    ]);
    const totalRevenue = revenueAgg[0]?.total || 0;
    successResponse(res, { totalOrders, pendingOrders, completedOrders, cancelledOrders, totalRevenue }, "Order statistics fetched");
  } catch (error) {
    errorResponse(res, error, "Failed to fetch order statistics");
  }
}