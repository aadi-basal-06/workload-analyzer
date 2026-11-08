// =====================================================================
// server.js: HTTP Server Entry Point
// =====================================================================

const app = require('./app');

const PORT = process.env.PORT || 5001;

const server = app.listen(PORT, () => {
  console.log(`========================================================`);
  console.log(`Backend Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Environment:  ${process.env.NODE_ENV || 'development'}`);
  console.log(`========================================================`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

