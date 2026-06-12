import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import userModel from "../models/user.js";
import productModel from "../models/product.js";
import { successResponse, errorResponse } from "../utils/responseFormatter.js";
import { AuthenticatedRequest } from "../types/express.js";
import { logger } from "../utils/logger.js";
import { Types } from "mongoose";
import orderModel from "../models/order.js";

function toObjectId(id: string | string[] | undefined): Types.ObjectId {
  if (!id || Array.isArray(id)) throw new Error("Invalid ObjectId");
  return new Types.ObjectId(id);
}

export async function getProfile(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user._id;
    const user = await userModel
      .findById(userId)
      .select("-password")
      .populate("wishlist", "title coverImage price category")
      .populate("products.favorites", "title coverImage price")
      .populate("products.purchased", "title coverImage price")
      .populate("cart.productId", "title price coverImage");
    if (!user) {
      errorResponse(res, null, "User not found", StatusCodes.NOT_FOUND);
      return;
    }
    successResponse(res, user, "Profile fetched successfully");
  } catch (error) {
    logger.error("Error fetching profile:", { error });
    errorResponse(res, error, "Failed to fetch profile");
  }
}

export async function updateProfile(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user._id;
    const { firstName, lastName, phone, avatar, bio } = req.body;
    const updateData: Record<string, unknown> = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (phone !== undefined) updateData.phone = phone;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (bio !== undefined) updateData.bio = bio;
    const user = await userModel
      .findByIdAndUpdate(userId, { $set: updateData }, { new: true })
      .select("-password");
    if (!user) {
      errorResponse(res, null, "User not found", StatusCodes.NOT_FOUND);
      return;
    }
    successResponse(res, user, "Profile updated successfully");
  } catch (error) {
    logger.error("Error updating profile:", { error });
    errorResponse(res, error, "Failed to update profile");
  }
}

export async function addToWishlist(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user._id;
    const { id } = req.params;
    const product = await productModel.findById(id);
    if (!product) {
      errorResponse(res, null, "Product not found", StatusCodes.NOT_FOUND);
      return;
    }
    const user = await userModel
      .findByIdAndUpdate(userId, { $addToSet: { wishlist: toObjectId(id) } }, { new: true })
      .populate("wishlist", "title coverImage price category");
    successResponse(res, user?.wishlist, "Product added to wishlist");
  } catch (error) {
    logger.error("Error adding to wishlist:", { error });
    errorResponse(res, error, "Failed to add to wishlist");
  }
}

export async function removeFromWishlist(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user._id;
    const { id } = req.params;
    const user = await userModel
      .findByIdAndUpdate(userId, { $pull: { wishlist: toObjectId(id) } }, { new: true })
      .populate("wishlist", "title coverImage price category");
    successResponse(res, user?.wishlist, "Product removed from wishlist");
  } catch (error) {
    logger.error("Error removing from wishlist:", { error });
    errorResponse(res, error, "Failed to remove from wishlist");
  }
}

export async function getWishlist(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user._id;
    const user = await userModel
      .findById(userId)
      .select("wishlist")
      .populate("wishlist", "title coverImage price category stock avgRating");
    if (!user) {
      errorResponse(res, null, "User not found", StatusCodes.NOT_FOUND);
      return;
    }
    successResponse(res, user.wishlist, "Wishlist fetched successfully");
  } catch (error) {
    logger.error("Error fetching wishlist:", { error });
    errorResponse(res, error, "Failed to fetch wishlist");
  }
}

export async function getCart(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user._id;
    
    const user = await userModel.findById(userId).populate("cart.productId", "title price coverImage");
    
    if (!user) {
      errorResponse(res, null, "User not found", StatusCodes.NOT_FOUND);
      return;
    }
    
    const cartItems = user.cart.map((item: any) => ({
      productId: item.productId._id,
      title: item.productId.title,
      price: item.productId.price,
      quantity: item.quantity,
      coverImage: item.productId.coverImage,
    }));
    
    successResponse(res, cartItems, "Cart fetched");
  } catch (error: any) {
    console.error("getCart error:", error);
    errorResponse(res, error, error.message || "Failed to fetch cart");
  }
}

export async function addToCart(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user._id;
    const { productId, quantity = 1 } = req.body;
    
    if (!productId) {
      errorResponse(res, null, "Product ID required", StatusCodes.BAD_REQUEST);
      return;
    }
    
    const product = await productModel.findById(productId);
    if (!product) {
      errorResponse(res, null, "Product not found", StatusCodes.NOT_FOUND);
      return;
    }
    
    const user = await userModel.findById(userId);
    if (!user) {
      errorResponse(res, null, "User not found", StatusCodes.NOT_FOUND);
      return;
    }
    
    const existingItem = user.cart.find(
      (item) => item.productId.toString() === productId
    );
    
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      user.cart.push({
        productId: new Types.ObjectId(productId),
        quantity: quantity,
      });
    }
    
    await user.save();
    
    const updatedUser = await userModel.findById(userId).populate("cart.productId", "title price coverImage");
    
    const cartItems = updatedUser.cart.map((item: any) => ({
      productId: item.productId._id,
      title: item.productId.title,
      price: item.productId.price,
      quantity: item.quantity,
      coverImage: item.productId.coverImage,
    }));
    
    successResponse(res, cartItems, "Added to cart");
  } catch (error: any) {
    console.error("addToCart error:", error);
    errorResponse(res, error, error.message || "Failed to add to cart");
  }
}

export async function updateCartItem(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user._id;
    const { productId, quantity } = req.body;
    
    if (!productId) {
      errorResponse(res, null, "Product ID required", StatusCodes.BAD_REQUEST);
      return;
    }
    
    if (quantity <= 0) {
      errorResponse(res, null, "Quantity must be positive", StatusCodes.BAD_REQUEST);
      return;
    }
    
    const user = await userModel.findById(userId);
    if (!user) {
      errorResponse(res, null, "User not found", StatusCodes.NOT_FOUND);
      return;
    }
    
    const cartItem = user.cart.find((item) => item.productId.toString() === productId);
    if (!cartItem) {
      errorResponse(res, null, "Item not found in cart", StatusCodes.NOT_FOUND);
      return;
    }
    
    cartItem.quantity = quantity;
    await user.save();
    
    const updatedUser = await userModel.findById(userId).populate("cart.productId", "title price coverImage");
    
    const cartItems = updatedUser.cart.map((item: any) => ({
      productId: item.productId._id,
      title: item.productId.title,
      price: item.productId.price,
      quantity: item.quantity,
      coverImage: item.productId.coverImage,
    }));
    
    successResponse(res, cartItems, "Cart updated");
  } catch (error: any) {
    console.error("updateCartItem error:", error);
    errorResponse(res, error, error.message || "Failed to update cart");
  }
}

export async function removeFromCart(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user._id;
    const { productId } = req.params;
    
    if (!productId) {
      errorResponse(res, null, "Product ID required", StatusCodes.BAD_REQUEST);
      return;
    }
    
    const user = await userModel.findById(userId);
    if (!user) {
      errorResponse(res, null, "User not found", StatusCodes.NOT_FOUND);
      return;
    }
    
    user.cart = user.cart.filter((item) => item.productId.toString() !== productId);
    await user.save();
    
    const updatedUser = await userModel.findById(userId).populate("cart.productId", "title price coverImage");
    
    const cartItems = updatedUser.cart.map((item: any) => ({
      productId: item.productId._id,
      title: item.productId.title,
      price: item.productId.price,
      quantity: item.quantity,
      coverImage: item.productId.coverImage,
    }));
    
    successResponse(res, cartItems, "Removed from cart");
  } catch (error: any) {
    console.error("removeFromCart error:", error);
    errorResponse(res, error, error.message || "Failed to remove from cart");
  }
}

export async function clearCart(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user._id;
    
    const user = await userModel.findById(userId);
    if (!user) {
      errorResponse(res, null, "User not found", StatusCodes.NOT_FOUND);
      return;
    }
    
    user.cart = [];
    await user.save();
    
    successResponse(res, [], "Cart cleared");
  } catch (error: any) {
    console.error("clearCart error:", error);
    errorResponse(res, error, error.message || "Failed to clear cart");
  }
}

export async function getUserStats(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user._id;
    const [totalOrders, completedOrders, totalSpent, wishlistCount] = await Promise.all([
      orderModel.countDocuments({ userId }),
      orderModel.countDocuments({ userId, status: "completed" }),
      orderModel.aggregate([
        { $match: { userId: toObjectId(userId), status: "completed" } },
        { $group: { _id: null, total: { $sum: "$totalPrice" } } },
      ]),
      userModel.findById(userId).select("wishlist"),
    ]);
    successResponse(
      res,
      {
        totalOrders,
        completedOrders,
        totalSpent: totalSpent[0]?.total || 0,
        wishlistCount: wishlistCount?.wishlist?.length || 0,
      },
      "User stats fetched successfully"
    );
  } catch (error) {
    logger.error("Error fetching user stats:", { error });
    errorResponse(res, error, "Failed to fetch user stats");
  }
}

export async function updateAvatar(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user._id;
    if (!req.file) {
      errorResponse(res, null, "No file uploaded", StatusCodes.BAD_REQUEST);
      return;
    }
    const avatarUrl = `/uploads/${req.file.filename}`;
    const user = await userModel
      .findByIdAndUpdate(userId, { avatar: avatarUrl }, { new: true })
      .select("-password");
    successResponse(res, user, "Avatar updated successfully");
  } catch (error) {
    logger.error("Error updating avatar:", { error });
    errorResponse(res, error, "Failed to update avatar");
  }
}

export async function removeAvatar(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user._id;
    const user = await userModel
      .findByIdAndUpdate(userId, { avatar: "" }, { new: true })
      .select("-password");
    successResponse(res, user, "Avatar removed successfully");
  } catch (error) {
    logger.error("Error removing avatar:", { error });
    errorResponse(res, error, "Failed to remove avatar");
  }
}

export async function getSettings(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user._id;
    const user = await userModel.findById(userId).select("settings");
    if (!user) {
      errorResponse(res, null, "User not found", StatusCodes.NOT_FOUND);
      return;
    }
    const settings = user.settings || { orderNotifications: true, promoNotifications: false };
    successResponse(res, settings, "Settings fetched");
  } catch (error) {
    logger.error("Error fetching settings:", { error });
    errorResponse(res, error, "Failed to fetch settings");
  }
}

export async function updateSettings(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user._id;
    const { orderNotifications, promoNotifications } = req.body;
    const user = await userModel
      .findByIdAndUpdate(
        userId,
        { $set: { settings: { orderNotifications, promoNotifications } } },
        { new: true }
      )
      .select("settings");
    if (!user) {
      errorResponse(res, null, "User not found", StatusCodes.NOT_FOUND);
      return;
    }
    successResponse(res, user.settings, "Settings updated");
  } catch (error) {
    logger.error("Error updating settings:", { error });
    errorResponse(res, error, "Failed to update settings");
  }
}

export async function changeEmail(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user._id;
    const { email, password } = req.body;
    const user = await userModel.findById(userId);
    if (!user || !(await user.comparePassword(password))) {
      errorResponse(res, null, "Invalid password", StatusCodes.UNAUTHORIZED);
      return;
    }
    const existing = await userModel.findOne({ email });
    if (existing && existing._id.toString() !== userId) {
      errorResponse(res, null, "Email already in use", StatusCodes.CONFLICT);
      return;
    }
    user.email = email;
    await user.save();
    successResponse(res, { email }, "Email updated successfully");
  } catch (error) {
    errorResponse(res, error, "Failed to update email");
  }
}

export async function deleteAccount(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user._id;
    const { password } = req.body;
    const user = await userModel.findById(userId);
    if (!user || !(await user.comparePassword(password))) {
      errorResponse(res, null, "Invalid password", StatusCodes.UNAUTHORIZED);
      return;
    }
    await userModel.findByIdAndDelete(userId);
    successResponse(res, null, "Account deleted successfully");
  } catch (error) {
    errorResponse(res, error, "Failed to delete account");
  }
}