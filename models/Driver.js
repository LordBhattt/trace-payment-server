// models/Driver.js
const mongoose = require('mongoose');

const DriverSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  vehicleNumber: { type: String, required: true },
  vehicleType: { type: String, default: 'sedan' },
  licenseNumber: { type: String, required: true },

  approved: { type: Boolean, default: false },
  online: { type: Boolean, default: false },

  totalRides: { type: Number, default: 0 },
  rating: { type: Number, default: 5.0 },

  // Optional live location
  location: {
    lat: Number,
    lng: Number,
  },

  createdAt: { type: Date, default: Date.now },
});

// ✅ IMPORTANT: model name is "Driver" (matches ref in CabRide)
module.exports = mongoose.model('Driver', DriverSchema);
