// =====================================================================
// faculty.test.js: Supertest Integration Tests for Faculty & Simulation
// =====================================================================

const request = require('supertest');
const app = require('../app');
const pool = require('../config/db');

describe('Faculty Flow & Deadline Simulation API Tests', () => {
  let token;
  let courseId;
  let createdTaskId;

  beforeAll(async () => {
    // Authenticate as seeded faculty Dr. Sarah
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'sarah@university.edu',
        password: 'password123'
      });

    token = res.body.data.token;
  });

  afterAll(async () => {
    if (createdTaskId) {
      await pool.query('DELETE FROM TASKS WHERE task_id = ?', [createdTaskId]);
    }
    await pool.end();
  });

  test('GET /api/faculty/courses - Lists courses taught by faculty', async () => {
    const res = await request(app)
      .get('/api/faculty/courses')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);

    courseId = res.body.data[0].course_id;
  });

  test('POST /api/faculty/tasks - Creates new task & auto-assigns to semester cohort', async () => {
    const deadline = new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ');

    const res = await request(app)
      .post('/api/faculty/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({
        course_id: courseId,
        title: 'New Unit Test Project',
        description: 'Testing automatic assignment via stored procedures',
        task_type: 'project',
        deadline_datetime: deadline,
        estimated_hours: 14.0,
        difficulty_level: 4,
        cognitive_load: 7,
        assessment_weight: 20.0
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.task_id).toBeDefined();

    createdTaskId = res.body.data.task_id;
  });

  test('GET /api/faculty/tasks/:id/students - Verifies assigned student roster', async () => {
    const res = await request(app)
      .get(`/api/faculty/tasks/${createdTaskId}/students`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  test('POST /api/faculty/simulations - Simulates deadline change impact', async () => {
    // Propose moving task deadline by 6 days
    const proposed = new Date(Date.now() + 21 * 24 * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ');

    const res = await request(app)
      .post('/api/faculty/simulations')
      .set('Authorization', `Bearer ${token}`)
      .send({
        task_id: createdTaskId,
        proposed_deadline: proposed
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.simulation_id).toBeDefined();
    expect(res.body.data.original_risk).toBeDefined();
    expect(res.body.data.projected_risk).toBeDefined();
    expect(res.body.data.impact_score).toBeDefined();
    expect(res.body.data.recommendation).toBeDefined();
  });

  test('GET /api/faculty/simulations - Retrieves faculty simulation history', async () => {
    const res = await request(app)
      .get('/api/faculty/simulations')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  test('POST /api/faculty/simulator/run (alias) - Simulates deadline change via run alias', async () => {
    const proposed = new Date(Date.now() + 25 * 24 * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ');

    const res = await request(app)
      .post('/api/faculty/simulator/run')
      .set('Authorization', `Bearer ${token}`)
      .send({
        task_id: createdTaskId,
        proposed_deadline: proposed
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.simulation_id).toBeDefined();
    expect(res.body.data.recommendation).toBeDefined();
  });

  test('POST /api/faculty/simulator/run - Accepts full ISO 8601 string with timezone (e.g. 2026-12-09T02:23:00.000Z)', async () => {
    const isoString = new Date(Date.now() + 28 * 24 * 3600 * 1000).toISOString();

    const res = await request(app)
      .post('/api/faculty/simulator/run')
      .set('Authorization', `Bearer ${token}`)
      .send({
        task_id: createdTaskId,
        proposed_deadline: isoString
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.simulation_id).toBeDefined();
  });

  test('GET /api/faculty/simulator/history (alias) - Retrieves history via alias', async () => {
    const res = await request(app)
      .get('/api/faculty/simulator/history')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('POST /api/faculty/simulations - Rejects simulation for another faculty member\'s task', async () => {
    const rajAuth = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'raj@university.edu',
        password: 'password123'
      });
    const rajToken = rajAuth.body.data.token;

    const proposed = new Date(Date.now() + 25 * 24 * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ');
    const res = await request(app)
      .post('/api/faculty/simulations')
      .set('Authorization', `Bearer ${rajToken}`)
      .send({
        task_id: createdTaskId,
        proposed_deadline: proposed
      });

    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test('GET /api/faculty/courses/:id/risk-summary - Retrieves aggregated risk and student overview', async () => {
    const res = await request(app)
      .get(`/api/faculty/courses/${courseId}/risk-summary`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.course).toBeDefined();
    expect(Array.isArray(res.body.data.enrolled_students)).toBe(true);
  });
});

