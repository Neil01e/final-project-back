import { Types } from "mongoose";
import { UserRole, BaseDocument } from "../common.js";

export interface CartItem {
  productId: Types.ObjectId;
  quantity: number;
  addedAt: Date;
}

export interface UserProducts {
  purchased: Types.ObjectId[];
  favorites: Types.ObjectId[];
}

export interface UserSettings {
  orderNotifications: boolean;
  promoNotifications: boolean;
}

export interface IUser extends BaseDocument {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  avatar?: string;
  bio?: string;
  role: UserRole;
  products: UserProducts;
  wishlist: Types.ObjectId[];
  cart: CartItem[];
  settings?: UserSettings;
}

export interface IUserDocument extends IUser {
  comparePassword(requestedPassword: string): Promise<boolean>;
}