import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";

import paymentRoutes from "./routes/payment.js";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/user.js";
import rideRoutes from "./routes/ride.js";
import cabRideRoutes from "./routes/cabRide.js";

dotenv.config();

const app = express();

// MIDDLEWARES
app.use(cors());
app.use(express.json());

// ROUTES
app.use("/api/payment", paymentRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/ride", rideRoutes);
app.use("/api/cabride", cabRideRoutes);

// MONGO CONNECTION
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("❌ MongoDB connection error →", err);
    process.exit(1);
  });

// START SERVER
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
