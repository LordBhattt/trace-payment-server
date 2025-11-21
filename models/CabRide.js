// models/CabRide.js
import mongoose from "mongoose";

const CabRideSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    pickup: {
      label: String,
      lat: Number,
      lon: Number,
    },

    drop: {
      label: String,
      lat: Number,
      lon: Number,
    },

    distanceKm: {
      type: Number,
      required: true,
    },

    etaMin: {
      type: Number,
      required: true,
    },

    price: {
      type: Number,
      default: null, // calculated later after ride creation
    },

    status: {
      type: String,
      enum: ["pending", "active", "completed", "cancelled", "paid"],
      default: "pending",
    },

    selectedSuggestions: {
      type: [Number],
      default: [],
    },

    confirmedAt: {
      type: Date,
      default: Date.now,
    },

    /* ----------------------------------------
       🔥 Razorpay Payment Fields (Phase 4)
    ---------------------------------------- */
    paymentId: { type: String },
    orderId: { type: String },
    signature: { type: String },

    isPaid: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model("CabRide", CabRideSchema);
