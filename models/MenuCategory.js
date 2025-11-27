const mongoose = require('mongoose');

const menuCategorySchema = new mongoose.Schema({
  restaurantId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Restaurant',
    required: true 
  },
  name: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String 
  },
  displayOrder: { 
    type: Number, 
    default: 0 
  },
  isAvailable: { 
    type: Boolean, 
    default: true 
  },
  availableFrom: { 
    type: String 
  },
  availableTo: { 
    type: String 
  }
}, {
  timestamps: true
});

menuCategorySchema.index({ restaurantId: 1, displayOrder: 1 });

const MenuCategory = mongoose.model('MenuCategory', menuCategorySchema);

module.exports = MenuCategory;