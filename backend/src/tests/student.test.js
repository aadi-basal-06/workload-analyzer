// =====================================================================
// student.test.js: Supertest Integration Tests for Student Flows
// =====================================================================

const request = require('supertest');
const app = require('../app');
const pool = require('../config/db');

describe('Student Flow API Tests', () => {
  let token;
  let studentId;
  let studentTaskId;
  let createdSlotId;
  let collisionId;

  beforeAll(async () => {
    // Authenticate as seeded student Alice Wong
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'alice@university.edu',
        password: 'password123'
      });

    token = res.body.data.token;
    studentId = res.body.data.user.student_id;
  });

  afterAll(async () => {
    if (createdSlotId) {
      await pool.query('DELETE FROM AVAILABILITY WHERE availability_id = ?', [createdSlotId]);
    }
    await pool.end();
  });

  test('GET /api/student/profile - Retrieves student academic profile', async () => {
    const res = await request(app)
      .get('/api/student/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.roll_no).toBe('CS2024-001');
    expect(res.body.data.semester).toBe(4);
  });

  test('GET /api/student/tasks - Retrieves assigned course tasks', async () => {
    const res = await request(app)
      .get('/api/student/tasks')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);

    studentTaskId = res.body.data[0].student_task_id;
  });

  test('PATCH /api/student/tasks/:id/progress - Updates task completion percentage', async () => {
    const res = await request(app)
      .patch(`/api/student/tasks/${studentTaskId}/progress`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        actual_hours: 4.5,
        completion_percentage: 60.0
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Number(res.body.data.completion_percentage)).toBe(60);
  });

  test('POST /api/student/availability - Creates valid availability slot', async () => {
    const start = new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ');
    const end = new Date(Date.now() + 10 * 24 * 3600 * 1000 + 4 * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ');

    const res = await request(app)
      .post('/api/student/availability')
      .set('Authorization', `Bearer ${token}`)
      .send({
        start_datetime: start,
        end_datetime: end,
        available_hours: 4.0,
        availability_type: 'exam_study'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.availability_id).toBeDefined();
    createdSlotId = res.body.data.availability_id;
  });

  test('GET /api/student/workload - Executes sp_calculate_workload & returns 5 pressures', async () => {
    const res = await request(app)
      .get('/api/student/workload')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.latest).toBeDefined();

    const analysis = res.body.data.latest;
    expect(analysis.temporal_pressure).toBeDefined();
    expect(analysis.workload_pressure).toBeDefined();
    expect(analysis.cognitive_pressure).toBeDefined();
    expect(analysis.assessment_pressure).toBeDefined();
    expect(analysis.dependency_pressure).toBeDefined();
    expect(analysis.overall_risk_score).toBeDefined();
    expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(analysis.risk_level);
  });

  test('GET /api/student/workload/current - Retrieves current workload for student', async () => {
    const res = await request(app)
      .get('/api/student/workload/current')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.latest).toBeDefined();
    expect(res.body.data.history).toBeDefined();
  });

  test('POST /api/student/workload/calculate - Recalculates student workload', async () => {
    const res = await request(app)
      .post('/api/student/workload/calculate')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.latest).toBeDefined();
  });

  test('GET /api/student/collisions - Retrieves detected collision events', async () => {
    const res = await request(app)
      .get('/api/student/collisions')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);

    collisionId = res.body.data[0].collision_id;
  });

  test('PATCH /api/student/collisions/:id/resolve - Marks a collision as resolved', async () => {
    const res = await request(app)
      .patch(`/api/student/collisions/${collisionId}/resolve`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Boolean(res.body.data.resolved)).toBe(true);
  });
});

