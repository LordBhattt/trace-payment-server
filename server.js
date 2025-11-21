import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";

import paymentRoutes from "./routes/payment.js";  // ← MUST MATCH FOLDER NAME

import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/user.js";
import rideRoutes from "./routes/ride.js";
import cabRideRoutes from "./routes/cabRide.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// ROUTES
app.use("/api/payment", paymentRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/ride", rideRoutes);
app.use("/api/cabride", cabRideRoutes);
