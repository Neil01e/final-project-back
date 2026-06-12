import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import categoryModel from "../models/category.js";
import { logger } from "../utils/logger.js";
import { successResponse, errorResponse } from "../utils/responseFormatter.js";
import productModel from "../models/product.js";

export async function getCategories(_req: Request, res: Response): Promise<void> {
  try {
    const categories = await categoryModel.find().sort({ name: 1 });
    successResponse(res, categories, "Categories fetched successfully");
  } catch (error) {
    logger.error("Error fetching categories:", { error });
    errorResponse(res, error, "Failed to fetch categories");
  }
}

export async function createCategory(req: Request, res: Response): Promise<void> {
  try {
    const category = await categoryModel.create(req.body);
    successResponse(res, category.toObject ? category.toObject() : category, "Category created successfully", StatusCodes.CREATED);
  } catch (error) {
    logger.error("Error creating category:", { error });
    const err = error as Error & { code?: number };
    if (err.code === 11000) {
      errorResponse(res, err, "Category already exists", StatusCodes.CONFLICT);
    } else {
      errorResponse(res, err, "Failed to create category", StatusCodes.BAD_REQUEST);
    }
  }
}

export async function getCategoryById(req: Request, res: Response): Promise<void> {
  try {
    const category = await categoryModel.findById(req.params.id);
    if (!category) {
      errorResponse(res, null, "Category not found", StatusCodes.NOT_FOUND);
      return;
    }
    successResponse(res, category, "Category fetched successfully");
  } catch (error) {
    logger.error("Error fetching category:", { error });
    errorResponse(res, error, `Failed to fetch category ${req.params.id}`);
  }
}

export async function updateCategory(req: Request, res: Response): Promise<void> {
  try {
    const category = await categoryModel.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    if (!category) {
      errorResponse(res, null, "Category not found", StatusCodes.NOT_FOUND);
      return;
    }
    successResponse(res, category, "Category updated successfully");
  } catch (error) {
    logger.error("Error updating category:", { error });
    errorResponse(res, error, `Failed to update category ${req.params.id}`);
  }
}

export async function deleteCategory(req: Request, res: Response): Promise<void> {
  try {
    const productCount = await productModel.countDocuments({ categoryId: req.params.id });
    if (productCount > 0) {
      errorResponse(res, null, `Cannot delete category with ${productCount} associated product(s). Reassign them first.`, StatusCodes.BAD_REQUEST);
      return;
    }
    const category = await categoryModel.findByIdAndDelete(req.params.id);
    if (!category) {
      errorResponse(res, null, "Category not found", StatusCodes.NOT_FOUND);
      return;
    }
    successResponse(res, category, "Category deleted successfully");
  } catch (error) {
    logger.error("Error deleting category:", { error });
    errorResponse(res, error, `Failed to delete category ${req.params.id}`);
  }
}