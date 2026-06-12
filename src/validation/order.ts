import { z } from "zod/v4";
import { mongoIdSchema, paginationSchema } from "./utils.js";

const shippingAddressSchema = z.object({
  fullName: z.string().optional(), street: z.string().min(1), city: z.string().min(1), state: z.string().optional(),
  postalCode: z.string().min(1), country: z.string().min(1), phone: z.string().min(1), instructions: z.string().optional(),
});

export const cartSchema = z.object({
  products: z.array(z.object({ productId: mongoIdSchema, quantity: z.number().min(1) })).min(1),
  deliveryMethod: z.enum(["pickup", "delivery"]), shippingAddress: shippingAddressSchema.optional(),
  paymentMethod: z.enum(["cash_on_delivery"]).optional(), orderNotes: z.string().max(500).optional(),
}).refine(data => data.deliveryMethod !== "delivery" || data.shippingAddress !== undefined, { message: "Shipping address required for delivery", path: ["shippingAddress"] });

export const orderSchema = z.object({
  userId: mongoIdSchema, products: z.array(z.object({ productId: mongoIdSchema, title: z.string(), quantity: z.number().min(1), price: z.number().min(0) })),
  subtotal: z.number().min(0), shippingFee: z.number().min(0), totalPrice: z.number().min(0), deliveryMethod: z.enum(["pickup", "delivery"]),
  shippingAddress: shippingAddressSchema.optional(), paymentMethod: z.enum(["cash_on_delivery"]),
  paymentStatus: z.enum(["pending", "paid", "failed", "refunded"]),
  status: z.enum(["pending", "processing", "shipped", "delivered", "cancelled", "completed"]),
  orderNotes: z.string().max(500).optional(), trackingNumber: z.string().optional(),
});

export const updateOrderStatusSchema = z.object({ status: z.enum(["pending", "processing", "shipped", "delivered", "cancelled", "completed"]), note: z.string().max(500).optional() });
export const cancelOrderSchema = z.object({ reason: z.string().max(500).optional() });
export const orderQuerySchema = paginationSchema.and(z.object({
  status: z.enum(["pending", "processing", "shipped", "delivered", "cancelled", "completed"]).optional(),
  sortBy: z.enum(["createdAt", "totalPrice", "status", "updatedAt"]).optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"), userId: mongoIdSchema.optional(),
}));
export type OrderQueryInput = z.infer<typeof orderQuerySchema>;