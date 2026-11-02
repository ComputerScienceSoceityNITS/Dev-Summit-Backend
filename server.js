const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");
const { isAllowedOrigin } = require("./utils/requestOrigin");

// Import Route Handlers
const authRoutes = require("./routes/auth.routes");
const eventRoutes = require("./routes/event.routes");
const registrationRoutes = require("./routes/registration.routes");
const adminRoutes = require("./routes/admin.routes");

// Import Middleware
const {
  notFoundHandler,
  errorHandler,
} = require("./middleware/error.middleware");
const { successResponse } = require("./utils/responseHandler");

const app = express();

// CORS Configuration
app.use(
  cors({
    origin: (origin, callback) => {
      return callback(null, isAllowedOrigin(origin));
    },
    credentials: true,
  }),
);

// Request body parsers
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// Health check endpoint
app.get("/api/health", (req, res) => {
  return successResponse(res, 200, "Dev Summit API is active and healthy", {
    status: "UP",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    service: "Dev Summit 2026 Backend",
  });
});

// Mount Resource Routes
app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/registrations", registrationRoutes);
app.use("/api/admin", adminRoutes);

// Catch 404s
app.use(notFoundHandler);

// Central error-handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

module.exports = app;

if (process.env.NODE_ENV !== "test") {
  const startServer = async () => {
    await connectDB();
    app.listen(PORT, () => {
      console.log(
        `[Dev Summit] Server listening on port ${PORT} (${process.env.NODE_ENV || "development"})`,
      );
      console.log(
        `[Dev Summit] Health check: http://localhost:${PORT}/api/health`,
      );
    });
  };

  startServer().catch((error) => {
    console.error("[Dev Summit] Server startup failed:", error);
    process.exitCode = 1;
  });
}
