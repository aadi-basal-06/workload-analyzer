// =====================================================================
// redis.js: Redis Client Configuration & Connection Lifecycle
// =====================================================================

const { createClient } = require('redis');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const REDIS_ENABLED = process.env.REDIS_ENABLED !== 'false';

let client = null;
let isConnected = false;

if (REDIS_ENABLED) {
  client = createClient({
    url: REDIS_URL,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 8) {
          console.warn('[Redis] Max reconnection attempts reached. Continuing in fallback mode.');
          return new Error('Redis max retries reached');
        }
        return Math.min(retries * 200, 2000);
      }
    }
  });

  client.on('connect', () => {
    isConnected = true;
    console.log(`[Redis] Connected successfully to ${REDIS_URL}`);
  });

  client.on('ready', () => {
    isConnected = true;
  });

  client.on('error', (err) => {
    isConnected = false;
    // Log as warning rather than crashing Node.js runtime
    console.warn(`[Redis] Connection warning: ${err.message}`);
  });

  client.on('end', () => {
    isConnected = false;
  });
}

/**
 * Initialize connection to Redis
 */
async function connectRedis() {
  if (!REDIS_ENABLED || !client) return false;
  if (client.isOpen) {
    isConnected = true;
    return true;
  }
  try {
    await client.connect();
    isConnected = true;
    return true;
  } catch (err) {
    console.warn(`[Redis] Initial connection could not be established: ${err.message}. Operating in MySQL-fallback mode.`);
    isConnected = false;
    return false;
  }
}

/**
 * Gracefully disconnect from Redis
 */
async function disconnectRedis() {
  if (client && client.isOpen) {
    try {
      await client.quit();
    } catch (err) {
      console.warn(`[Redis] Disconnect warning: ${err.message}`);
    }
  }
  isConnected = false;
}

/**
 * Get active Redis client instance
 */
function getRedisClient() {
  return client;
}

/**
 * Check whether Redis is connected and usable
 */
function isRedisAvailable() {
  return REDIS_ENABLED && Boolean(client) && client.isOpen && isConnected;
}

// Auto-connect if enabled
if (REDIS_ENABLED && client) {
  connectRedis().catch(() => {});
}

module.exports = {
  connectRedis,
  disconnectRedis,
  getRedisClient,
  isRedisAvailable,
  REDIS_ENABLED
};

