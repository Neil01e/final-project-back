import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import contactMessageModel from "../models/contact.js";
import { errorResponse, successResponse } from "../utils/responseFormatter.js";
import { logger } from "../utils/logger.js";
import { sendContactConfirmationEmail, sendReplyEmail } from "../services/email-service.js";

export const submitContact = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      errorResponse(res, null, "All fields are required", StatusCodes.BAD_REQUEST);
      return;
    }

    const contactMessage = await contactMessageModel.create({
      name,
      email,
      subject,
      message,
      isRead: false,
    });

    // Send confirmation email to user
    await sendContactConfirmationEmail(email, name);

    logger.info(`Contact message created: ${contactMessage._id}`);
    successResponse(res, contactMessage, "Message submitted successfully", StatusCodes.CREATED);
  } catch (error) {
    logger.error("Error submitting contact message:", { error });
    errorResponse(res, error, "Failed to submit message");
  }
};

export const getAdminMessages = async (_req: Request, res: Response): Promise<void> => {
  try {
    const messages = await contactMessageModel.find().sort({ createdAt: -1 });
    const unreadCount = await contactMessageModel.countDocuments({ isRead: false });
    const total = await contactMessageModel.countDocuments();

    successResponse(res, { messages, unreadCount, total }, "Messages fetched successfully");
  } catch (error) {
    logger.error("Error fetching admin messages:", { error });
    errorResponse(res, error, "Failed to fetch messages");
  }
};

export const markMessageAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const message = await contactMessageModel.findByIdAndUpdate(id, { isRead: true }, { new: true });

    if (!message) {
      errorResponse(res, null, "Message not found", StatusCodes.NOT_FOUND);
      return;
    }

    successResponse(res, message, "Message marked as read");
  } catch (error) {
    logger.error("Error marking message as read:", { error });
    errorResponse(res, error, "Failed to update message");
  }
};

export const deleteMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const message = await contactMessageModel.findByIdAndDelete(id);

    if (!message) {
      errorResponse(res, null, "Message not found", StatusCodes.NOT_FOUND);
      return;
    }

    successResponse(res, null, "Message deleted successfully");
  } catch (error) {
    logger.error("Error deleting message:", { error });
    errorResponse(res, error, "Failed to delete message");
  }
};

export const sendReplyToMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message) {
      errorResponse(res, null, "Reply message is required", StatusCodes.BAD_REQUEST);
      return;
    }

    const contactMessage = await contactMessageModel.findById(id);

    if (!contactMessage) {
      errorResponse(res, null, "Message not found", StatusCodes.NOT_FOUND);
      return;
    }

    // Send reply email to user
    await sendReplyEmail(contactMessage.email, contactMessage.name, contactMessage.subject, message);

    // Mark as read
    contactMessage.isRead = true;
    await contactMessage.save();

    successResponse(res, contactMessage, "Reply sent successfully");
  } catch (error) {
    logger.error("Error sending reply:", { error });
    errorResponse(res, error, "Failed to send reply");
  }
};