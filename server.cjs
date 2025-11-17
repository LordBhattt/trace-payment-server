require("dotenv").config();
const express = require("express");
const Razorpay = require("razorpay");
const bodyParser = require("body-parser");
const cors = require("cors");       // ✅ FIX 1: Enable CORS

const app = express();
app.use(cors());                    // ✅ FIX 1: Required for mobile app requests
app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.send("TRACE payment server is running 🚀");
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

    const options = {
      amount: amount * 100,
      currency: "INR",
      receipt: "trace_receipt_" + Date.now(),
    };

    const order = await razorpay.orders.create(options);

    res.json({
      success: true,
      order,
    });
  } catch (err) {
    console.error("ORDER ERROR:", err);
    res.status(500).json({ success: false, error: "Failed to create order" });
  }
});

// VERIFY SIGNATURE
app.post("/verify-signature", (req, res) => {
  const crypto = require("crypto");
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const body = razorpay_order_id + "|" + razorpay_payment_id;

  const expectedSign = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  if (expectedSign === razorpay_signature) {
    return res.json({ success: true });
  } else {
    return res.json({ success: false });
  }
});

// START SERVER
const PORT = process.env.PORT || 8080;   // ✅ FIX 2
app.listen(PORT, () => console.log("Server running on port", PORT));
