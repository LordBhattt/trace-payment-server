<<<<<<< HEAD
require("dotenv").config();
const express = require("express");
const Razorpay = require("razorpay");
const bodyParser = require("body-parser");
const cors = require("cors");
const crypto = require("crypto");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ⚠️ IMPORTANT: Render sets PORT = 10000
const PORT = process.env.PORT || 10000;

// ROOT ROUTE
app.get("/", (req, res) => {
  res.json({ message: "Payment server is running!" });
});

// INIT Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// CREATE ORDER
app.post("/create-order", async (req, res) => {
  try {
    const { amount } = req.body;

    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: "INR",
      receipt: "trace_" + Date.now(),
    });

    res.json({ success: true, order });
  } catch (err) {
    console.error("ORDER ERROR:", err);
    res.status(500).json({ success: false, error: "Order creation failed" });
  }
});

// VERIFY SIGNATURE
app.post("/verify-signature", (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const expectedSign = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(razorpay_order_id + "|" + razorpay_payment_id)
    .digest("hex");

  if (expectedSign === razorpay_signature) {
    return res.json({ success: true });
  }

  res.json({ success: false });
});

// START SERVER (Render will call this)
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
=======
// server.js (CommonJS)
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
>>>>>>> 42ca355994f536b6434e9da8ac20e2503dad5cf1
