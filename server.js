import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Payment Routes MUST come after express.json()
import paymentRoutes from "./routes/payment.js";

// Other Routes
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/user.js";
import rideRoutes from "./routes/ride.js";
import cabRideRoutes from "./routes/cabRide.js";

// Register Routes
app.use("/api/payment", paymentRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/ride", rideRoutes);
app.use("/api/cabride", cabRideRoutes);

// MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log("MongoDB Error:", err));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);
