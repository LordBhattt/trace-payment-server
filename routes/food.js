const express = require('express');
const router = express.Router();
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const MenuCategory = require('../models/MenuCategory');
const FoodOrder = require('../models/FoodOrder');
const Driver = require('../models/Driver');
const CabRide = require('../models/CabRide');
const authMiddleware = require('../middleware/auth');
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// ========== RESTAURANT & MENU ENDPOINTS ==========

// Get all restaurants with filters
router.get('/restaurants', async (req, res) => {
  try {
    const { lat, lon, cuisine, vegOnly, search, sortBy } = req.query;
    
    let query = { isActive: true };
    
    // Filter by cuisine
    if (cuisine) {
      query.cuisines = cuisine;
    }
    
    // Filter veg only
    if (vegOnly === 'true') {
      query.isVegOnly = true;
    }
    
    // Search by name
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    
    let restaurants = await Restaurant.find(query);
    
    // Calculate distance if lat/lon provided
    if (lat && lon) {
      const userLat = parseFloat(lat);
      const userLon = parseFloat(lon);
      
      restaurants = restaurants.map(r => {
        const restaurant = r.toObject();
        const distance = calculateDistance(
          userLat,
          userLon,
          restaurant.location.lat,
          restaurant.location.lon
        );
        restaurant.distanceKm = parseFloat(distance.toFixed(2));
        return restaurant;
      });
      
      // Filter by delivery radius
      restaurants = restaurants.filter(r => r.distanceKm <= r.deliveryRadiusKm);
      
      // Sort by distance if requested
      if (sortBy === 'distance') {
        restaurants.sort((a, b) => a.distanceKm - b.distanceKm);
      }
    }
    
    // Sort by rating
    if (sortBy === 'rating') {
      restaurants.sort((a, b) => b.avgRating - a.avgRating);
    }
    
    res.json(restaurants);
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get restaurant details with menu
router.get('/restaurants/:id', async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }
    
    // Get categories
    const categories = await MenuCategory.find({ 
      restaurantId: req.params.id,
      isActive: true 
    }).sort({ displayOrder: 1 });
    
    // Get menu items grouped by category
    const menuItems = await MenuItem.find({ 
      restaurantId: req.params.id,
      isAvailable: true 
    }).sort({ displayOrder: 1 });
    
    // Group items by category
    const menuByCategory = categories.map(cat => ({
      ...cat.toObject(),
      items: menuItems.filter(item => 
        item.categoryId.toString() === cat._id.toString()
      )
    }));
    
    res.json({
      restaurant,
      menu: menuByCategory
    });
  } catch (error) {
    console.error('Error fetching restaurant details:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Search menu items globally (for category pills)
router.get('/items/search', async (req, res) => {
  try {
    const { keyword, tag, vegOnly } = req.query;
    
    let query = { isAvailable: true };
    
    if (keyword) {
      query.$text = { $search: keyword };
    }
    
    if (tag) {
      query.tags = tag.toLowerCase();
    }
    
    if (vegOnly === 'true') {
      query.isVeg = true;
    }
    
    const items = await MenuItem.find(query)
      .populate('restaurantId', 'name coverImageUrl avgRating location')
      .limit(50);
    
    res.json(items);
  } catch (error) {
    console.error('Error searching items:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ========== PRICE PREVIEW ==========

router.post('/orders/price-preview', authMiddleware, async (req, res) => {
  try {
    const { items, restaurantId, deliveryLocation, preferredMode } = req.body;
    
    // Get restaurant
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }
    
    // Calculate items total
    let itemsTotal = 0;
    for (const item of items) {
      const menuItem = await MenuItem.findById(item.menuItemId);
      if (!menuItem) continue;
      
      let itemPrice = menuItem.price * item.quantity;
      
      // Add addOns
      if (item.addOns && item.addOns.length > 0) {
        for (const addOn of item.addOns) {
          itemPrice += addOn.price * item.quantity;
        }
      }
      
      itemsTotal += itemPrice;
    }
    
    // Calculate delivery distance
    const deliveryDistance = calculateDistance(
      restaurant.location.lat,
      restaurant.location.lon,
      deliveryLocation.lat,
      deliveryLocation.lon
    );
    
    // Base fees (configurable)
    const PLATFORM_FEE = 5;
    const BASE_DELIVERY_FEE = 20;
    const PER_KM_RATE = 8;
    const GST_RATE = 0.05; // 5%
    
    let deliveryFee = BASE_DELIVERY_FEE + (deliveryDistance * PER_KM_RATE);
    let distanceFee = deliveryDistance * PER_KM_RATE;
    let discounts = 0;
    let detourAvailable = false;
    
    // Check for detour mode availability
    if (preferredMode === 'detour_cab') {
      const detourCheck = await checkDetourAvailability(
        restaurant.location,
        deliveryLocation,
        7 // max detour km
      );
      
      if (detourCheck.available) {
        detourAvailable = true;
        // 50% discount on delivery fee for shared cab
        discounts = deliveryFee * 0.5;
        deliveryFee = deliveryFee * 0.5;
      }
    }
    
    // Calculate GST
    const taxableAmount = itemsTotal + PLATFORM_FEE + deliveryFee;
    const gstAmount = taxableAmount * GST_RATE;
    
    // Final amount
    const finalPayableAmount = taxableAmount + gstAmount - discounts;
    
    res.json({
      itemsTotal: parseFloat(itemsTotal.toFixed(2)),
      platformFee: PLATFORM_FEE,
      deliveryFee: parseFloat(deliveryFee.toFixed(2)),
      distanceFee: parseFloat(distanceFee.toFixed(2)),
      discounts: parseFloat(discounts.toFixed(2)),
      gstAmount: parseFloat(gstAmount.toFixed(2)),
      finalPayableAmount: parseFloat(finalPayableAmount.toFixed(2)),
      deliveryDistanceKm: parseFloat(deliveryDistance.toFixed(2)),
      detourAvailable,
      estimatedDeliveryMinutes: Math.ceil(deliveryDistance * 3) + restaurant.preparationTimeMinutes
    });
  } catch (error) {
    console.error('Error calculating price:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ========== CREATE ORDER ==========

router.post('/orders', authMiddleware, async (req, res) => {
  try {
    const { 
      restaurantId, 
      items, 
      deliveryLocation, 
      deliveryMode,
      amounts 
    } = req.body;
    
    // Validate restaurant
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }
    
    // Prepare items with snapshot
    const orderItems = [];
    for (const item of items) {
      const menuItem = await MenuItem.findById(item.menuItemId);
      if (!menuItem) continue;
      
      let itemTotal = menuItem.price * item.quantity;
      
      // Calculate addOns
      if (item.addOns) {
        for (const addOn of item.addOns) {
          itemTotal += addOn.price * item.quantity;
        }
      }
      
      orderItems.push({
        menuItemId: menuItem._id,
        name: menuItem.name,
        quantity: item.quantity,
        unitPrice: menuItem.price,
        addOns: item.addOns || [],
        itemTotal
      });
    }
    
    // Generate OTPs
    const otpPickup = generateOTP();
    const otpDrop = generateOTP();
    
    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(amounts.finalPayableAmount * 100), // paise
      currency: 'INR',
      receipt: `food_${Date.now()}`
    });
    
    // Create food order
    const foodOrder = new FoodOrder({
      userId: req.user.id,
      restaurantId,
      items: orderItems,
      deliveryMode,
      amounts,
      locationDelivery: deliveryLocation,
      status: 'placed',
      otpPickup,
      otpDrop,
      razorpayOrderId: razorpayOrder.id
    });
    
    await foodOrder.save();
    
    res.status(201).json({
      order: foodOrder,
      razorpayOrderId: razorpayOrder.id,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error('Error creating food order:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ========== VERIFY PAYMENT ==========

router.post('/orders/:orderId/verify-payment', authMiddleware, async (req, res) => {
  try {
    const { razorpayPaymentId, razorpaySignature } = req.body;
    
    const order = await FoodOrder.findById(req.params.orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Verify signature
    const sign = razorpayPaymentId + '|' + order.razorpayOrderId;
    const expectedSign = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(sign)
      .digest('hex');
    
    if (razorpaySignature === expectedSign) {
      order.isPaid = true;
      order.razorpayPaymentId = razorpayPaymentId;
      order.razorpaySignature = razorpaySignature;
      await order.save();
      
      // Auto-assign driver after payment
      await assignNearestDriver(order._id);
      
      res.json({ 
        success: true, 
        message: 'Payment verified',
        order 
      });
    } else {
      res.status(400).json({ message: 'Invalid payment signature' });
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ========== GET ORDER DETAILS ==========

router.get('/orders/:id', authMiddleware, async (req, res) => {
  try {
    const order = await FoodOrder.findById(req.params.id)
      .populate('restaurantId', 'name location coverImageUrl')
      .populate('assignedDriverId', 'name phone vehicleNumber');
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ========== GET USER ORDER HISTORY ==========

router.get('/orders', authMiddleware, async (req, res) => {
  try {
    const orders = await FoodOrder.find({ userId: req.user.id })
      .populate('restaurantId', 'name coverImageUrl')
      .sort({ createdAt: -1 });
    
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ========== CANCEL ORDER ==========

router.post('/orders/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const { reason } = req.body;
    const order = await FoodOrder.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    if (order.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    // Check if cancellation is allowed
    if (['placed', 'accepted'].includes(order.status)) {
      // Free cancellation
      order.status = 'cancelled';
      order.isCancelled = true;
      order.cancellationReason = reason;
      order.cancelledAt = new Date();
      order.originalCustomerPaysFull = false;
      
      // TODO: Initiate refund via Razorpay
      
      await order.save();
      
      res.json({ 
        message: 'Order cancelled. Full refund initiated.',
        order 
      });
    } else if (['preparing', 'ready_for_pickup'].includes(order.status)) {
      // Paid cancellation - make resellable
      order.status = 'cancelled';
      order.isCancelled = true;
      order.cancellationReason = reason;
      order.cancelledAt = new Date();
      order.originalCustomerPaysFull = true;
      order.isResellable = true;
      order.resellStatus = 'listed';
      order.resellPrice = order.amounts.finalPayableAmount * 0.5;
      order.resellListedAt = new Date();
      
      await order.save();
      
      res.json({ 
        message: 'Order cancelled. No refund. Available for resale at 50% off.',
        order 
      });
    } else {
      res.status(400).json({ 
        message: 'Cannot cancel order at this stage' 
      });
    }
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ========== RESALE ENDPOINTS ==========

// Get nearby resellable orders
router.get('/resell/nearby', authMiddleware, async (req, res) => {
  try {
    const { lat, lon, radiusKm = 5 } = req.query;
    
    const userLat = parseFloat(lat);
    const userLon = parseFloat(lon);
    
    // Find all resellable orders
    const orders = await FoodOrder.find({
      isResellable: true,
      resellStatus: 'listed'
    }).populate('restaurantId', 'name coverImageUrl');
    
    // Filter by distance
    const nearbyOrders = orders.filter(order => {
      const distance = calculateDistance(
        userLat,
        userLon,
        order.locationDelivery.lat,
        order.locationDelivery.lon
      );
      return distance <= parseFloat(radiusKm);
    }).map(order => {
      const orderObj = order.toObject();
      orderObj.distanceKm = calculateDistance(
        userLat,
        userLon,
        order.locationDelivery.lat,
        order.locationDelivery.lon
      ).toFixed(2);
      
      // Calculate time left (45 min expiry)
      const timeElapsed = Date.now() - new Date(order.resellListedAt).getTime();
      const timeLeft = Math.max(0, 45 - Math.floor(timeElapsed / 60000));
      orderObj.minutesLeft = timeLeft;
      
      return orderObj;
    });
    
    res.json(nearbyOrders);
  } catch (error) {
    console.error('Error fetching resell orders:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Claim resell order
router.post('/resell/:orderId/claim', authMiddleware, async (req, res) => {
  try {
    const { deliveryLocation } = req.body;
    
    const order = await FoodOrder.findById(req.params.orderId);
    
    if (!order || order.resellStatus !== 'listed') {
      return res.status(400).json({ message: 'Order not available for resale' });
    }
    
    // Create new Razorpay order for resell price
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(order.resellPrice * 100),
      currency: 'INR',
      receipt: `resell_${Date.now()}`
    });
    
    res.json({
      order,
      razorpayOrderId: razorpayOrder.id,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      resellPrice: order.resellPrice
    });
  } catch (error) {
    console.error('Error claiming resell:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Verify resell payment
router.post('/resell/:orderId/verify-payment', authMiddleware, async (req, res) => {
  try {
    const { razorpayPaymentId, razorpaySignature, razorpayOrderId, deliveryLocation } = req.body;
    
    // Verify signature
    const sign = razorpayPaymentId + '|' + razorpayOrderId;
    const expectedSign = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(sign)
      .digest('hex');
    
    if (razorpaySignature !== expectedSign) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }
    
    const order = await FoodOrder.findById(req.params.orderId);
    
    if (!order || order.resellStatus !== 'listed') {
      return res.status(400).json({ message: 'Order not available' });
    }
    
    // Update order with new buyer
    order.resellStatus = 'claimed';
    order.resellBuyerId = req.user.id;
    order.resellClaimedAt = new Date();
    order.status = 'picked_up'; // Food already prepared, move to picked_up
    
    // Update delivery location to new buyer
    if (deliveryLocation) {
      order.locationDelivery = deliveryLocation;
    }
    
    // Generate new drop OTP
    order.otpDrop = generateOTP();
    
    await order.save();
    
    // Reassign driver to new location
    await assignNearestDriver(order._id);
    
    res.json({ 
      success: true, 
      message: 'Resale successful',
      order 
    });
  } catch (error) {
    console.error('Error verifying resell payment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ========== HELPER FUNCTIONS ==========

// Haversine formula for distance calculation
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Check if detour mode is available
async function checkDetourAvailability(restaurantLocation, deliveryLocation, maxDetourKm) {
  try {
    // Find active rides that allow food deliveries
    const activeRides = await CabRide.find({
      status: { $in: ['accepted', 'in_progress'] },
      allowFoodDeliveries: true // Assuming this field exists
    }).populate('driverId');
    
    for (const ride of activeRides) {
      if (!ride.driverId) continue;
      
      // Calculate extra detour distance
      // Simplified: would need OSRM integration for real route calculation
      const detourDistance = calculateDistance(
        restaurantLocation.lat,
        restaurantLocation.lon,
        deliveryLocation.lat,
        deliveryLocation.lon
      );
      
      if (detourDistance <= maxDetourKm) {
        return { available: true, rideId: ride._id, driverId: ride.driverId._id };
      }
    }
    
    return { available: false };
  } catch (error) {
    console.error('Error checking detour:', error);
    return { available: false };
  }
}

// Assign nearest available driver
async function assignNearestDriver(orderId) {
  try {
    const order = await FoodOrder.findById(orderId).populate('restaurantId');
    
    if (!order || order.assignedDriverId) return;
    
    // Find online drivers not on a task
    const availableDrivers = await Driver.find({
      status: 'ONLINE',
      currentTask: null // Assuming this field tracks active assignments
    });
    
    if (availableDrivers.length === 0) return;
    
    // Find nearest to restaurant
    let nearestDriver = null;
    let minDistance = Infinity;
    
    for (const driver of availableDrivers) {
      if (!driver.location) continue;
      
      const distance = calculateDistance(
        order.restaurantId.location.lat,
        order.restaurantId.location.lon,
        driver.location.lat,
        driver.location.lon
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        nearestDriver = driver;
      }
    }
    
    if (nearestDriver) {
      order.assignedDriverId = nearestDriver._id;
      await order.save();
      
      // TODO: Send notification to driver
      console.log(`Order ${orderId} assigned to driver ${nearestDriver._id}`);
    }
  } catch (error) {
    console.error('Error assigning driver:', error);
  }
}

module.exports = router;