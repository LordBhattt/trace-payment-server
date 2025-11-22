const mongoose = require("mongoose");

const driverSchema = new mongoose.Schema(
  {
    name: String,
    phone: String,
    vehicleModel: String,
    vehicleNumber: String,
    rating: { type: Number, default: 4.5 },

    currentLocation: {
      lat: Number,
      lng: Number,
    },

    isAvailable: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("driver", schema);
