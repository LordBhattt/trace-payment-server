const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const Driver = require('../models/Driver');
const User = require('../models/User');
const CabRide = require('../models/CabRide'); // ✅ single correct import

// ===== ADMIN LOGIN =====
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Hardcoded admin credentials
    const ADMIN_USERNAME = 'admin';
    const ADMIN_PASSWORD = 'admin123';

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      const token = jwt.sign(
        { role: 'admin', username },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.json({
        success: true,
        token,
        message: 'Admin login successful',
      });
    }

    return res.status(401).json({ error: 'Invalid credentials' });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== MIDDLEWARE: ADMIN AUTH =====
const adminAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Not an admin' });
    }

    req.admin = decoded;
    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// ===== VERIFY TOKEN =====
router.get('/verify', adminAuth, (req, res) => {
  res.json({ success: true, admin: req.admin });
});

// ===== DASHBOARD STATS =====
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalDrivers = await Driver.countDocuments();
    const onlineDrivers = await Driver.countDocuments({ online: true });

    const totalRides = await CabRide.countDocuments();

    const liveStatuses = [
      'pending', 'confirmed', 'assigned', 'arriving',
      'atPickup', 'started'
    ];

    const liveRides = await CabRide.countDocuments({ status: { $in: liveStatuses } });

    const completedRides = await CabRide.find({ status: 'completed' });

    const totalRevenue = completedRides.reduce((sum, ride) => {
      const fare = ride.pricing?.totalFare || 0;
      return sum + fare;
    }, 0);

    res.json({
      totalUsers,
      totalDrivers,
      onlineDrivers,
      totalRides,
      liveRides,
      totalRevenue,
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== DRIVER MANAGEMENT =====

// Get all drivers
router.get('/drivers', adminAuth, async (req, res) => {
  try {
    const drivers = await Driver.find().sort({ createdAt: -1 });
    res.json({ drivers });
  } catch (error) {
    console.error('Get drivers error:', error);
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
      totalRides: 0,
    });

    await driver.save();
    res.json({ driver, message: 'Driver added successfully' });
  } catch (error) {
    console.error('Add driver error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update driver
router.put('/drivers/:id', adminAuth, async (req, res) => {
  try {
    const driver = await Driver.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ driver, message: 'Driver updated' });
  } catch (error) {
    console.error('Update driver error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete driver
router.delete('/drivers/:id', adminAuth, async (req, res) => {
  try {
    await Driver.findByIdAndDelete(req.params.id);
    res.json({ message: 'Driver deleted' });
  } catch (error) {
    console.error('Delete driver error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Approve driver
router.patch('/drivers/:id/approve', adminAuth, async (req, res) => {
  try {
    const { approved } = req.body;
    const driver = await Driver.findByIdAndUpdate(
      req.params.id,
      { approved },
      { new: true }
    );
    res.json({
      driver,
      message: `Driver ${approved ? 'approved' : 'rejected'}`,
    });
  } catch (error) {
    console.error('Approve driver error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== LIVE RIDES =====
router.get('/rides/live', adminAuth, async (req, res) => {
  try {
    const liveStatuses = [
      'pending', 'confirmed', 'assigned', 'arriving',
      'atPickup', 'started'
    ];

    const liveRides = await CabRide.find({ status: { $in: liveStatuses } })
      .populate('userId', 'name phone')
      .populate('driverId', 'name phone vehicleNumber')
      .sort({ createdAt: -1 });

    res.json({ rides: liveRides });
  } catch (error) {
    console.error('Live rides error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== ALL RIDES =====
router.get('/rides', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 50, status } = req.query;

    const query = {};
    if (status) query.status = status;

    const rides = await CabRide.find(query)
      .populate('userId', 'name phone')
      .populate('driverId', 'name phone vehicleNumber')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await CabRide.countDocuments(query);

    res.json({
      rides,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
    });
  } catch (error) {
    console.error('All rides error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== EARNINGS =====
router.get('/earnings', adminAuth, async (req, res) => {
  try {
    const completedRides = await CabRide.find({ status: 'completed' });

    const totalEarnings = completedRides.reduce((sum, ride) => {
      const fare = ride.pricing?.totalFare || 0;
      return sum + fare;
    }, 0);

    const totalRides = completedRides.length;
    const avgFare = totalRides ? totalEarnings / totalRides : 0;

    // Today's earnings
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayRides = completedRides.filter((r) => r.createdAt >= today);
    const todayEarnings = todayRides.reduce((sum, ride) => {
      const fare = ride.pricing?.totalFare || 0;
      return sum + fare;
    }, 0);

    res.json({
      totalEarnings,
      totalRides,
      avgFare,
      todayEarnings,
      todayRides: todayRides.length,
    });
  } catch (error) {
    console.error('Earnings error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== PAYMENT HISTORY (from CabRide) =====
router.get('/payments', adminAuth, async (req, res) => {
  try {
    const rides = await CabRide.find({ isPaid: true })
      .populate('userId', 'name phone')
      .populate('driverId', 'name phone vehicleNumber')
      .sort({ paidAt: -1 });

    const payments = rides.map((r) => ({
      rideId: r._id,
      user: r.userId,
      driver: r.driverId,
      amount: r.pricing?.totalFare || 0,
      paymentId: r.paymentId,
      orderId: r.orderId,
      paidAt: r.paidAt,
    }));

    res.json({ payments });
  } catch (error) {
    console.error('Payment list error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== MANUAL RIDE ASSIGN =====
router.patch('/rides/:id/assign', adminAuth, async (req, res) => {
  try {
    const { driverId } = req.body;

    const driver = await Driver.findById(driverId);
    if (!driver) return res.status(404).json({ error: 'Driver not found' });

    const ride = await CabRide.findByIdAndUpdate(
      req.params.id,
      {
        driverId,
        status: 'assigned',
        acceptedAt: new Date(),
      },
      { new: true }
    )
      .populate('userId', 'name phone')
      .populate('driverId', 'name phone vehicleNumber');

    if (!ride) return res.status(404).json({ error: 'Ride not found' });

    res.json({ ride, message: 'Driver assigned manually' });
  } catch (error) {
    console.error('Assign ride error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
