import { z } from "zod/v4";

/**
 * Rating schema
 * Validates game rating (1-5 stars)
 */
export const ratingSchema = z.object({
  rating: z
    .number()
    .min(1, "Rating has to have at least 1")
    .max(5, "Rating must have at max 5"),
});
