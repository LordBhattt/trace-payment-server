import express from "express";
import CabRide from "../models/CabRide.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

/* ---------------------------------------------------
   CREATE RIDE
---------------------------------------------------- */
router.post("/create", authMiddleware, async (req, res) => {
  try {
    const {
      pickup,
      drop,
      distanceKm,
      etaMin,
      price,
      selectedSuggestions = [],
    } = req.body;

    const ride = await CabRide.create({
      userId: req.user.id,
      pickup,
      drop,
      distanceKm,
      etaMin,
      price: price ?? null,                 // frontend calculates fare later
      selectedSuggestions,
      status: "pending",
      confirmedAt: new Date(),
    });

    return res.json({ success: true, ride });
  } catch (err) {
    console.error("Create Ride Error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to create ride" });
  }
});

/* ---------------------------------------------------
   CANCEL RIDE
   RULES:
   - Cannot cancel after completion
   - Cannot cancel after 3 minutes
---------------------------------------------------- */
router.post("/cancel", authMiddleware, async (req, res) => {
  try {
    const { rideId } = req.body;

    const ride = await CabRide.findOne({
      _id: rideId,
      userId: req.user.id,
    });

    if (!ride) {
      return res
        .status(404)
        .json({ success: false, message: "Ride not found" });
    }

    if (ride.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "Ride already completed — cannot cancel",
      });
    }

    // check 3-minute rule
    const diffMin =
      (Date.now() - new Date(ride.confirmedAt).getTime()) / 60000;

    if (diffMin > 3) {
      return res.status(400).json({
        success: false,
        message: "Cancellation window expired (3 minutes passed)",
      });
    }

    ride.status = "cancelled";
    await ride.save();

    return res.json({ success: true });
  } catch (err) {
    console.error("Cancel Ride Error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to cancel ride" });
  }
});

/* ---------------------------------------------------
   MARK RIDE COMPLETED
   (Called AFTER payment verification)
---------------------------------------------------- */
router.post("/complete", authMiddleware, async (req, res) => {
  try {
    const { rideId } = req.body;

    const ride = await CabRide.findOne({
      _id: rideId,
      userId: req.user.id,
    });

    if (!ride) {
      return res
        .status(404)
        .json({ success: false, message: "Ride not found" });
    }

    if (ride.status === "completed") {
      return res.json({ success: true, ride });
    }

    ride.status = "completed";
    await ride.save();

    return res.json({ success: true, ride });
  } catch (err) {
    console.error("Complete Ride Error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to complete ride" });
  }
});

/* ---------------------------------------------------
   RIDE HISTORY
---------------------------------------------------- */
router.get("/history", authMiddleware, async (req, res) => {
  try {
    const rides = await CabRide.find({ userId: req.user.id }).sort({
      createdAt: -1,
    });

    return res.json({ success: true, rides });
  } catch (err) {
    console.error("Ride History Error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch ride history" });
  }
});

export default router;
