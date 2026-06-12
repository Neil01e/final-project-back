import { BaseDocument } from "../common.js";

export interface ICategory extends BaseDocument {
  /** Category name */
  name: string;
}
