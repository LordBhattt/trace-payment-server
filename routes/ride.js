const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Ride = require('../models/Ride');

// CREATE RIDE
router.post('/create', auth, async (req, res) => {
  try {
    const ride = await Ride.create({
      user: req.user.id,
      pickup: req.body.pickup,
      drop: req.body.drop,
      distance: req.body.distance,
      duration: req.body.duration,
      fare: req.body.fare,
      cabType: req.body.cabType
    });

    return res.json({ success: true, ride });

  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Ride creation failed" });
  }
});

module.exports = router;
