// =====================================================================
// auth.js: JWT Authentication & Role Authorization Middleware
// =====================================================================

const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey_student_workload_analyzer_2026';

/**
 * Middleware to verify JWT token and inject authenticated user context
 */
async function authenticateJWT(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication token missing or invalid',
        message: 'Please provide a valid Bearer token in the Authorization header'
      });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
        message: err.message
      });
    }

    // Verify user exists in database
    const [rows] = await pool.query(
      'SELECT user_id, username, email, role, created_at FROM USERS WHERE user_id = ?',
      [decoded.user_id]
    );

    if (!rows || rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'User not found',
        message: 'The user account associated with this token no longer exists'
      });
    }

    const user = rows[0];

    // If student, enrich with student table metadata
    if (user.role === 'student') {
      const [studentRows] = await pool.query(
        'SELECT student_id, roll_no, program, semester, section, advisor_id FROM STUDENTS WHERE user_id = ?',
        [user.user_id]
      );
      if (studentRows && studentRows.length > 0) {
        user.student_id = studentRows[0].student_id;
        user.roll_no = studentRows[0].roll_no;
        user.program = studentRows[0].program;
        user.semester = studentRows[0].semester;
        user.section = studentRows[0].section;
        user.advisor_id = studentRows[0].advisor_id;
      }
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware to enforce role-based access control (RBAC)
 * @param  {...string} roles Allowed roles (e.g. 'student', 'faculty', 'admin')
 */
function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthenticated',
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: `Access denied. Requires one of the following roles: [${roles.join(', ')}]. Current role: "${req.user.role}"`
      });
    }

    next();
  };
}

module.exports = {
  authenticateJWT,
  authorizeRoles,
  JWT_SECRET
};

