import { Types } from "mongoose";
import { UserRole, BaseDocument } from "../common.js";

export interface UserProducts {
  purchased: Types.ObjectId[];
  favorites: Types.ObjectId[];
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
   settings?: {
    orderNotifications: boolean;
    promoNotifications: boolean;
  };
}

export interface IUserDocument extends IUser {
  comparePassword(requestedPassword: string): Promise<boolean>;
}