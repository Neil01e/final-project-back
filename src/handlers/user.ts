import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import userModel from "../models/user.js";
import { errorResponse, successResponse } from "../utils/responseFormatter.js";
import { logger } from "../utils/logger.js";
import { Types } from "mongoose";
import type { AuthenticatedRequest } from "../types/express.js";
import type { CartItem } from "../types/models/user.js";

export async function getProfile(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user._id;
    const user = await userModel.findById(userId).select("-password");

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
    const { firstName, lastName, phone, bio } = req.body;

    const user = await userModel.findByIdAndUpdate(
      userId,
      { firstName, lastName, phone, bio },
      { new: true }
    ).select("-password");

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

export async function getUserStats(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user._id;

    const user = await userModel.findById(userId);
    if (!user) {
      errorResponse(res, null, "User not found", StatusCodes.NOT_FOUND);
      return;
    }

    const stats = {
      cartItems: user.cart?.length || 0,
      wishlistItems: user.wishlist?.length || 0,
      purchasedProducts: user.products?.purchased?.length || 0,
      favoriteProducts: user.products?.favorites?.length || 0,
    };

    successResponse(res, stats, "User stats fetched successfully");
  } catch (error) {
    logger.error("Error fetching user stats:", { error });
    errorResponse(res, error, "Failed to fetch user stats");
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

    successResponse(res, user.cart, "Cart fetched successfully");
  } catch (error) {
    logger.error("Error fetching cart:", { error });
    errorResponse(res, error, "Failed to fetch cart");
  }
}

export async function addToCart(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user._id;
    const { productId, quantity } = req.body;

    const user = await userModel.findById(userId);

    if (!user) {
      errorResponse(res, null, "User not found", StatusCodes.NOT_FOUND);
      return;
    }

    const existingItem = user.cart?.find((item) => item.productId.toString() === productId);

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      user.cart?.push({
        productId: new Types.ObjectId(productId),
        quantity,
        addedAt: new Date(),
      });
    }

    await user.save();
    const updatedUser = await userModel.findById(userId).populate("cart.productId");

    successResponse(res, updatedUser?.cart, "Item added to cart");
  } catch (error) {
    logger.error("Error adding to cart:", { error });
    errorResponse(res, error, "Failed to add item to cart");
  }
}

export async function updateCartItem(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const { productId } = req.params;
    const { quantity } = req.body;
    const userId = authReq.user._id;

    const user = await userModel.findById(userId);

    if (!user) {
      errorResponse(res, null, "User not found", StatusCodes.NOT_FOUND);
      return;
    }

    const cartItem = user.cart?.find((item) => item.productId.toString() === productId);

    if (!cartItem) {
      errorResponse(res, null, "Item not found in cart", StatusCodes.NOT_FOUND);
      return;
    }

    cartItem.quantity = quantity;
    await user.save();

    const updatedUser = await userModel.findById(userId).populate("cart.productId");

    if (!updatedUser) {
      errorResponse(res, null, "User not found", StatusCodes.NOT_FOUND);
      return;
    }

    const cartItems = updatedUser.cart.map((item: CartItem) => ({
      productId: item.productId,
      quantity: item.quantity,
      addedAt: item.addedAt,
    }));

    successResponse(res, cartItems, "Cart item updated");
  } catch (error) {
    logger.error("Error updating cart item:", { error });
    errorResponse(res, error, "Failed to update cart item");
  }
}

export async function removeFromCart(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const { productId } = req.params;
    const userId = authReq.user._id;

    const user = await userModel.findById(userId);

    if (!user) {
      errorResponse(res, null, "User not found", StatusCodes.NOT_FOUND);
      return;
    }

    user.cart = user.cart?.filter((item) => item.productId.toString() !== productId) || [];
    await user.save();

    const updatedUser = await userModel.findById(userId).populate("cart.productId");

    if (!updatedUser) {
      errorResponse(res, null, "User not found", StatusCodes.NOT_FOUND);
      return;
    }

    successResponse(res, updatedUser.cart, "Item removed from cart");
  } catch (error) {
    logger.error("Error removing from cart:", { error });
    errorResponse(res, error, "Failed to remove item from cart");
  }
}

export async function clearCart(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user._id;

    await userModel.findByIdAndUpdate(userId, { cart: [] });

    successResponse(res, [], "Cart cleared successfully");
  } catch (error) {
    logger.error("Error clearing cart:", { error });
    errorResponse(res, error, "Failed to clear cart");
  }
}

export async function getWishlist(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user._id;

    const user = await userModel.findById(userId).populate("wishlist");

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

export async function addToWishlist(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    const userId = authReq.user._id;

    const user = await userModel.findById(userId);

    if (!user) {
      errorResponse(res, null, "User not found", StatusCodes.NOT_FOUND);
      return;
    }

    if (!user.wishlist.includes(new Types.ObjectId(id))) {
      user.wishlist.push(new Types.ObjectId(id));
      await user.save();
    }

    const updatedUser = await userModel.findById(userId).populate("wishlist");
    successResponse(res, updatedUser?.wishlist, "Item added to wishlist");
  } catch (error) {
    logger.error("Error adding to wishlist:", { error });
    errorResponse(res, error, "Failed to add item to wishlist");
  }
}

export async function removeFromWishlist(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    const userId = authReq.user._id;

    const user = await userModel.findById(userId);

    if (!user) {
      errorResponse(res, null, "User not found", StatusCodes.NOT_FOUND);
      return;
    }

    user.wishlist = user.wishlist.filter((item) => item.toString() !== id);
    await user.save();

    const updatedUser = await userModel.findById(userId).populate("wishlist");
    successResponse(res, updatedUser?.wishlist, "Item removed from wishlist");
  } catch (error) {
    logger.error("Error removing from wishlist:", { error });
    errorResponse(res, error, "Failed to remove item from wishlist");
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
    const user = await userModel.findByIdAndUpdate(userId, { avatar: avatarUrl }, { new: true }).select(
      "-password"
    );

    if (!user) {
      errorResponse(res, null, "User not found", StatusCodes.NOT_FOUND);
      return;
    }

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

    const user = await userModel.findByIdAndUpdate(userId, { avatar: "" }, { new: true }).select(
      "-password"
    );

    if (!user) {
      errorResponse(res, null, "User not found", StatusCodes.NOT_FOUND);
      return;
    }

    successResponse(res, user, "Avatar removed successfully");
  } catch (error) {
    logger.error("Error removing avatar:", { error });
    errorResponse(res, error, "Failed to remove avatar");
  }
}

export async function changeEmail(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user._id;
    const { email } = req.body;

    const user = await userModel.findByIdAndUpdate(userId, { email }, { new: true }).select("-password");

    if (!user) {
      errorResponse(res, null, "User not found", StatusCodes.NOT_FOUND);
      return;
    }

    successResponse(res, user, "Email updated successfully");
  } catch (error) {
    logger.error("Error changing email:", { error });
    errorResponse(res, error, "Failed to change email");
  }
}

export async function deleteAccount(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user._id;

    await userModel.findByIdAndDelete(userId);

    successResponse(res, null, "Account deleted successfully");
  } catch (error) {
    logger.error("Error deleting account:", { error });
    errorResponse(res, error, "Failed to delete account");
  }
}

export async function getSettings(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user._id;

    const user = await userModel.findById(userId);

    if (!user) {
      errorResponse(res, null, "User not found", StatusCodes.NOT_FOUND);
      return;
    }

    successResponse(res, user.settings, "Settings fetched successfully");
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

    const user = await userModel.findByIdAndUpdate(
      userId,
      {
        settings: {
          orderNotifications,
          promoNotifications,
        },
      },
      { new: true }
    );

    if (!user) {
      errorResponse(res, null, "User not found", StatusCodes.NOT_FOUND);
      return;
    }

    successResponse(res, user.settings, "Settings updated successfully");
  } catch (error) {
    logger.error("Error updating settings:", { error });
    errorResponse(res, error, "Failed to update settings");
  }
}