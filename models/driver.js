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

  // For driver location (optional)
  location: {
    lat: Number,
    lng: Number
  },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('driver', driverSchema);
