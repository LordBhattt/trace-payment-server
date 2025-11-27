const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  coverImageUrl: {
    type: String,
    required: true
  },
  logoImageUrl: {
    type: String,
    default: ''
  },
  location: {
    lat: {
      type: Number,
      required: true
    },
    lon: {
      type: Number,
      required: true
    },
    address: {
      type: String,
      required: true
    }
  },
  cuisines: [{
    type: String,
    trim: true
  }],
  avgRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalRatings: {
    type: Number,
    default: 0
  },
  isVegOnly: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  deliveryRadiusKm: {
    type: Number,
    default: 10,
    min: 1
  },
  openingHours: {
    open: {
      type: String,
      default: '09:00'
    },
    close: {
      type: String,
      default: '23:00'
    }
  },
  offers: {
    type: String,
    default: ''
  },
  preparationTimeMinutes: {
    type: Number,
    default: 30
  }
}, {
  timestamps: true
});

// Index for geospatial queries
restaurantSchema.index({ 'location.lat': 1, 'location.lon': 1 });
restaurantSchema.index({ cuisines: 1 });
restaurantSchema.index({ isActive: 1 });

module.exports = mongoose.model('Restaurant', restaurantSchema);