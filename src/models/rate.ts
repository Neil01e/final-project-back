import { Schema, model, type Model } from "mongoose";
import type { IRating } from "../types/models/rating.js";

const rateSchema = new Schema<IRating>(
  {
    ratedBy: { type: Schema.Types.ObjectId, ref: "user", required: true },
    productId: { type: Schema.Types.ObjectId, ref: "product", required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
  },
  { timestamps: true }
);

rateSchema.index({ ratedBy: 1, productId: 1 }, { unique: true });

const rateModel: Model<IRating> = model<IRating>("rating", rateSchema);
export default rateModel;