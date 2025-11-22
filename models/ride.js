// models/Ride.js
import mongoose from "mongoose";

const rideSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      default: null,
    },

    pickup: {
      address: String,
      coordinates: [Number], // [lng, lat]
    },

    drop: {
      address: String,
      coordinates: [Number],
    },

    distance: Number,
    duration: Number,

    fare: {
      baseFare: Number,
      distanceFare: Number,
      timeFare: Number,
      total: Number,
    },

    cabType: String,

    status: {
      type: String,
      default: "created", // created, assigned, arriving, in-progress, completed, cancelled
    },

    paymentStatus: {
      type: String,
      default: "pending", // pending, paid, failed
    },

    razorpayOrderId: String,
    razorpayPaymentId: String,
  },
  { timestamps: true }
);

const Ride = mongoose.model("Ride", rideSchema);
export default Ride;
