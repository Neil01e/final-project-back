import express from "express";
import { errorHandler } from "./middlewares/errorHandler.js";
import authRouter from "./routers/auth.js";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { StatusCodes } from "http-status-codes";
import categoryRouter from "./routers/category.js";
import productRouter from "./routers/product.js";
import orderRouter from "./routers/order.js";
import adminRouter from "./routers/admin.js";
import userRouter from "./routers/user.js";
import { apiLimiter } from "./middlewares/rateLimit.js";

const app = express();

// Setup __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Serve static files from uploads folder (BEFORE routes and 404)
app.use("/uploads", express.static(uploadDir));

// Helmet for security
app.use(helmet());

// CORS
const allowedOrigins = (process.env.FRONTEND_DOMAIN || "http://localhost:3000")
  .split(",")
  .map((o) => o.trim());
app.use(
  cors({
    credentials: true,
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) callback(null, true);
      else callback(new Error(`Cors: origin ${origin} not allowed`));
    },
  }),
);

// Logging
if (process.env.NODE_ENV === "development") app.use(morgan("dev"));

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Rate limiting for API routes
app.use("/api", apiLimiter);

// Routes - NO /api prefix
app.use("/auth", authRouter);
app.use("/categories", categoryRouter);
app.use("/products", productRouter);
app.use("/orders", orderRouter);
app.use("/admin", adminRouter);
app.use("/users", userRouter);

// Health check
app.get("/health", (_req, res) => {
  res.json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

// 404 handler (must be after all routes)
app.use((req, res) => {
  res
    .status(StatusCodes.NOT_FOUND)
    .json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Global error handler
app.use(errorHandler);

export default app;
