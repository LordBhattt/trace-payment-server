// routes/food.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const MenuCategory = require('../models/MenuCategory');
const FoodOrder = require('../models/FoodOrder');

/* ====================================
   HELPER FUNCTIONS
==================================== */

// Calculate distance between two points (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Generate 4-digit OTP
function generateOTP() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// Calculate food order pricing
function calculateFoodPricing(itemsTotal, distanceKm, deliveryMode) {
  const PLATFORM_FEE = 5;
  const BASE_DELIVERY_FEE = 20;
  const PER_KM_FEE = 8;
  const GST_RATE = 0.05; // 5%

  let deliveryFee = 0;
  let discounts = 0;

  if (deliveryMode === 'dedicated_delivery') {
    deliveryFee = BASE_DELIVERY_FEE + distanceKm * PER_KM_FEE;
  } else if (deliveryMode === 'detour_cab') {
    // Shared cab delivery - 50% discount
    const normalDeliveryFee = BASE_DELIVERY_FEE + distanceKm * PER_KM_FEE;
    deliveryFee = normalDeliveryFee * 0.5;
    discounts = normalDeliveryFee * 0.5;
  }

  const subtotal = itemsTotal + PLATFORM_FEE + deliveryFee;
  const gstAmount = Math.round(subtotal * GST_RATE);
  const finalPayableAmount = Math.round(subtotal + gstAmount - discounts);

  return {
    itemsTotal,
    platformFee: PLATFORM_FEE,
    deliveryFee: Math.round(deliveryFee),
    distanceFee: Math.round(distanceKm * PER_KM_FEE),
    discounts: Math.round(discounts),
    gstAmount,
    finalPayableAmount,
  };
}

/* ====================================
   RESTAURANT ENDPOINTS
==================================== */

// GET /api/food/restaurants - List all restaurants
router.get('/restaurants', async (req, res) => {
  try {
    const { lat, lon, cuisine, vegOnly, search, sortBy } = req.query;

    let query = { isActive: true };

    // Filter by cuisine
    if (cuisine) {
      query.cuisines = { $in: [cuisine] };
    }

    // Filter veg only
    if (vegOnly === 'true') {
      query.isVegOnly = true;
    }

    // Search by name
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    let restaurants = await Restaurant.find(query).lean();

    // Calculate distance if user location provided
    if (lat && lon) {
      const userLat = parseFloat(lat);
      const userLon = parseFloat(lon);

      restaurants = restaurants.map((r) => {
        const distance = calculateDistance(
          userLat,
          userLon,
          r.location.lat,
          r.location.lon
        );
        return { ...r, distance: Math.round(distance * 10) / 10 };
      });

      // Filter by delivery radius
      restaurants = restaurants.filter(
        (r) => r.distance <= r.deliveryRadiusKm
      );
    }

    // Sort
    if (sortBy === 'rating') {
      restaurants.sort((a, b) => b.avgRating - a.avgRating);
    } else if (sortBy === 'distance' && lat && lon) {
      restaurants.sort((a, b) => a.distance - b.distance);
    }

    return res.json({ success: true, restaurants });
  } catch (err) {
    console.error('Get Restaurants Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch restaurants',
    });
  }
});

// GET /api/food/restaurants/:id - Get restaurant details with menu
router.get('/restaurants/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const restaurant = await Restaurant.findById(id).lean();
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found',
      });
    }

    // Get categories
    const categories = await MenuCategory.find({
      restaurantId: id,
    })
      .sort({ displayOrder: 1 })
      .lean();

    // Get menu items grouped by category
    const menuItemsPromises = categories.map(async (cat) => {
      const items = await MenuItem.find({
        restaurantId: id,
        categoryId: cat._id,
        isAvailable: true,
      }).lean();

      return {
        ...cat,
        items,
      };
    });

    const menu = await Promise.all(menuItemsPromises);

    return res.json({
      success: true,
      restaurant: {
        ...restaurant,
        menu,
      },
    });
  } catch (err) {
    console.error('Get Restaurant Details Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch restaurant details',
    });
  }
});

// GET /api/food/items - Search menu items globally
router.get('/items', async (req, res) => {
  try {
    const { keyword, tag } = req.query;

    let query = { isAvailable: true };

    if (keyword) {
      query.$text = { $search: keyword };
    }

    if (tag) {
      query.tags = { $in: [tag] };
    }

    const items = await MenuItem.find(query)
      .populate('restaurantId', 'name location cuisines avgRating')
      .limit(50)
      .lean();

    return res.json({ success: true, items });
  } catch (err) {
    console.error('Search Items Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to search items',
    });
  }
});

/* ====================================
   ORDER ENDPOINTS
==================================== */

// POST /api/food/orders/price-preview
router.post('/orders/price-preview', authMiddleware, async (req, res) => {
  try {
    const { items, restaurantId, deliveryLat, deliveryLon, deliveryMode } =
      req.body;

    // Calculate items total
    let itemsTotal = 0;
    for (const item of items) {
      const menuItem = await MenuItem.findById(item.menuItemId);
      if (!menuItem) continue;

      let itemPrice = menuItem.price * item.quantity;

      if (item.addOns && item.addOns.length > 0) {
        for (const addOn of item.addOns) {
          itemPrice += addOn.price * item.quantity;
        }
      }

      itemsTotal += itemPrice;
    }

    // Get restaurant location
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found',
      });
    }

    // Calculate distance
    const distance = calculateDistance(
      restaurant.location.lat,
      restaurant.location.lon,
      deliveryLat,
      deliveryLon
    );

    // Calculate pricing
    const pricing = calculateFoodPricing(itemsTotal, distance, deliveryMode);

    return res.json({
      success: true,
      pricing,
      distance: Math.round(distance * 10) / 10,
      eta: Math.round(restaurant.preparationTimeMin + distance * 3), // 3 min per km
    });
  } catch (err) {
    console.error('Price Preview Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to calculate pricing',
    });
  }
});

// POST /api/food/orders - Create new order
router.post('/orders', authMiddleware, async (req, res) => {
  try {
    const {
      items,
      restaurantId,
      deliveryLat,
      deliveryLon,
      deliveryAddress,
      deliveryMode,
      linkedRideId,
    } = req.body;

    // Calculate items total and prepare items array
    let itemsTotal = 0;
    const orderItems = [];

    for (const item of items) {
      const menuItem = await MenuItem.findById(item.menuItemId);
      if (!menuItem || !menuItem.isAvailable) {
        return res.status(400).json({
          success: false,
          message: `Item ${menuItem?.name || 'unknown'} is not available`,
        });
      }

      let itemPrice = menuItem.price * item.quantity;
      const addOns = item.addOns || [];

      if (addOns.length > 0) {
        for (const addOn of addOns) {
          itemPrice += addOn.price * item.quantity;
        }
      }

      orderItems.push({
        menuItemId: menuItem._id,
        name: menuItem.name,
        quantity: item.quantity,
        unitPrice: menuItem.price,
        addOns,
        itemTotal: itemPrice,
      });

      itemsTotal += itemPrice;
    }

    // Get restaurant
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found',
      });
    }

    // Calculate distance
    const distance = calculateDistance(
      restaurant.location.lat,
      restaurant.location.lon,
      deliveryLat,
      deliveryLon
    );

    // Check delivery radius
    if (distance > restaurant.deliveryRadiusKm) {
      return res.status(400).json({
        success: false,
        message: 'Delivery location outside restaurant radius',
      });
    }

    // Calculate pricing
    const amounts = calculateFoodPricing(itemsTotal, distance, deliveryMode);

    // Generate OTPs
    const otpPickup = generateOTP();
    const otpDrop = generateOTP();

    // Create order
    const order = await FoodOrder.create({
      userId: req.user.id,
      linkedRideId: linkedRideId || null,
      deliveryMode,
      restaurantId,
      items: orderItems,
      amounts,
      locationDelivery: {
        lat: deliveryLat,
        lon: deliveryLon,
        address: deliveryAddress,
      },
      otpPickup,
      otpDrop,
      status: 'placed',
    });

    return res.json({ success: true, order });
  } catch (err) {
    console.error('Create Order Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to create order',
    });
  }
});

// GET /api/food/orders/:id - Get single order
router.get('/orders/:id', authMiddleware, async (req, res) => {
  try {
    const order = await FoodOrder.findOne({
      _id: req.params.id,
      userId: req.user.id,
    })
      .populate('restaurantId', 'name location coverImageUrl')
      .lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    return res.json({ success: true, order });
  } catch (err) {
    console.error('Get Order Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch order',
    });
  }
});

// GET /api/food/orders - Get order history
router.get('/orders', authMiddleware, async (req, res) => {
  try {
    const orders = await FoodOrder.find({ userId: req.user.id })
      .populate('restaurantId', 'name location coverImageUrl')
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, orders });
  } catch (err) {
    console.error('Get Order History Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch order history',
    });
  }
});

// POST /api/food/orders/:id/cancel - Cancel order
router.post('/orders/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const { reason } = req.body;

    const order = await FoodOrder.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Check if already cancelled/delivered
    if (order.status === 'cancelled' || order.status === 'delivered') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel order with status: ${order.status}`,
      });
    }

    // Check if in preparing or later stage
    const preparingStages = ['preparing', 'ready_for_pickup', 'picked_up', 'on_the_way'];
    
    if (preparingStages.includes(order.status)) {
      // Customer still pays, but order becomes resellable
      order.originalCustomerPaysFull = true;
      order.isResellable = true;
      order.resellStatus = 'listed';
      order.resellPrice = Math.round(order.amounts.finalPayableAmount * 0.5);
      order.resellListedAt = new Date();
    }

    order.status = 'cancelled';
    order.isCancelled = true;
    order.cancellationReason = reason || 'User cancelled';
    order.cancelledAt = new Date();

    await order.save();

    return res.json({ success: true, order });
  } catch (err) {
    console.error('Cancel Order Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to cancel order',
    });
  }
});

/* ====================================
   RESALE ENDPOINTS
==================================== */

// GET /api/food/resell/nearby - Get nearby resellable orders
router.get('/resell/nearby', authMiddleware, async (req, res) => {
  try {
    const { lat, lon, radius = 5 } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({
        success: false,
        message: 'Location required',
      });
    }

    const userLat = parseFloat(lat);
    const userLon = parseFloat(lon);

    // Get all listed resellable orders
    const orders = await FoodOrder.find({
      isResellable: true,
      resellStatus: 'listed',
    })
      .populate('restaurantId', 'name location coverImageUrl')
      .lean();

    // Filter by distance and check expiry
    const nearbyOrders = [];
    const now = new Date();

    for (const order of orders) {
      // Check if expired (45 min from listing)
      const listTime = new Date(order.resellListedAt);
      const minsSinceListed = (now - listTime) / 60000;

      if (minsSinceListed > 45) {
        // Mark as expired
        await FoodOrder.findByIdAndUpdate(order._id, {
          resellStatus: 'expired',
        });
        continue;
      }

      // Calculate distance to delivery location
      const distance = calculateDistance(
        userLat,
        userLon,
        order.locationDelivery.lat,
        order.locationDelivery.lon
      );

      if (distance <= radius) {
        nearbyOrders.push({
          ...order,
          distance: Math.round(distance * 10) / 10,
          minutesLeft: Math.round(45 - minsSinceListed),
        });
      }
    }

    // Sort by distance
    nearbyOrders.sort((a, b) => a.distance - b.distance);

    return res.json({ success: true, orders: nearbyOrders });
  } catch (err) {
    console.error('Get Nearby Resale Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch resale orders',
    });
  }
});

// POST /api/food/resell/:orderId/claim - Claim resale order
router.post('/resell/:orderId/claim', authMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { newDeliveryLat, newDeliveryLon, newDeliveryAddress } = req.body;

    const order = await FoodOrder.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Check if still available
    if (order.resellStatus !== 'listed') {
      return res.status(400).json({
        success: false,
        message: 'Order no longer available for resale',
      });
    }

    // Check if not expired
    const now = new Date();
    const listTime = new Date(order.resellListedAt);
    const minsSinceListed = (now - listTime) / 60000;

    if (minsSinceListed > 45) {
      order.resellStatus = 'expired';
      await order.save();

      return res.status(400).json({
        success: false,
        message: 'Order expired',
      });
    }

    // Mark as claimed
    order.resellStatus = 'claimed';
    order.resellBuyerId = req.user.id;
    order.resellClaimedAt = new Date();

    // Update delivery location if provided
    if (newDeliveryLat && newDeliveryLon && newDeliveryAddress) {
      order.locationDelivery = {
        lat: newDeliveryLat,
        lon: newDeliveryLon,
        address: newDeliveryAddress,
      };
    }

    await order.save();

    // Return order with resell price for payment
    return res.json({
      success: true,
      order,
      paymentAmount: order.resellPrice,
    });
  } catch (err) {
    console.error('Claim Resale Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to claim order',
    });
  }
});

module.exports = router;