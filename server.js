const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
// Add to server.js
const userRoutes = require('./routes/user');

const adminRoutes = require('./routes/admin');
require('dotenv').config();

const app = express();

// Middleware
app.use('/api/user', userRoutes);
app.use(cors());
app.use('/api/admin', adminRoutes);
app.use(express.json());

// Route imports
const authRoutes = require('./routes/auth');
const rideRoutes = require('./routes/ride');
const paymentRoutes = require('./routes/payment');
const adminRoutes = require('./routes/adminRoutes');   // ONLY ONCE

// Route mapping
app.use('/api/auth', authRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/admin', adminRoutes);     // ONLY ONCE

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Error:', err));

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
