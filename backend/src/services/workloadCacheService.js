// =====================================================================
// workloadCacheService.js: Redis Student Workload Analysis Caching
// =====================================================================

const {
  REDIS_KEYS,
  safeRedisOp,
  getStudentVersion,
  incrementStudentVersion,
  incrementStudentsVersion
} = require('./redisService');

const DEFAULT_TTL = parseInt(process.env.REDIS_WORKLOAD_CACHE_TTL || '300', 10);

/**
 * Attempt to retrieve cached workload analysis for a student and window
 */
async function getCachedWorkload(studentId, window = '14d') {
  return safeRedisOp(async (client) => {
    const version = await getStudentVersion(studentId);
    const key = REDIS_KEYS.workloadCacheKey(studentId, version, window);
    const raw = await client.get(key);
    if (!raw) return null;
    return JSON.parse(raw);
  }, null);
}

/**
 * Store calculated workload analysis into Redis with TTL
 */
async function setCachedWorkload(studentId, window = '14d', data, ttl = DEFAULT_TTL) {
  return safeRedisOp(async (client) => {
    const version = await getStudentVersion(studentId);
    const key = REDIS_KEYS.workloadCacheKey(studentId, version, window);
    await client.set(key, JSON.stringify(data), { EX: ttl });
    return true;
  }, false);
}

/**
 * Invalidate student workload cache via version incrementation
 */
async function invalidateStudentWorkloadCache(studentId) {
  return incrementStudentVersion(studentId);
}

/**
 * Invalidate multiple students' workload caches (e.g. course-wide assignments)
 */
async function invalidateStudentsWorkloadCache(studentIds) {
  return incrementStudentsVersion(studentIds);
}

module.exports = {
  getCachedWorkload,
  setCachedWorkload,
  invalidateStudentWorkloadCache,
  invalidateStudentsWorkloadCache,
  DEFAULT_TTL
};

