const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

// FIXED IMPORTS
const authRoutes = require('./routes/auth');
const rideRoutes = require('./routes/ride');
const paymentRoutes = require('./routes/payment');
const adminRoutes = require('./routes/adminRoutes'); 

app.use('/api/auth', authRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/admin', adminRoutes);

// MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
