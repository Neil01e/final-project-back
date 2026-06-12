import { z } from "zod/v4";

const basicPasswordSchema = z
  .string()
  .min(6, "Password must be at least 6 characters");

export const loginSchema = z.object({
  email: z.string().email("Email must be valid").trim().toLowerCase(),
  password: basicPasswordSchema,
});

export const userSchema = loginSchema.extend({
  firstName: z
    .string()
    .min(3, "First name must have at least 3 letters")
    .max(70, "First name must have at most 70 letters"),
  lastName: z
    .string()
    .min(3, "Last name must have at least 3 letters")
    .max(70, "Last name must have at most 70 letters"),
  phone: z.string().optional(),
  avatar: z.string().url().optional(),
});

export const fullUserSchema = userSchema.extend({
  role: z.enum(["admin", "moderator", "user"]).optional(),
});

export const profileUpdateSchema = z.object({
  firstName: z
    .string()
    .min(3, "First name must have at least 3 letters")
    .max(70, "First name must have at most 70 letters")
    .optional(),
  lastName: z
    .string()
    .min(3, "Last name must have at least 3 letters")
    .max(70, "Last name must have at most 70 letters")
    .optional(),
  phone: z.string().optional().or(z.literal("")),
  avatar: z.string().url("Avatar must be a valid URL").optional().or(z.literal("")),
  bio: z.string().max(500, "Bio must be at most 500 characters").optional().or(z.literal("")),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: basicPasswordSchema,
});

// ====================
// Settings & Account Management
// ====================

export const settingsSchema = z.object({
  orderNotifications: z.boolean(),
  promoNotifications: z.boolean(),
});

export const changeEmailSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const deleteAccountSchema = z.object({
  password: z.string().min(1, "Password is required"),
});