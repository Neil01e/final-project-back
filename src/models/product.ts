import { Schema, model, type Model, Types } from "mongoose";

export interface IProduct {
  _id?: Types.ObjectId;
  title: string;
  slug: string;
  category: "game" | "console" | "pc" | "accessory" | "collectible" | "giftcard";
  subcategory?: string;
  type?: "video" | "society";
  price: number;
  stock: number;
  status: "active" | "out-of-stock";
  description: string;
  coverImage?: string;
  images?: string[];
  specs?: Map<string, string>;
  brand?: string;
  platform?: string[];
  publisher?: string;
  releaseYear?: number;
  categoryId?: Types.ObjectId;
  avgRating: number;
  ratingCount: number;
  salesCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    title: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true },
    category: {
      type: String,
      enum: ["game", "console", "pc", "accessory", "collectible", "giftcard"],
      required: true,
    },
    subcategory: String,
    type: { type: String, enum: ["video", "society"] },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ["active", "out-of-stock"], default: "active" },
    description: { type: String, required: true },
    coverImage: String,
    images: [String],
    specs: { type: Map, of: String },
    brand: String,
    platform: [String],
    publisher: String,
    releaseYear: Number,
    categoryId: { type: Schema.Types.ObjectId, ref: "category" },
    avgRating: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0 },
    salesCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

productSchema.index(
  { title: "text", description: "text", brand: "text" },
  { name: "search_index" }
);

const productModel: Model<IProduct> = model<IProduct>("product", productSchema);
export default productModel;