// routes/user.js
const express = require("express");
const User = require("../models/User");
const CabRide = require("../models/CabRide");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

/* ===================================
   UPDATE FCM TOKEN
=================================== */
router.post("/fcm-token", authMiddleware, async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "FCM token is required",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { fcmToken: token },
      { new: true }
    );

    return res.json({
      success: true,
      message: "FCM token updated",
    });
  } catch (err) {
    console.error("Update FCM Token Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

/* ===================================
   GET USER PROFILE
=================================== */
router.get("/profile", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({
      success: true,
      user,
    });
  } catch (err) {
    console.error("Get Profile Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

/* ===================================
   GET USER STATS
=================================== */
router.get("/stats", authMiddleware, async (req, res) => {
  try {
    const totalRides = await CabRide.countDocuments({ userId: req.user.id });
    const completedRides = await CabRide.countDocuments({
      userId: req.user.id,
      status: "paid",
    });

    const earnings = await CabRide.aggregate([
      { $match: { userId: req.user.id, isPaid: true } },
      { $group: { _id: null, total: { $sum: "$pricing.totalFare" } } },
    ]);

    const totalSpent = earnings.length > 0 ? earnings[0].total : 0;

    // Calculate distance
    const distanceData = await CabRide.aggregate([
      { $match: { userId: req.user.id, isPaid: true } },
      { $group: { _id: null, total: { $sum: "$distanceKm" } } },
    ]);

    const totalDistance = distanceData.length > 0 ? distanceData[0].total : 0;

    return res.json({
      success: true,
      stats: {
        totalRides,
        completedRides,
        totalSpent,
        totalDistance: Math.round(totalDistance * 10) / 10,
      },
    });
  } catch (err) {
    console.error("Get User Stats Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

module.exports = router;