// =====================================================================
// redisService.js: Redis Helpers, Key Schemas, & Invalidation Tools
// =====================================================================

const { getRedisClient, isRedisAvailable } = require('../config/redis');

/**
 * Key format generators following strict namespace hierarchy
 */
const REDIS_KEYS = {
  workloadCacheKey: (studentId, version, window) =>
    `workload-analyzer:v1:workload:student:${studentId}:v${version}:${window}`,

  studentVersionKey: (studentId) =>
    `workload-analyzer:v1:workload:student:${studentId}:version`,

  deadlineQueueKey: (studentId) =>
    `workload-analyzer:v1:deadlines:student:${studentId}`
};

/**
 * Execute an arbitrary Redis operation safely.
 * If Redis is unavailable or the command throws, returns the fallback value.
 * This guarantees MySQL operations will NEVER fail due to Redis downtime.
 */
async function safeRedisOp(operationFn, fallbackValue = null) {
  if (!isRedisAvailable()) {
    return fallbackValue;
  }
  try {
    const client = getRedisClient();
    return await operationFn(client);
  } catch (error) {
    console.warn(`[Redis Service] Non-blocking Redis failure: ${error.message}`);
    return fallbackValue;
  }
}

/**
 * Retrieve current workload cache version for a student (defaults to 1 if not set)
 */
async function getStudentVersion(studentId) {
  return safeRedisOp(async (client) => {
    const key = REDIS_KEYS.studentVersionKey(studentId);
    const version = await client.get(key);
    if (!version) {
      // Initialize to 1
      await client.set(key, '1');
      return 1;
    }
    return parseInt(version, 10) || 1;
  }, 1);
}

/**
 * Invalidate student workload cache by incrementing their version counter
 */
async function incrementStudentVersion(studentId) {
  return safeRedisOp(async (client) => {
    const key = REDIS_KEYS.studentVersionKey(studentId);
    return await client.incr(key);
  }, null);
}

/**
 * Invalidate multiple students' workload cache versions simultaneously
 */
async function incrementStudentsVersion(studentIds) {
  if (!Array.isArray(studentIds) || studentIds.length === 0) return;
  return safeRedisOp(async (client) => {
    const uniqueIds = [...new Set(studentIds)];
    const promises = uniqueIds.map((id) => client.incr(REDIS_KEYS.studentVersionKey(id)));
    await Promise.all(promises);
  }, null);
}

module.exports = {
  REDIS_KEYS,
  safeRedisOp,
  getStudentVersion,
  incrementStudentVersion,
  incrementStudentsVersion
};

