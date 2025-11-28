// models/FoodOrder.js
const mongoose = require('mongoose');

const foodOrderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    linkedRideId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CabRide',
      default: null,
    },
    deliveryMode: {
      type: String,
      enum: ['detour_cab', 'dedicated_delivery'],
      required: true,
    },
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
    },
    items: [
      {
        menuItemId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'MenuItem',
        },
        name: String,
        quantity: Number,
        unitPrice: Number,
        addOns: [
          {
            label: String,
            price: Number,
          },
        ],
        itemTotal: Number,
      },
    ],
    amounts: {
      itemsTotal: { type: Number, required: true },
      platformFee: { type: Number, default: 5 },
      deliveryFee: { type: Number, default: 0 },
      distanceFee: { type: Number, default: 0 },
      discounts: { type: Number, default: 0 },
      gstAmount: { type: Number, default: 0 },
      finalPayableAmount: { type: Number, required: true },
    },
    locationDelivery: {
      lat: { type: Number, required: true },
      lon: { type: Number, required: true },
      address: { type: String, required: true },
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
        'cancelled',
      ],
      default: 'placed',
    },
    assignedDriverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    otpPickup: {
      type: String,
      default: null,
    },
    otpDrop: {
      type: String,
      default: null,
    },
    isCancelled: {
      type: Boolean,
      default: false,
    },
    cancellationReason: {
      type: String,
      default: null,
    },
    originalCustomerPaysFull: {
      type: Boolean,
      default: false,
    },
    // Resale fields
    isResellable: {
      type: Boolean,
      default: false,
    },
    resellStatus: {
      type: String,
      enum: ['none', 'listed', 'claimed', 'expired'],
      default: 'none',
    },
    resellPrice: {
      type: Number,
      default: null,
    },
    resellBuyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // Payment fields
    razorpayOrderId: { type: String, default: null },
    razorpayPaymentId: { type: String, default: null },
    razorpaySignature: { type: String, default: null },
    isPaid: { type: Boolean, default: false },
    // Timestamps
    placedAt: { type: Date, default: Date.now },
    acceptedAt: { type: Date, default: null },
    preparingAt: { type: Date, default: null },
    pickedUpAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    resellListedAt: { type: Date, default: null },
    resellClaimedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

foodOrderSchema.index({ userId: 1, status: 1 });
foodOrderSchema.index({ restaurantId: 1, status: 1 });
foodOrderSchema.index({ assignedDriverId: 1, status: 1 });
foodOrderSchema.index({ isResellable: 1, resellStatus: 1 });

module.exports = mongoose.model('FoodOrder', foodOrderSchema);