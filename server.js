const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ROUTES (CommonJS require)
const paymentRoutes = require("./routes/payment");
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const rideRoutes = require("./routes/ride");
const cabRideRoutes = require("./routes/cabRide");

app.use("/api/payment", paymentRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/ride", rideRoutes);
app.use("/api/cabride", cabRideRoutes);

// MONGODB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("Mongo Error:", err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));