import { model, Schema } from "mongoose";
import type { IUserDocument } from "../types/models/user.js";
import bcrypt from "bcrypt";

const userSchema = new Schema<IUserDocument>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: String,
    avatar: { type: String, default: "" },
    bio: { type: String, maxlength: 500 },
    lastAgeChange: { type: Date, default: null as unknown as Date },
    role: {
      type: String,
      enum: ["admin", "moderator", "user"],
      default: "user",
    },
    products: {
      favorites: [{ type: Schema.Types.ObjectId, ref: "product" }],
      purchased: [{ type: Schema.Types.ObjectId, ref: "product" }],
    },
    wishlist: [{ type: Schema.Types.ObjectId, ref: "product" }],
    cart: [
      {
        productId: {
          type: Schema.Types.ObjectId,
          ref: "product",
          required: true,
        },
        quantity: { type: Number, default: 1, min: 1 },
        addedAt: { type: Date, default: Date.now },
      },
    ],
    settings: {
      orderNotifications: { type: Boolean, default: true },
      promoNotifications: { type: Boolean, default: false },
    },
  },
  { timestamps: true, toJSON: { versionKey: false } },
);

userSchema.pre("save", async function () {
  if (this.isNew || this.isModified("password")) {
    const doc = this as any;
    doc.password = await bcrypt.hash(doc.password, 10);
  }
});

userSchema.methods.comparePassword = async function (
  requestedPassword: string,
): Promise<boolean> {
  return bcrypt.compare(requestedPassword, this.password);
};

const userModel = model<IUserDocument>("user", userSchema);
export default userModel;