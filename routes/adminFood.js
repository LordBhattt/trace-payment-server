const express = require('express');
const router = express.Router();
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const MenuCategory = require('../models/MenuCategory');
const FoodOrder = require('../models/FoodOrder');
const adminAuthMiddleware = require('../middleware/adminAuthMiddleware'); // Assuming exists

// ========== RESTAURANT MANAGEMENT ==========

// Create restaurant
router.post('/restaurants', adminAuthMiddleware, async (req, res) => {
  try {
    const restaurant = new Restaurant(req.body);
    await restaurant.save();
    res.status(201).json(restaurant);
  } catch (error) {
    console.error('Error creating restaurant:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update restaurant
router.put('/restaurants/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const restaurant = await Restaurant.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }
    
    res.json(restaurant);
  } catch (error) {
    console.error('Error updating restaurant:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete restaurant
router.delete('/restaurants/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const restaurant = await Restaurant.findByIdAndDelete(req.params.id);
    
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }
    
    // Also delete associated menu items and categories
    await MenuCategory.deleteMany({ restaurantId: req.params.id });
    await MenuItem.deleteMany({ restaurantId: req.params.id });
    
    res.json({ message: 'Restaurant deleted' });
  } catch (error) {
    console.error('Error deleting restaurant:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all restaurants (admin view)
router.get('/restaurants', adminAuthMiddleware, async (req, res) => {
  try {
    const restaurants = await Restaurant.find().sort({ createdAt: -1 });
    res.json(restaurants);
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ========== MENU CATEGORY MANAGEMENT ==========

// Create category
router.post('/restaurants/:restaurantId/categories', adminAuthMiddleware, async (req, res) => {
  try {
    const category = new MenuCategory({
      ...req.body,
      restaurantId: req.params.restaurantId
    });
    await category.save();
    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update category
router.put('/categories/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const category = await MenuCategory.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    res.json(category);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete category
router.delete('/categories/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const category = await MenuCategory.findByIdAndDelete(req.params.id);
    
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    // Also delete menu items in this category
    await MenuItem.deleteMany({ categoryId: req.params.id });
    
    res.json({ message: 'Category deleted' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ========== MENU ITEM MANAGEMENT ==========

// Create menu item
router.post('/restaurants/:restaurantId/menu-items', adminAuthMiddleware, async (req, res) => {
  try {
    const menuItem = new MenuItem({
      ...req.body,
      restaurantId: req.params.restaurantId
    });
    await menuItem.save();
    res.status(201).json(menuItem);
  } catch (error) {
    console.error('Error creating menu item:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update menu item
router.put('/menu-items/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const menuItem = await MenuItem.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!menuItem) {
      return res.status(404).json({ message: 'Menu item not found' });
    }
    
    res.json(menuItem);
  } catch (error) {
    console.error('Error updating menu item:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete menu item
router.delete('/menu-items/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const menuItem = await MenuItem.findByIdAndDelete(req.params.id);
    
    if (!menuItem) {
      return res.status(404).json({ message: 'Menu item not found' });
    }
    
    res.json({ message: 'Menu item deleted' });
  } catch (error) {
    console.error('Error deleting menu item:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get menu for restaurant (admin view)
router.get('/restaurants/:restaurantId/menu', adminAuthMiddleware, async (req, res) => {
  try {
    const categories = await MenuCategory.find({ 
      restaurantId: req.params.restaurantId 
    }).sort({ displayOrder: 1 });
    
    const items = await MenuItem.find({ 
      restaurantId: req.params.restaurantId 
    }).sort({ displayOrder: 1 });
    
    res.json({ categories, items });
  } catch (error) {
    console.error('Error fetching menu:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ========== ORDER MANAGEMENT ==========

// Get all orders
router.get('/orders', adminAuthMiddleware, async (req, res) => {
  try {
    const { status, restaurantId } = req.query;
    
    let query = {};
    if (status) query.status = status;
    if (restaurantId) query.restaurantId = restaurantId;
    
    const orders = await FoodOrder.find(query)
      .populate('restaurantId', 'name')
      .populate('userId', 'name phone')
      .populate('assignedDriverId', 'name phone')
      .sort({ createdAt: -1 })
      .limit(100);
    
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update order status (admin override)
router.patch('/orders/:id/status', adminAuthMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await FoodOrder.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    order.status = status;
    
    // Update appropriate timestamp
    switch (status) {
      case 'accepted':
        order.acceptedAt = new Date();
        break;
      case 'preparing':
        order.preparingAt = new Date();
        break;
      case 'ready_for_pickup':
        order.readyForPickupAt = new Date();
        break;
      case 'picked_up':
        order.pickedUpAt = new Date();
        break;
      case 'on_the_way':
        order.onTheWayAt = new Date();
        break;
      case 'delivered':
        order.deliveredAt = new Date();
        break;
      case 'cancelled':
        order.cancelledAt = new Date();
        order.isCancelled = true;
        break;
    }
    
    await order.save();
    
    res.json({ message: 'Status updated', order });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get order analytics
router.get('/analytics/orders', adminAuthMiddleware, async (req, res) => {
  try {
    const totalOrders = await FoodOrder.countDocuments();
    const completedOrders = await FoodOrder.countDocuments({ status: 'delivered' });
    const cancelledOrders = await FoodOrder.countDocuments({ isCancelled: true });
    const activeOrders = await FoodOrder.countDocuments({ 
      status: { $in: ['placed', 'accepted', 'preparing', 'ready_for_pickup', 'picked_up', 'on_the_way'] }
    });
    
    // Total revenue
    const revenue = await FoodOrder.aggregate([
      { $match: { status: 'delivered', isPaid: true } },
      { $group: { _id: null, total: { $sum: '$amounts.finalPayableAmount' } } }
    ]);
    
    // Resale revenue
    const resaleRevenue = await FoodOrder.aggregate([
      { $match: { resellStatus: 'claimed' } },
      { $group: { _id: null, total: { $sum: '$resellPrice' } } }
    ]);
    
    res.json({
      totalOrders,
      completedOrders,
      cancelledOrders,
      activeOrders,
      totalRevenue: revenue[0]?.total || 0,
      resaleRevenue: resaleRevenue[0]?.total || 0
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;