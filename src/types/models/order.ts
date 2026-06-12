import type { Types, Document } from "mongoose";
import type { OrderStatus, PaymentStatus, DeliveryMethod, PaymentMethod } from "../common.js";

export interface ShippingAddress {
  fullName?: string; street: string; city: string; state?: string; postalCode: string; country: string; phone: string; instructions?: string;
}

export interface OrderProductItem {
  productId: Types.ObjectId;
  title: string;
  quantity: number;
  price: number;
}

export interface StatusHistoryEntry {
  status: string;
  changedAt: Date;
  changedBy?: Types.ObjectId;
  note?: string;
}

export interface IOrder {
  userId: Types.ObjectId;
  products: OrderProductItem[];
  subtotal: number;
  shippingFee: number;
  totalPrice: number;
  deliveryMethod: DeliveryMethod;
  shippingAddress?: ShippingAddress;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  orderNotes?: string;
  trackingNumber?: string;
  cancellationReason?: string;
  cancelledAt?: Date;
  statusHistory: StatusHistoryEntry[];
}

export type IOrderDocument = Document<Types.ObjectId> & IOrder;