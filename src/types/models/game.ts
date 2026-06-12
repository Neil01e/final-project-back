import { Types } from "mongoose";
import { GameStatus, GameType } from "../common.js";

export interface IGame {
  /** Game title */
  title: string;
  /** Game type (video or society) */
  type: GameType;
  /** Current selling price */
  price: number;
  /** Available stock */
  stock: number;
  /** Game availability status */
  status: GameStatus;
  /** Game description */
  description: string;
  /** Cover image URL (optional) */
  coverImage?: string;
  /** Game genre (Action, RPG, Strategy, Board, Card, Party, etc.) */
  genre: string;
  /** Publisher name (optional) */
  publisher?: string;
  /** Release year (optional) */
  releaseYear?: number;
  /** Reference to category document (optional) */
  category?: Types.ObjectId;
  /** Average rating from users */
  avgRating?: number;
  /** Total number of ratings */
  ratingCount?: number;
}
