// =====================================================================
// app.js: Express Application Factory & Middleware Setup
// =====================================================================

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const facultyRoutes = require('./routes/facultyRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// CORS configuration for Vite frontend
const allowedOrigins = [
  process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173'
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive in dev
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'UP',
      timestamp: new Date().toISOString(),
      service: 'Student Workload & Deadline Collision Analyzer API'
    },
    message: 'System operational'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/faculty', facultyRoutes);

// 404 Route Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'NotFound',
    message: `Endpoint ${req.method} ${req.originalUrl} does not exist.`
  });
});

// Centralized Error Handler
app.use(errorHandler);

module.exports = app;

