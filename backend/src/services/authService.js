// =====================================================================
// authService.js: User Authentication & Registration Services
// =====================================================================

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { JWT_SECRET } = require('../middleware/auth');

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Register a new user (student, faculty, or admin)
 */
async function registerUser({
  username,
  email,
  password,
  role,
  roll_no,
  program,
  semester,
  section,
  advisor_id
}) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Check duplicate email or username
    const [existing] = await connection.query(
      'SELECT user_id FROM USERS WHERE email = ? OR username = ?',
      [email, username]
    );
    if (existing.length > 0) {
      const err = new Error('Username or email already registered');
      err.statusCode = 409;
      throw err;
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Insert user
    const [userResult] = await connection.query(
      'INSERT INTO USERS (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [username, email, password_hash, role]
    );
    const userId = userResult.insertId;
    let studentId = null;

    // If student, insert corresponding STUDENTS profile row
    if (role === 'student') {
      const studentRollNo = roll_no || `ROLL-${Date.now().toString().slice(-6)}`;
      const [studentResult] = await connection.query(
        'INSERT INTO STUDENTS (user_id, roll_no, program, semester, section, advisor_id) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, studentRollNo, program || 'Computer Science', semester || 4, section || 'A', advisor_id || null]
      );
      studentId = studentResult.insertId;

      // Automatically enroll student into existing tasks matching their semester
      const [matchingTasks] = await connection.query(
        `SELECT t.task_id 
         FROM TASKS t 
         JOIN COURSES c ON t.course_id = c.course_id 
         WHERE c.semester = ?`,
        [semester || 4]
      );

      for (const t of matchingTasks) {
        await connection.query(
          `INSERT IGNORE INTO STUDENT_TASKS (student_id, task_id, status, actual_hours, completion_percentage) 
           VALUES (?, ?, 'assigned', 0, 0)`,
          [studentId, t.task_id]
        );
      }
    }

    await connection.commit();

    // Generate JWT token
    const token = jwt.sign(
      { user_id: userId, username, email, role, student_id: studentId },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return {
      token,
      user: {
        user_id: userId,
        username,
        email,
        role,
        student_id: studentId,
        semester: semester || null,
        roll_no: roll_no || null
      }
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Authenticate user with email and password
 */
async function loginUser({ email, password }) {
  const [users] = await pool.query(
    'SELECT user_id, username, email, password_hash, role, created_at FROM USERS WHERE email = ?',
    [email]
  );

  if (users.length === 0) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }

  const user = users[0];
  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }

  // Attach student details if student
  let studentData = null;
  if (user.role === 'student') {
    const [students] = await pool.query(
      'SELECT student_id, roll_no, program, semester, section, advisor_id FROM STUDENTS WHERE user_id = ?',
      [user.user_id]
    );
    if (students.length > 0) {
      studentData = students[0];
    }
  }

  const tokenPayload = {
    user_id: user.user_id,
    username: user.username,
    email: user.email,
    role: user.role,
    ...(studentData && { student_id: studentData.student_id })
  };

  const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

  return {
    token,
    user: {
      user_id: user.user_id,
      username: user.username,
      email: user.email,
      role: user.role,
      created_at: user.created_at,
      ...(studentData || {})
    }
  };
}

/**
 * Fetch profile of current user
 */
async function getCurrentUser(userId) {
  const [users] = await pool.query(
    'SELECT user_id, username, email, role, created_at FROM USERS WHERE user_id = ?',
    [userId]
  );

  if (users.length === 0) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  const user = users[0];

  if (user.role === 'student') {
    const [students] = await pool.query(
      `SELECT s.student_id, s.roll_no, s.program, s.semester, s.section, s.advisor_id, u.username as advisor_name
       FROM STUDENTS s
       LEFT JOIN USERS u ON s.advisor_id = u.user_id
       WHERE s.user_id = ?`,
      [user.user_id]
    );
    if (students.length > 0) {
      Object.assign(user, students[0]);
    }
  }

  return user;
}

module.exports = {
  registerUser,
  loginUser,
  getCurrentUser
};

