// models/CabRide.js
const mongoose = require("mongoose");

/**
 * CabRide Model - Complete & Production Ready
 * 
 * This model supports the full ride lifecycle:
 * - Ride creation with backend-computed pricing
 * - Status transitions (confirmed → assigned → arriving → atPickup → started → completed → paid)
 * - Razorpay payment tracking
 * - Cancellation rules (3-minute window, cannot cancel after started)
 * - Food stop management
 * - Driver assignment tracking
 * - Comprehensive timestamps
 */

const CabRideSchema = new mongoose.Schema(
  {
    // ===== USER REFERENCE =====
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // Index for faster queries
    },

    // ===== LOCATION DATA =====
    pickup: {
      label: { type: String, default: "Pickup Location" },
      lat: { type: Number, required: true },
      lon: { type: Number, required: true },
    },

    drop: {
      label: { type: String, default: "Drop Location" },
      lat: { type: Number, required: true },
      lon: { type: Number, required: true },
    },

    // ===== ROUTE DETAILS =====
    distanceKm: {
      type: Number,
      required: true,
      min: 0,
    },

    etaMin: {
      type: Number,
      required: true,
      min: 0,
    },

    // ===== FOOD DELIVERY INTEGRATION =====
    foodStops: {
      type: Number,
      default: 0,
      min: 0,
      max: 5, // Global max as per business rules
    },

    selectedSuggestions: {
      type: [mongoose.Schema.Types.Mixed], // Array of suggestion objects or IDs
      default: [],
    },

    // ===== PRICING (BACKEND AUTHORITATIVE) =====
    pricing: {
      baseFare: { 
        type: Number, 
        default: 0,
        min: 0,
      },
      distanceFare: { 
        type: Number, 
        default: 0,
        min: 0,
      },
      timeFare: { 
        type: Number, 
        default: 0,
        min: 0,
      },
      foodStopFare: { 
        type: Number, 
        default: 0,
        min: 0,
      },
      totalFare: { 
        type: Number, 
        default: 0,
        min: 0,
        required: true,
      },
    },

    // ===== RIDE LIFECYCLE STATUS =====
    status: {
      type: String,
      enum: [
        "pending",      // Initial state (rarely used, goes straight to confirmed)
        "confirmed",    // Ride created, looking for driver
        "assigned",     // Driver assigned
        "arriving",     // Driver heading to pickup
        "atPickup",     // Driver reached pickup location
        "started",      // Trip started (OTP verified / pickup complete)
        "completed",    // Destination reached
        "paid",         // Payment verified
        "cancelled",    // Ride cancelled by user/system
      ],
      default: "confirmed",
      required: true,
      index: true, // Index for status-based queries
    },

    // ===== CRITICAL TIMESTAMPS FOR BUSINESS LOGIC =====
    
    // When ride was confirmed (used for 3-minute cancellation window)
    confirmedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },

    // When trip actually started (prevents cancellation after this)
    startedAt: {
      type: Date,
      default: null,
    },

    // When destination was reached
    completedAt: {
      type: Date,
      default: null,
    },

    // When payment was verified
    paidAt: {
      type: Date,
      default: null,
    },

    // When ride was cancelled (if applicable)
    cancelledAt: {
      type: Date,
      default: null,
    },

    // ===== PAYMENT INTEGRATION (RAZORPAY) =====
    paymentId: { 
      type: String,
      default: null,
      index: true, // For payment lookup
    },

    orderId: { 
      type: String,
      default: null,
      index: true, // For order lookup
    },

    signature: { 
      type: String,
      default: null,
    },

    isPaid: {
      type: Boolean,
      default: false,
      required: true,
      index: true, // For filtering paid rides
    },

    // ===== DRIVER ASSIGNMENT =====
    driver: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Driver",
        default: null,
      },
      name: { 
        type: String, 
        default: null,
      },
      phone: { 
        type: String, 
        default: null,
      },
      vehicle: { 
        type: String, 
        default: null,
      },
      plate: { 
        type: String, 
        default: null,
      },
      rating: { 
        type: Number, 
        default: null,
        min: 0,
        max: 5,
      },
    },

    // ===== CANCELLATION TRACKING =====
    cancellationReason: {
      type: String,
      default: null,
    },

    cancelledBy: {
      type: String,
      enum: ["user", "driver", "system", null],
      default: null,
    },

    // ===== ADDITIONAL METADATA =====
    notes: {
      type: String,
      default: null,
      maxlength: 500,
    },

    // Rating given by user after ride
    userRating: {
      rating: {
        type: Number,
        min: 1,
        max: 5,
        default: null,
      },
      feedback: {
        type: String,
        maxlength: 500,
        default: null,
      },
    },

    // OTP for pickup verification (if implementing OTP feature)
    pickupOTP: {
      type: String,
      default: null,
    },

    // For analytics and debugging
    metadata: {
      appVersion: String,
      deviceType: String,
      platform: String,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
    collection: "cabrides", // Explicit collection name
  }
);

// ===== INDEXES FOR PERFORMANCE =====
CabRideSchema.index({ userId: 1, createdAt: -1 }); // User ride history
CabRideSchema.index({ status: 1, confirmedAt: -1 }); // Status-based queries
CabRideSchema.index({ isPaid: 1, completedAt: -1 }); // Payment reports
CabRideSchema.index({ "driver.id": 1, status: 1 }); // Driver assignments

// ===== VIRTUAL FIELDS =====

// Check if ride can be cancelled (3-minute window + not started)
CabRideSchema.virtual("canCancel").get(function () {
  if (["started", "completed", "paid", "cancelled"].includes(this.status)) {
    return false;
  }

  const diffMin = (Date.now() - new Date(this.confirmedAt).getTime()) / 60000;
  return diffMin <= 3;
});

// Check if payment is pending (completed but not paid)
CabRideSchema.virtual("isPaymentPending").get(function () {
  return this.status === "completed" && !this.isPaid;
});

// Total ride duration (from start to completion)
CabRideSchema.virtual("rideDurationMin").get(function () {
  if (!this.startedAt || !this.completedAt) return null;
  return Math.round(
    (new Date(this.completedAt) - new Date(this.startedAt)) / 60000
  );
});

// ===== INSTANCE METHODS =====

/**
 * Mark ride as cancelled
 * @param {String} reason - Cancellation reason
 * @param {String} by - Who cancelled (user/driver/system)
 */
CabRideSchema.methods.cancel = function (reason = null, by = "user") {
  this.status = "cancelled";
  this.cancelledAt = new Date();
  this.cancellationReason = reason;
  this.cancelledBy = by;
  return this.save();
};

/**
 * Assign driver to ride
 * @param {Object} driverData - Driver information
 */
CabRideSchema.methods.assignDriver = function (driverData) {
  this.driver = {
    id: driverData.id || driverData._id,
    name: driverData.name,
    phone: driverData.phone,
    vehicle: driverData.vehicle,
    plate: driverData.plate,
    rating: driverData.rating,
  };
  this.status = "assigned";
  return this.save();
};

/**
 * Start the trip
 */
CabRideSchema.methods.startTrip = function () {
  if (this.status !== "atPickup") {
    throw new Error("Trip can only start from atPickup status");
  }
  this.status = "started";
  this.startedAt = new Date();
  return this.save();
};

/**
 * Complete the trip
 */
CabRideSchema.methods.completeTrip = function () {
  if (this.status !== "started") {
    throw new Error("Trip can only be completed from started status");
  }
  this.status = "completed";
  this.completedAt = new Date();
  return this.save();
};

/**
 * Mark payment as successful
 * @param {String} paymentId - Razorpay payment ID
 * @param {String} orderId - Razorpay order ID
 * @param {String} signature - Razorpay signature
 */
CabRideSchema.methods.markPaid = function (paymentId, orderId, signature) {
  this.paymentId = paymentId;
  this.orderId = orderId;
  this.signature = signature;
  this.isPaid = true;
  this.status = "paid";
  this.paidAt = new Date();
  return this.save();
};

// ===== STATIC METHODS =====

/**
 * Get active ride for a user
 * @param {String} userId - User ID
 * @returns {Promise<CabRide|null>}
 */
CabRideSchema.statics.getActiveRide = function (userId) {
  return this.findOne({
    userId,
    status: { $nin: ["completed", "paid", "cancelled"] },
  }).sort({ confirmedAt: -1 });
};

/**
 * Get ride history for a user
 * @param {String} userId - User ID
 * @param {Number} limit - Number of rides to return
 * @returns {Promise<CabRide[]>}
 */
CabRideSchema.statics.getUserHistory = function (userId, limit = 50) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit);
};

/**
 * Get pending payment rides
 * @returns {Promise<CabRide[]>}
 */
CabRideSchema.statics.getPendingPayments = function () {
  return this.find({
    status: "completed",
    isPaid: false,
  }).sort({ completedAt: 1 });
};

/**
 * Calculate total earnings (for analytics)
 * @param {Object} filter - Optional filter criteria
 * @returns {Promise<Number>}
 */
CabRideSchema.statics.calculateEarnings = async function (filter = {}) {
  const result = await this.aggregate([
    { $match: { ...filter, isPaid: true } },
    {
      $group: {
        _id: null,
        total: { $sum: "$pricing.totalFare" },
      },
    },
  ]);

  return result.length > 0 ? result[0].total : 0;
};

// ===== MIDDLEWARE (PRE-SAVE HOOKS) =====

// Validate pricing before save
CabRideSchema.pre("save", function (next) {
  if (this.pricing && this.pricing.totalFare) {
    const calculated =
      (this.pricing.baseFare || 0) +
      (this.pricing.distanceFare || 0) +
      (this.pricing.timeFare || 0) +
      (this.pricing.foodStopFare || 0);

    // Allow small rounding differences (within ₹1)
    if (Math.abs(this.pricing.totalFare - calculated) > 1) {
      return next(
        new Error("Total fare does not match sum of fare components")
      );
    }
  }
  next();
});

// Auto-update paidAt when isPaid changes to true
CabRideSchema.pre("save", function (next) {
  if (this.isModified("isPaid") && this.isPaid && !this.paidAt) {
    this.paidAt = new Date();
  }
  next();
});

// ===== EXPORT MODEL =====
module.exports = mongoose.model("CabRide", CabRideSchema);