import { Request, Response } from "express";
import userModel from "../models/user.js";
import jwt from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";
import { errorResponse, successResponse } from "../utils/responseFormatter.js";
import { type AuthenticatedRequest } from "../types/express.js";
import { logger } from "../utils/logger.js";

export async function register(req: Request, res: Response) {
  const user = req.body;

  try {
    const createdUser = await userModel.create(user);

    const userInfo = {
      _id: createdUser._id.toString(),
      email: createdUser.email,
      role: createdUser.role, // ✅ FIXED: Include role in JWT
      createdAt: new Date(),
    };

    const token = jwt.sign(userInfo, process.env.AUTH_SECRET as string);

    const userObject = createdUser.toObject();
    const { password: _pwd, ...safeUser } = userObject;

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: "You have registered successfully",
      data: safeUser,
      token,
    });
  } catch (error) {
    errorResponse(res, error, "Failed to register !");
  }
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  try {
    const user = await userModel.findOne({ email });
    if (!user) {
      res.status(400).json({
        success: false,
        message: "Wrong email/password",
      });
      return;
    }

    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
      res.status(400).json({
        success: false,
        message: "Wrong email/password",
      });
      return;
    }

    const userInfo = {
      _id: user._id.toString(),
      email: user.email,
      role: user.role, // ✅ FIXED: Include role in JWT
      createdAt: new Date(),
    };

    const token = jwt.sign(userInfo, process.env.AUTH_SECRET as string);

    const userObject = user.toObject();
    const { password: _pwd, ...safeUser } = userObject;

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: "You have logged in successfully",
      data: safeUser,
      token,
    });
  } catch (error) {
    errorResponse(res, error, "Failed to login !");
  }
}

export async function checkUser(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  const user = authReq.user;

  if (!user) {
    res.status(401).json({
      success: false,
      message: "User not found",
    });
    return;
  }

  res.json({
    success: true,
    message: "User is authenticated",
    data: user,
  });
}

export async function changePassword(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user._id;
    const { currentPassword, newPassword } = req.body;

    const user = await userModel.findById(userId);
    if (!user) {
      errorResponse(res, null, "User not found", StatusCodes.NOT_FOUND);
      return;
    }

    const isPasswordCorrect = await user.comparePassword(currentPassword);
    if (!isPasswordCorrect) {
      errorResponse(
        res,
        null,
        "Current password is incorrect",
        StatusCodes.BAD_REQUEST,
      );
      return;
    }

    user.password = newPassword;
    await user.save();

    successResponse(res, null, "Password changed successfully");
  } catch (error) {
    logger.error("Error changing password:", { error });
    errorResponse(res, error, "Failed to change password");
  }
}