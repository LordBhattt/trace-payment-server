import mongoose from "mongoose";

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

export default mongoose.model("Driver", driverSchema);
