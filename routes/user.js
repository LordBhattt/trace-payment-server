// routes/user.js
const express = require('express');
const Something = require('./somewhere');
import authMiddleware from "../middleware/auth.js";
import User from "../models/User.js";
import CabRide from "../models/CabRide.js";

const router = express.Router();

/* -----------------------------------------
   PROFILE
----------------------------------------- */
router.get("/profile", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    return res.json({ success: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

/* -----------------------------------------
   USER STATS
----------------------------------------- */
router.get("/stats", authMiddleware, async (req, res) => {
  try {
    const rides = await CabRide.find({ userId: req.user.id });

    const completed = rides.filter(r => r.status === "completed").length;
    const totalSpent = rides.reduce((sum, r) => {
      return sum + (r.price || 0);
    }, 0);

    return res.json({
      success: true,
      stats: {
        totalRides: rides.length,
        completedRides: completed,
        rating: 5.0,
        totalSpent,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

module.exports = router;
