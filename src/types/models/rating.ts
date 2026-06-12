import { Types } from "mongoose";
import { BaseDocument } from "../common.js";

export interface IRating extends BaseDocument {
  ratedBy: Types.ObjectId;
  productId: Types.ObjectId;
  rating: number;
}