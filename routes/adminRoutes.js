const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Driver = require('../models/Driver');
const Ride = require('../models/Ride');
const User = require('../models/User');
const Payment = require('../models/Payment');

// ===== ADMIN LOGIN =====
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Simple hardcoded admin credentials (you can add to .env later)
    const ADMIN_USERNAME = 'admin';
    const ADMIN_PASSWORD = 'admin123'; // Change this!
    
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      // Generate admin JWT token
      const token = jwt.sign(
        { role: 'admin', username },
        process.env.JWT_SECRET || 'your_jwt_secret',
        { expiresIn: '7d' }
      );
      
      res.json({ 
        success: true, 
        token,
        message: 'Admin login successful' 
      });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== MIDDLEWARE: Check if admin token is valid =====
const adminAuth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]; // "Bearer TOKEN"
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Not an admin' });
    }
    
    req.admin = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// ===== VERIFY TOKEN =====
router.get('/verify', adminAuth, (req, res) => {
  res.json({ success: true, admin: req.admin });
});

// ===== DRIVER MANAGEMENT =====

// Get all drivers
router.get('/drivers', adminAuth, async (req, res) => {
  try {
    const drivers = await Driver.find().sort({ createdAt: -1 });
    res.json({ drivers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add new driver
router.post('/drivers', adminAuth, async (req, res) => {
  try {
    const { name, phone, vehicleNumber, vehicleType, licenseNumber } = req.body;
    
    const driver = new Driver({
      name,
      phone,
      vehicleNumber,
      vehicleType: vehicleType || 'sedan',
      licenseNumber,
      approved: true,
      online: false,
      rating: 5.0,
      totalRides: 0
    });
    
    await driver.save();
    res.json({ driver, message: 'Driver added successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update driver
router.put('/drivers/:id', adminAuth, async (req, res) => {
  try {
    const driver = await Driver.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json({ driver, message: 'Driver updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete driver
router.delete('/drivers/:id', adminAuth, async (req, res) => {
  try {
    await Driver.findByIdAndDelete(req.params.id);
    res.json({ message: 'Driver deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Approve/reject driver
router.patch('/drivers/:id/approve', adminAuth, async (req, res) => {
  try {
    const { approved } = req.body;
    const driver = await Driver.findByIdAndUpdate(
      req.params.id,
      { approved },
      { new: true }
    );
    res.json({ driver, message: `Driver ${approved ? 'approved' : 'rejected'}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== LIVE RIDES =====
router.get('/rides/live', adminAuth, async (req, res) => {
  try {
    const liveRides = await Ride.find({
      status: { $in: ['searching', 'accepted', 'arriving', 'at_pickup', 'on_trip'] }
    })
      .populate('userId', 'name phone')
      .populate('driverId', 'name phone vehicleNumber')
      .sort({ createdAt: -1 });
    
    res.json({ rides: liveRides });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== ALL RIDES =====
router.get('/rides', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 50, status } = req.query;
    
    const query = status ? { status } : {};
    
    const rides = await Ride.find(query)
      .populate('userId', 'name phone')
      .populate('driverId', 'name phone vehicleNumber')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Ride.countDocuments(query);
    
    res.json({
      rides,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== EARNINGS & PAYMENTS =====
router.get('/earnings', adminAuth, async (req, res) => {
  try {
    const completedRides = await Ride.find({ status: 'completed' });
    
    const totalEarnings = completedRides.reduce((sum, ride) => sum + ride.fare, 0);
    const totalRides = completedRides.length;
    const avgFare = totalRides > 0 ? totalEarnings / totalRides : 0;
    
    // Today's earnings
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayRides = completedRides.filter(r => r.createdAt >= today);
    const todayEarnings = todayRides.reduce((sum, ride) => sum + ride.fare, 0);
    
    res.json({
      totalEarnings,
      totalRides,
      avgFare,
      todayEarnings,
      todayRides: todayRides.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/payments', adminAuth, async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate('userId', 'name phone')
      .populate('rideId')
      .sort({ createdAt: -1 })
      .limit(100);
    
    res.json({ payments });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== MANUAL RIDE ASSIGNMENT =====
router.patch('/rides/:id/assign', adminAuth, async (req, res) => {
  try {
    const { driverId } = req.body;
    
    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    
    const ride = await Ride.findByIdAndUpdate(
      req.params.id,
      {
        driverId,
        status: 'accepted',
        acceptedAt: new Date()
      },
      { new: true }
    );
    
    res.json({ ride, message: 'Driver assigned manually' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== DASHBOARD STATS =====
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalDrivers = await Driver.countDocuments();
    const onlineDrivers = await Driver.countDocuments({ online: true });
    const totalRides = await Ride.countDocuments();
    const liveRides = await Ride.countDocuments({
      status: { $in: ['searching', 'accepted', 'arriving', 'at_pickup', 'on_trip'] }
    });
    
    const completedRides = await Ride.find({ status: 'completed' });
    const totalRevenue = completedRides.reduce((sum, r) => sum + r.fare, 0);
    
    res.json({
      totalUsers,
      totalDrivers,
      onlineDrivers,
      totalRides,
      liveRides,
      totalRevenue
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;