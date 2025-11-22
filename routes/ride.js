// routes/ride.js
import express from "express";
import authMiddleware from "../middleware/auth.js";
import Ride from "../models/Ride.js"; // old model, kept for compatibility

const router = express.Router();

/* -----------------------------------------
   CREATE RIDE (Legacy API)
----------------------------------------- */
router.post("/create", authMiddleware, async (req, res) => {
  try {
    const ride = await Ride.create({
      user: req.user.id,
      pickup: req.body.pickup,
      drop: req.body.drop,
      distance: req.body.distance,
      duration: req.body.duration,
      fare: req.body.fare,
      cabType: req.body.cabType,
    });

    return res.json({ success: true, ride });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: "Ride creation failed" });
  }
});

export default router;
