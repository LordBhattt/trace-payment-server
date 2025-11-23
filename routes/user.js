// routes/user.js (or routes/auth.js)
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user stats
router.get('/stats', auth, async (req, res) => {
  try {
    const CabRide = require('../models/CabRide');
    
    const totalRides = await CabRide.countDocuments({ 
      userId: req.user.id,
      status: { $in: ['completed', 'paid'] }
    });
    
    const rides = await CabRide.find({ 
      userId: req.user.id,
      status: { $in: ['completed', 'paid'] }
    });
    
    let totalDistance = 0;
    let totalSpent = 0;
    
    rides.forEach(ride => {
      totalDistance += ride.distanceKm || 0;
      totalSpent += ride.fare?.total || 0;
    });
    
    res.json({ 
      success: true, 
      stats: {
        totalRides,
        totalDistance: totalDistance.toFixed(2),
        totalSpent: totalSpent.toFixed(2),
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ ADD THIS - Update FCM Token
router.post('/fcm-token', auth, async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ 
        success: false, 
        message: 'FCM token is required' 
      });
    }
    
    await User.findByIdAndUpdate(req.user.id, { 
      fcmToken: token,
      fcmTokenUpdatedAt: new Date()
    });
    
    console.log(`✅ FCM token updated for user ${req.user.id}`);
    
    res.json({ 
      success: true, 
      message: 'FCM token updated successfully' 
    });
  } catch (error) {
    console.error('❌ Error updating FCM token:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;