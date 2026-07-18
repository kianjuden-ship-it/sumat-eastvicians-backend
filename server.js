require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const reportRoutes = require('./routes/reports');
const activityRoutes = require('./routes/activity');
const analyticsRoutes = require('./routes/analytics');
const userRoutes = require('./routes/users');

// Temporary route for creating admin accounts
const setupAdminRoutes = require('./routes/setup-admins');

const app = express();

app.use(helmet());

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

const allowedOrigins = (process.env.FRONTEND_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      callback(
        new Error('This origin is not allowed to access the SUMAT Eastvicians API.')
      );
    },
    credentials: true
  })
);

// API rate limit
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false
  })
);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Main routes
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/users', userRoutes);

// Temporary admin account setup
app.use('/api/setup-admins', setupAdminRoutes);


// Error handler
app.use((err, req, res, next) => {
  if (err) {
    console.error(err);

    return res.status(err.status || 400).json({
      error: err.message || 'Something went wrong.'
    });
  }

  next();
});


// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found.'
  });
});


const port = process.env.PORT || 5050;

app.listen(port, () => {
  console.log(`SUMAT Eastvicians API listening on port ${port}`);
});
