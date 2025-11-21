const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Ride = require('../models/Ride');

// PROFILE
router.get('/profile', auth, async (req, res) => {
  const user = await User.findById(req.user.id);
  return res.json({ success: true, user });
});

// STATS
router.get('/stats', auth, async (req, res) => {
  const rides = await Ride.find({ user: req.user.id });

  const completed = rides.filter(r => r.status === "completed").length;
  const totalSpent = rides.reduce((sum, r) => sum + (r.fare?.total || 0), 0);

  return res.json({
    success: true,
    stats: {
      totalRides: rides.length,
      completedRides: completed,
      rating: 5.0,
      totalSpent
    }
  });
});

module.exports = router;
