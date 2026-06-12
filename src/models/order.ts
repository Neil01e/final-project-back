import { Schema, model, type Model } from "mongoose";
import type { IOrder } from "../types/models/order.js";

const orderSchema = new Schema<IOrder>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "user", required: true },
    products: [
      {
        productId: { type: Schema.Types.ObjectId, ref: "product", required: true },
        title: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true, min: 0 },
      },
    ],
    subtotal: { type: Number, required: true, min: 0 },
    shippingFee: { type: Number, default: 0, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 },
    deliveryMethod: { type: String, enum: ["pickup", "delivery"], required: true, default: "pickup" },
    shippingAddress: {
      fullName: String,
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
      phone: String,
      instructions: String,
    },
    paymentMethod: { type: String, enum: ["cash_on_delivery"], required: true, default: "cash_on_delivery" },
    paymentStatus: { type: String, enum: ["pending", "paid", "failed", "refunded"], default: "pending" },
    status: {
      type: String,
      enum: ["pending", "processing", "shipped", "delivered", "cancelled", "completed"],
      default: "pending",
    },
    orderNotes: { type: String, maxlength: 500 },
    trackingNumber: String,
    cancellationReason: String,
    cancelledAt: Date,
    statusHistory: [
      {
        status: String,
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: Schema.Types.ObjectId, ref: "users" },
        note: { type: String, maxlength: 500 },
      },
    ],
  },
  { timestamps: true, toJSON: { versionKey: false }, toObject: { versionKey: false } }
);

const orderModel: Model<IOrder> = model<IOrder>("order", orderSchema);
export default orderModel;