const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Route imports - ✅ FIXED NAMES
const authRoutes = require('./routes/auth');
const rideRoutes = require('./routes/cabride');      // lowercase
const paymentRoutes = require('./routes/payment');
const adminRoutes = require('./routes/admin');       // lowercase
const userRoutes = require('./routes/user');

// Route mapping
app.use('/api/auth', authRoutes);
app.use('/api/cabride', rideRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'TRACE Backend API is running!' });
});

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Error:', err));

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});