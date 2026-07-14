import { Request, Response } from "express";
import { ContactMessage } from "../models/contact.js";
import {
  sendReplyEmail,
  sendContactConfirmationEmail,
} from "../services/email-service.js";
import { type AuthenticatedRequest } from "../types/express.js";

// POST /contact - Submit contact form (PUBLIC)
export const submitContact = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { name, email, subject, message } = req.body;

    // Validation
    if (!name || !email || !subject || !message) {
      res.status(400).json({
        success: false,
        message: "All fields are required",
      });
      return;
    }

    // Create contact message
    const contactMessage = new ContactMessage({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      subject: subject.trim(),
      message: message.trim(),
      isRead: false,
    });

    await contactMessage.save();

    // Send confirmation email to user
    await sendContactConfirmationEmail(email, name);

    res.status(201).json({
      success: true,
      message: "Message received! We'll get back to you soon.",
      data: contactMessage,
    });
  } catch (error) {
    console.error("Error submitting contact:", error);
    res.status(500).json({
      success: false,
      message: "Error submitting message",
    });
  }
};

// GET /admin/messages - Get all contact messages (ADMIN ONLY)
export const getAdminMessages = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const messages = await ContactMessage.find().sort({ createdAt: -1 }).lean();

    const unreadCount = await ContactMessage.countDocuments({ isRead: false });

    res.status(200).json({
      success: true,
      data: messages,
      unreadCount,
      total: messages.length,
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching messages",
    });
  }
};

// PUT /admin/messages/:id - Mark message as read (ADMIN ONLY)
export const markMessageAsRead = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;

    const message = await ContactMessage.findByIdAndUpdate(
      id,
      { isRead: true },
      { new: true },
    );

    if (!message) {
      res.status(404).json({
        success: false,
        message: "Message not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Message marked as read",
      data: message,
    });
  } catch (error) {
    console.error("Error marking message as read:", error);
    res.status(500).json({
      success: false,
      message: "Error updating message",
    });
  }
};

// DELETE /admin/messages/:id - Delete message (ADMIN ONLY)
export const deleteMessage = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;

    const message = await ContactMessage.findByIdAndDelete(id);

    if (!message) {
      res.status(404).json({
        success: false,
        message: "Message not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Message deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting message:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting message",
    });
  }
};

// POST /admin/messages/:id/reply - Send reply email (ADMIN ONLY)
export const sendReplyToMessage = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { replyMessage } = req.body;

    // Validation
    if (!replyMessage || replyMessage.trim().length === 0) {
      res.status(400).json({
        success: false,
        message: "Reply message cannot be empty",
      });
      return;
    }

    // Find the contact message
    const contactMessage = await ContactMessage.findById(id);

    if (!contactMessage) {
      res.status(404).json({
        success: false,
        message: "Message not found",
      });
      return;
    }

    // Send reply email
    const emailSent = await sendReplyEmail(
      contactMessage.email,
      contactMessage.name,
      contactMessage.subject,
      replyMessage.trim(),
    );

    if (!emailSent) {
      res.status(500).json({
        success: false,
        message: "Error sending reply email",
      });
      return;
    }

    // Mark message as read after replying
    await ContactMessage.findByIdAndUpdate(id, { isRead: true });

    res.status(200).json({
      success: true,
      message: "Reply sent successfully",
    });
  } catch (error) {
    console.error("Error sending reply:", error);
    res.status(500).json({
      success: false,
      message: "Error sending reply",
    });
  }
};
