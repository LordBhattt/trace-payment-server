const mongoose = require('mongoose');

const foodOrderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  linkedRideId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CabRide',
    default: null
  },
  deliveryMode: {
    type: String,
    enum: ['detour_cab', 'dedicated_delivery'],
    required: true
  },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  items: [{
    menuItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MenuItem',
      required: true
    },
    name: String,
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    unitPrice: Number,
    addOns: [{
      label: String,
      price: Number
    }],
    itemTotal: Number
  }],
  amounts: {
    itemsTotal: {
      type: Number,
      required: true,
      default: 0
    },
    platformFee: {
      type: Number,
      default: 0
    },
    deliveryFee: {
      type: Number,
      default: 0
    },
    distanceFee: {
      type: Number,
      default: 0
    },
    discounts: {
      type: Number,
      default: 0
    },
    gstAmount: {
      type: Number,
      default: 0
    },
    finalPayableAmount: {
      type: Number,
      required: true
    }
  },
  locationDelivery: {
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
  status: {
    type: String,
    enum: [
      'placed',
      'accepted',
      'preparing',
      'ready_for_pickup',
      'picked_up',
      'on_the_way',
      'delivered',
      'cancelled'
    ],
    default: 'placed'
  },
  assignedDriverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    default: null
  },
  otpPickup: {
    type: String,
    default: null
  },
  otpDrop: {
    type: String,
    default: null
  },
  isCancelled: {
    type: Boolean,
    default: false
  },
  cancellationReason: {
    type: String,
    default: ''
  },
  originalCustomerPaysFull: {
    type: Boolean,
    default: false
  },
  // Resale fields
  isResellable: {
    type: Boolean,
    default: false
  },
  resellStatus: {
    type: String,
    enum: ['none', 'listed', 'claimed', 'expired'],
    default: 'none'
  },
  resellPrice: {
    type: Number,
    default: 0
  },
  resellBuyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  // Payment fields
  razorpayOrderId: {
    type: String,
    default: ''
  },
  razorpayPaymentId: {
    type: String,
    default: ''
  },
  razorpaySignature: {
    type: String,
    default: ''
  },
  isPaid: {
    type: Boolean,
    default: false
  },
  // Timestamps for lifecycle
  acceptedAt: Date,
  preparingAt: Date,
  readyForPickupAt: Date,
  pickedUpAt: Date,
  onTheWayAt: Date,
  deliveredAt: Date,
  cancelledAt: Date,
  resellListedAt: Date,
  resellClaimedAt: Date
}, {
  timestamps: true
});

// Indexes
foodOrderSchema.index({ userId: 1, createdAt: -1 });
foodOrderSchema.index({ assignedDriverId: 1, status: 1 });
foodOrderSchema.index({ status: 1 });
foodOrderSchema.index({ isResellable: 1, resellStatus: 1 });
foodOrderSchema.index({ 'locationDelivery.lat': 1, 'locationDelivery.lon': 1 });

module.exports = mongoose.model('FoodOrder', foodOrderSchema);