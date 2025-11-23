// routes/payment.js
const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const dotenv = require("dotenv");
const CabRide = require("../models/CabRide");
const authMiddleware = require("../middleware/auth");

dotenv.config();

const router = express.Router();

// Razorpay Instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/* ---------------------------------------------------------
   GET PUBLIC KEY  
   GET /api/payment/key
--------------------------------------------------------- */
router.get("/key", authMiddleware, (req, res) => {
  return res.json({
    success: true,
    keyId: process.env.RAZORPAY_KEY_ID,
  });
});

/* ---------------------------------------------------------
   CREATE ORDER
   POST /api/payment/create-order
   (🔥 Fixed receipt length issue)
--------------------------------------------------------- */
router.post("/create-order", authMiddleware, async (req, res) => {
  try {
    const { rideId } = req.body;

    if (!rideId) {
      return res.status(400).json({
        success: false,
        message: "rideId is required",
      });
    }

    // Fetch ride from DB for authoritative fare
    const ride = await CabRide.findOne({
      _id: rideId,
      userId: req.user.id,
    });

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: "Ride not found",
      });
    }

    if (ride.status !== "completed") {
      return res.status(400).json({
        success: false,
        message: "Ride must be completed before payment",
      });
    }

    // Fare from backend only
    const amount = ride.pricing.totalFare;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid fare amount",
      });
    }

    // 🔥 FIX: Razorpay receipt must be < 40 chars
    const shortId = rideId.toString().slice(-6);
    const timeShort = Date.now().toString().slice(-4);

    const options = {
      amount: Math.round(amount * 100), // paise
      currency: "INR",
      receipt: `rcpt_${shortId}_${timeShort}`, // ALWAYS < 40 chars
    };

    const order = await razorpay.orders.create(options);

    return res.json({
      success: true,
      orderId: order.id,
      amount,
      ride,
    });
  } catch (err) {
    console.error("Order Error:", err);
    return res.status(500).json({
      success: false,
      message: "Order creation failed",
    });
  }
});

/* ---------------------------------------------------------
   VERIFY PAYMENT
   POST /api/payment/verify
--------------------------------------------------------- */
router.post("/verify", authMiddleware, async (req, res) => {
  try {
    const { paymentId, orderId, signature, rideId } = req.body;

    if (!paymentId || !orderId || !signature || !rideId) {
      return res.status(400).json({
        success: false,
        message: "Missing fields",
      });
    }

    // Fetch ride
    const ride = await CabRide.findOne({
      _id: rideId,
      userId: req.user.id,
    });

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: "Ride not found",
      });
    }

    // Idempotent check
    if (ride.isPaid && ride.paymentId === paymentId) {
      return res.json({
        success: true,
        message: "Payment already verified",
        ride,
      });
    }

    // Validate signature
    const expectedSig = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(orderId + "|" + paymentId)
      .digest("hex");

    if (expectedSig !== signature) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature",
      });
    }

    // Update ride
    ride.paymentId = paymentId;
    ride.orderId = orderId;
    ride.signature = signature;
    ride.isPaid = true;
    ride.status = "paid";
    ride.paidAt = new Date();

    await ride.save();

    return res.json({
      success: true,
      message: "Payment verified successfully",
      ride,
    });
  } catch (err) {
    console.error("Verify Error:", err);
    return res.status(500).json({
      success: false,
      message: "Payment verification failed",
    });
  }
});

module.exports = router;
