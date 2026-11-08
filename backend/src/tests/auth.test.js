// =====================================================================
// auth.test.js: Supertest Integration Tests for Authentication
// =====================================================================

const request = require('supertest');
const app = require('../app');
const pool = require('../config/db');

describe('Auth API Integration Tests', () => {
  afterAll(async () => {
    // Clean up test user if created
    await pool.query("DELETE FROM USERS WHERE email = 'test_student_unique@test.com'");
    await pool.end();
  });

  const uniqueUser = {
    username: `testuser_${Date.now()}`,
    email: 'test_student_unique@test.com',
    password: 'password123',
    role: 'student',
    roll_no: `TEST-${Date.now().toString().slice(-4)}`,
    program: 'Computer Science',
    semester: 4,
    section: 'A'
  };

  test('POST /api/auth/register - Successfully register new student', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(uniqueUser);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe(uniqueUser.email);
    expect(res.body.data.user.role).toBe('student');
  });

  test('POST /api/auth/register - Rejects duplicate email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(uniqueUser);

    expect(res.statusCode).toBe(409);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/auth/login - Successfully login with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: uniqueUser.email,
        password: uniqueUser.password
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe(uniqueUser.email);
  });

  test('POST /api/auth/login - Rejects invalid password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: uniqueUser.email,
        password: 'wrongpassword'
      });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('GET /api/auth/me - Retrieves authenticated user with valid token', async () => {
    // First login
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: uniqueUser.email,
        password: uniqueUser.password
      });

    const token = loginRes.body.data.token;

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.statusCode).toBe(200);
    expect(meRes.body.success).toBe(true);
    expect(meRes.body.data.email).toBe(uniqueUser.email);
  });

  test('GET /api/auth/me - Rejects unauthenticated request without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

