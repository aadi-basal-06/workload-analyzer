// =====================================================================
// studentService.js: Student Operations, Workload, Tasks & Availability
// =====================================================================

const pool = require('../config/db');
const { formatMySqlDateTime } = require('../utils/dateUtils');

/**
 * Get student profile information
 */
async function getStudentProfile(studentId) {
  const [rows] = await pool.query(
    `SELECT s.student_id, s.user_id, u.username, u.email, s.roll_no, 
            s.program, s.semester, s.section, s.advisor_id, 
            adv.username AS advisor_name, adv.email AS advisor_email
     FROM STUDENTS s
     JOIN USERS u ON s.user_id = u.user_id
     LEFT JOIN USERS adv ON s.advisor_id = adv.user_id
     WHERE s.student_id = ?`,
    [studentId]
  );

  if (rows.length === 0) {
    const err = new Error('Student profile not found');
    err.statusCode = 404;
    throw err;
  }
  return rows[0];
}

/**
 * Update student profile
 */
async function updateStudentProfile(studentId, { program, section, semester, advisor_id }) {
  await pool.query(
    `UPDATE STUDENTS 
     SET program = COALESCE(?, program),
         section = COALESCE(?, section),
         semester = COALESCE(?, semester),
         advisor_id = COALESCE(?, advisor_id)
     WHERE student_id = ?`,
    [program, section, semester, advisor_id, studentId]
  );
  return getStudentProfile(studentId);
}

/**
 * Get student availability blocks
 */
async function getAvailability(studentId) {
  const [rows] = await pool.query(
    `SELECT availability_id, student_id, start_datetime, end_datetime, available_hours, availability_type
     FROM AVAILABILITY 
     WHERE student_id = ?
     ORDER BY start_datetime ASC`,
    [studentId]
  );
  return rows;
}

/**
 * Add availability slot with overlap validation
 */
async function createAvailability(studentId, { start_datetime, end_datetime, available_hours, availability_type }) {
  const start = new Date(start_datetime);
  const end = new Date(end_datetime);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    const err = new Error('Invalid start or end datetime format');
    err.statusCode = 400;
    throw err;
  }

  if (end <= start) {
    const err = new Error('End datetime must be strictly after start datetime');
    err.statusCode = 400;
    throw err;
  }

  // Reject overlapping slots for this student
  const formattedStart = formatMySqlDateTime(start_datetime);
  const formattedEnd = formatMySqlDateTime(end_datetime);

  const [overlaps] = await pool.query(
    `SELECT availability_id 
     FROM AVAILABILITY 
     WHERE student_id = ? 
       AND start_datetime < ? 
       AND end_datetime > ?`,
    [studentId, formattedEnd, formattedStart]
  );

  if (overlaps.length > 0) {
    const err = new Error('Availability slot conflicts with an existing logged block for this student');
    err.statusCode = 400;
    throw err;
  }

  // Calculate available hours from duration if not explicitly passed
  let hours = available_hours;
  if (!hours) {
    const diffMs = end.getTime() - start.getTime();
    hours = (diffMs / (1000 * 60 * 60)).toFixed(2);
  }

  const [result] = await pool.query(
    `INSERT INTO AVAILABILITY (student_id, start_datetime, end_datetime, available_hours, availability_type)
     VALUES (?, ?, ?, ?, ?)`,
    [studentId, formattedStart, formattedEnd, hours, availability_type || 'study_block']
  );

  // Synchronize workload calculation and collisions
  await pool.query('CALL sp_calculate_workload(?, NOW(), DATE_ADD(NOW(), INTERVAL 14 DAY))', [studentId]);
  await pool.query('CALL sp_detect_collisions(?)', [studentId]);

  const [created] = await pool.query(
    'SELECT * FROM AVAILABILITY WHERE availability_id = ?',
    [result.insertId]
  );
  return created[0];
}

/**
 * Update availability slot with overlap validation
 */
async function updateAvailability(studentId, availabilityId, { start_datetime, end_datetime, available_hours, availability_type }) {
  // Check ownership
  const [existing] = await pool.query(
    'SELECT * FROM AVAILABILITY WHERE availability_id = ? AND student_id = ?',
    [availabilityId, studentId]
  );
  if (existing.length === 0) {
    const err = new Error('Availability slot not found or not owned by student');
    err.statusCode = 404;
    throw err;
  }

  const startStr = formatMySqlDateTime(start_datetime || existing[0].start_datetime);
  const endStr = formatMySqlDateTime(end_datetime || existing[0].end_datetime);
  const start = new Date(startStr);
  const end = new Date(endStr);

  if (end <= start) {
    const err = new Error('End datetime must be strictly after start datetime');
    err.statusCode = 400;
    throw err;
  }

  // Check overlap excluding this slot
  const [overlaps] = await pool.query(
    `SELECT availability_id 
     FROM AVAILABILITY 
     WHERE student_id = ? 
       AND availability_id <> ?
       AND start_datetime < ? 
       AND end_datetime > ?`,
    [studentId, availabilityId, endStr, startStr]
  );

  if (overlaps.length > 0) {
    const err = new Error('Availability slot conflicts with another existing slot');
    err.statusCode = 400;
    throw err;
  }

  let hours = available_hours;
  if (!hours && (start_datetime || end_datetime)) {
    const diffMs = end.getTime() - start.getTime();
    hours = (diffMs / (1000 * 60 * 60)).toFixed(2);
  }

  await pool.query(
    `UPDATE AVAILABILITY 
     SET start_datetime = ?, 
         end_datetime = ?, 
         available_hours = COALESCE(?, available_hours),
         availability_type = COALESCE(?, availability_type)
     WHERE availability_id = ? AND student_id = ?`,
    [startStr, endStr, hours, availability_type, availabilityId, studentId]
  );

  // Sync workload analysis
  await pool.query('CALL sp_calculate_workload(?, NOW(), DATE_ADD(NOW(), INTERVAL 14 DAY))', [studentId]);
  await pool.query('CALL sp_detect_collisions(?)', [studentId]);

  const [updated] = await pool.query('SELECT * FROM AVAILABILITY WHERE availability_id = ?', [availabilityId]);
  return updated[0];
}

/**
 * Delete availability slot
 */
async function deleteAvailability(studentId, availabilityId) {
  const [existing] = await pool.query(
    'SELECT * FROM AVAILABILITY WHERE availability_id = ? AND student_id = ?',
    [availabilityId, studentId]
  );
  if (existing.length === 0) {
    const err = new Error('Availability slot not found');
    err.statusCode = 404;
    throw err;
  }

  await pool.query('DELETE FROM AVAILABILITY WHERE availability_id = ? AND student_id = ?', [availabilityId, studentId]);

  // Sync workload analysis
  await pool.query('CALL sp_calculate_workload(?, NOW(), DATE_ADD(NOW(), INTERVAL 14 DAY))', [studentId]);
  await pool.query('CALL sp_detect_collisions(?)', [studentId]);

  return { message: 'Availability slot deleted successfully' };
}

/**
 * Get all tasks assigned to the student
 */
async function getStudentTasks(studentId) {
  const [tasks] = await pool.query(
    `SELECT * FROM v_student_task_overview 
     WHERE student_id = ? 
     ORDER BY deadline_datetime ASC`,
    [studentId]
  );
  return tasks;
}

/**
 * Update task progress percentage and actual study hours
 */
async function updateTaskProgress(studentId, studentTaskId, { actual_hours, completion_percentage, status }) {
  const [existing] = await pool.query(
    'SELECT * FROM STUDENT_TASKS WHERE student_task_id = ? AND student_id = ?',
    [studentTaskId, studentId]
  );
  if (existing.length === 0) {
    const err = new Error('Task assignment record not found');
    err.statusCode = 404;
    throw err;
  }

  let newCompletion = completion_percentage !== undefined ? completion_percentage : existing[0].completion_percentage;
  let newStatus = status || existing[0].status;
  let submittedAt = existing[0].submitted_at;

  if (Number(newCompletion) >= 100) {
    newStatus = 'completed';
    if (!submittedAt) {
      submittedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    }
  } else if (Number(newCompletion) > 0 && newStatus === 'assigned') {
    newStatus = 'in_progress';
  }

  await pool.query(
    `UPDATE STUDENT_TASKS 
     SET actual_hours = COALESCE(?, actual_hours),
         completion_percentage = ?,
         status = ?,
         submitted_at = ?
     WHERE student_task_id = ? AND student_id = ?`,
    [actual_hours, newCompletion, newStatus, submittedAt, studentTaskId, studentId]
  );

  // Sync workload analysis and collisions
  await pool.query('CALL sp_calculate_workload(?, NOW(), DATE_ADD(NOW(), INTERVAL 14 DAY))', [studentId]);
  await pool.query('CALL sp_detect_collisions(?)', [studentId]);

  const [updated] = await pool.query(
    'SELECT * FROM v_student_task_overview WHERE student_task_id = ?',
    [studentTaskId]
  );
  return updated[0];
}

/**
 * Submit task
 */
async function submitTask(studentId, studentTaskId, { actual_hours }) {
  const [existing] = await pool.query(
    'SELECT * FROM STUDENT_TASKS WHERE student_task_id = ? AND student_id = ?',
    [studentTaskId, studentId]
  );
  if (existing.length === 0) {
    const err = new Error('Task assignment not found');
    err.statusCode = 404;
    throw err;
  }

  const hours = actual_hours !== undefined ? actual_hours : existing[0].actual_hours;

  await pool.query(
    `UPDATE STUDENT_TASKS 
     SET status = 'completed',
         completion_percentage = 100.00,
         submitted_at = NOW(),
         actual_hours = ?
     WHERE student_task_id = ? AND student_id = ?`,
    [hours, studentTaskId, studentId]
  );

  // Sync workload analysis and collisions
  await pool.query('CALL sp_calculate_workload(?, NOW(), DATE_ADD(NOW(), INTERVAL 14 DAY))', [studentId]);
  await pool.query('CALL sp_detect_collisions(?)', [studentId]);

  const [updated] = await pool.query(
    'SELECT * FROM v_student_task_overview WHERE student_task_id = ?',
    [studentTaskId]
  );
  return updated[0];
}

/**
 * Calculate workload and return latest analysis
 */
async function getWorkloadAnalysis(studentId, startDate, endDate) {
  const formattedStart = startDate ? formatMySqlDateTime(startDate) : null;
  const formattedEnd = endDate ? formatMySqlDateTime(endDate) : null;

  // Execute stored procedure
  await pool.query(
    'CALL sp_calculate_workload(?, ?, ?)',
    [studentId, formattedStart, formattedEnd]
  );

  // Fetch latest row from WORKLOAD_ANALYSIS
  const [rows] = await pool.query(
    `SELECT * FROM WORKLOAD_ANALYSIS 
     WHERE student_id = ? 
     ORDER BY calculated_at DESC, analysis_id DESC 
     LIMIT 1`,
    [studentId]
  );

  // Also fetch past 5 analyses for trend graph
  const [history] = await pool.query(
    `SELECT analysis_id, total_estimated_hours, available_hours, 
            temporal_pressure, workload_pressure, cognitive_pressure, 
            assessment_pressure, dependency_pressure, overall_risk_score, 
            risk_level, calculated_at 
     FROM WORKLOAD_ANALYSIS 
     WHERE student_id = ? 
     ORDER BY calculated_at DESC 
     LIMIT 7`,
    [studentId]
  );

  return {
    latest: rows.length > 0 ? rows[0] : null,
    history: history.reverse()
  };
}

/**
 * Get student collisions
 */
async function getCollisions(studentId) {
  // Run sp_detect_collisions to ensure freshness
  await pool.query('CALL sp_detect_collisions(?)', [studentId]);

  const [rows] = await pool.query(
    `SELECT c.*, wa.overall_risk_score, wa.risk_level
     FROM COLLISIONS c
     LEFT JOIN WORKLOAD_ANALYSIS wa ON c.analysis_id = wa.analysis_id
     WHERE c.student_id = ?
     ORDER BY c.resolved ASC, c.detected_at DESC`,
    [studentId]
  );
  return rows;
}

/**
 * Mark collision as resolved
 */
async function resolveCollision(studentId, collisionId) {
  const [existing] = await pool.query(
    'SELECT * FROM COLLISIONS WHERE collision_id = ? AND student_id = ?',
    [collisionId, studentId]
  );
  if (existing.length === 0) {
    const err = new Error('Collision record not found');
    err.statusCode = 404;
    throw err;
  }

  await pool.query(
    'UPDATE COLLISIONS SET resolved = TRUE WHERE collision_id = ? AND student_id = ?',
    [collisionId, studentId]
  );

  const [updated] = await pool.query('SELECT * FROM COLLISIONS WHERE collision_id = ?', [collisionId]);
  return updated[0];
}

module.exports = {
  getStudentProfile,
  updateStudentProfile,
  getAvailability,
  createAvailability,
  updateAvailability,
  deleteAvailability,
  getStudentTasks,
  updateTaskProgress,
  submitTask,
  getWorkloadAnalysis,
  getCollisions,
  resolveCollision
};

