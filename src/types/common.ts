import { Types } from "mongoose";

export interface BaseDocument {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type UserRole = "admin" | "user";

export type GameStatus = "active" | "out-of-stock";

export type GameType = "video" | "society";

/**
 * Order status enum - tracks order lifecycle
 */
export type OrderStatus =
  | "pending"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "completed";

/**
 * Payment status enum
 */
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

/**
 * Delivery method enum
 */
export type DeliveryMethod = "pickup" | "delivery";

/**
 * Payment method enum
 */
export type PaymentMethod = "cash_on_delivery";