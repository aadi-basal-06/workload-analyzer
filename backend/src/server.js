// =====================================================================
// server.js: HTTP Server Entry Point
// =====================================================================

const app = require('./app');
const { disconnectRedis } = require('./config/redis');

const PORT = process.env.PORT || 5001;

const server = app.listen(PORT, () => {
  console.log(`========================================================`);
  console.log(`Backend Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Environment:  ${process.env.NODE_ENV || 'development'}`);
  console.log(`========================================================`);
});

// Graceful shutdown
async function gracefulShutdown(signal) {
  console.log(`${signal} signal received: closing HTTP server and connections`);
  server.close(async () => {
    console.log('HTTP server closed');
    await disconnectRedis();
    process.exit(0);
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

