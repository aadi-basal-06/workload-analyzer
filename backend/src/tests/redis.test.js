// =====================================================================
// redis.test.js: Integration & Unit Tests for Redis NoSQL Features
// =====================================================================

const request = require('supertest');
const app = require('../app');
const pool = require('../config/db');
const { connectRedis, disconnectRedis, getRedisClient, isRedisAvailable } = require('../config/redis');
const {
  getCachedWorkload,
  setCachedWorkload,
  invalidateStudentWorkloadCache
} = require('../services/workloadCacheService');
const {
  addTaskToStudentQueue,
  removeTaskFromStudentQueue,
  getStudentDeadlinesPriority
} = require('../services/deadlineQueueService');
const { getStudentVersion } = require('../services/redisService');

describe('Redis NoSQL Integration Tests', () => {
  let studentToken;
  let studentId;

  beforeAll(async () => {
    await connectRedis();

    // Authenticate as seeded student Alice Wong
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'alice@university.edu',
        password: 'password123'
      });

    studentToken = loginRes.body.data.token;
    studentId = loginRes.body.data.user.student_id;
  });

  afterAll(async () => {
    await disconnectRedis();
    await pool.end();
  });

  describe('Feature A: Workload Analysis Caching', () => {
    test('Stores and retrieves workload analysis from Redis cache', async () => {
      // 1. Initial request (may be cache miss or hit)
      const res1 = await request(app)
        .get('/api/student/workload/current')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res1.statusCode).toBe(200);
      expect(res1.body.success).toBe(true);
      expect(res1.body.data.latest).toBeDefined();

      // 2. Immediate second request should be served from Redis cache
      const res2 = await request(app)
        .get('/api/student/workload/current')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res2.statusCode).toBe(200);
      expect(res2.body.success).toBe(true);
      if (isRedisAvailable()) {
        expect(res2.body.data.source).toBe('redis');
      }
    });

    test('Version-based invalidation causes fresh recalculation without using KEYS', async () => {
      if (!isRedisAvailable()) return;

      const initialVersion = await getStudentVersion(studentId);

      // Invalidate student cache via version incrementation
      await invalidateStudentWorkloadCache(studentId);

      const nextVersion = await getStudentVersion(studentId);
      expect(nextVersion).toBe(initialVersion + 1);

      // Next request must be fresh from MySQL
      const res = await request(app)
        .get('/api/student/workload/current')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.source).toBe('mysql');

      // Following request is cached under the new version
      const cachedRes = await request(app)
        .get('/api/student/workload/current')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(cachedRes.body.data.source).toBe('redis');
    });
  });

  describe('Feature B: Sorted Set Deadline Priority Queue', () => {
    test('GET /api/student/deadlines/priority - Returns sorted deadlines with urgency indicators', async () => {
      const res = await request(app)
        .get('/api/student/deadlines/priority?limit=5')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.tasks)).toBe(true);
      expect(res.body.data.tasks.length).toBeGreaterThan(0);

      const tasks = res.body.data.tasks;

      // Verify earliest deadlines first
      for (let i = 0; i < tasks.length - 1; i++) {
        expect(tasks[i].deadline_ms).toBeLessThanOrEqual(tasks[i + 1].deadline_ms);
        expect(tasks[i].priority_rank).toBe(i + 1);
        expect(tasks[i].urgency_status).toBeDefined();
      }

      if (isRedisAvailable()) {
        expect(['redis', 'mysql']).toContain(res.body.data.source);
      }
    });

    test('GET /api/student/deadlines/priority - Supports withinDays filter parameter', async () => {
      const res = await request(app)
        .get('/api/student/deadlines/priority?withinDays=30')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.tasks)).toBe(true);
    });

    test('Queue reflects removal when a task is marked completed', async () => {
      if (!isRedisAvailable()) return;

      const dummyTaskId = 99999;
      const futureDeadline = new Date(Date.now() + 86400000).toISOString();

      // Add to student queue
      await addTaskToStudentQueue(studentId, dummyTaskId, futureDeadline);

      // Verify present
      const client = getRedisClient();
      const scoreBefore = await client.zScore(
        `workload-analyzer:v1:deadlines:student:${studentId}`,
        String(dummyTaskId)
      );
      expect(scoreBefore).not.toBeNull();

      // Remove from queue
      await removeTaskFromStudentQueue(studentId, dummyTaskId);

      const scoreAfter = await client.zScore(
        `workload-analyzer:v1:deadlines:student:${studentId}`,
        String(dummyTaskId)
      );
      expect(scoreAfter).toBeNull();
    });
  });

  describe('Feature C: Fallback Resilience', () => {
    test('getStudentDeadlinesPriority falls back to MySQL gracefully without crashing', async () => {
      // Direct call requesting deadlines
      const result = await getStudentDeadlinesPriority(studentId, { limit: 3 });

      expect(result).toBeDefined();
      expect(Array.isArray(result.tasks)).toBe(true);
      expect(result.total).toBeGreaterThanOrEqual(0);
      expect(['redis', 'mysql']).toContain(result.source);
    });
  });
});

