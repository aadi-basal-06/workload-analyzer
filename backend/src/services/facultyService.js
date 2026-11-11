// =====================================================================
// facultyService.js: Faculty Course Management, Tasks, & Simulation Engine
// =====================================================================

const pool = require('../config/db');
const { formatMySqlDateTime } = require('../utils/dateUtils');

/**
 * Fetch courses taught by the faculty
 */
async function getCourses(facultyId) {
  const [courses] = await pool.query(
    `SELECT c.*, 
            COUNT(DISTINCT t.task_id) AS total_tasks,
            COUNT(DISTINCT s.student_id) AS total_enrolled_students
     FROM COURSES c
     LEFT JOIN TASKS t ON c.course_id = t.course_id
     LEFT JOIN STUDENTS s ON s.semester = c.semester
     WHERE c.faculty_id = ?
     GROUP BY c.course_id
     ORDER BY c.course_code ASC`,
    [facultyId]
  );
  return courses;
}

/**
 * Create a new course
 */
async function createCourse(facultyId, { course_code, course_name, credits, semester }) {
  const [result] = await pool.query(
    `INSERT INTO COURSES (course_code, course_name, faculty_id, credits, semester)
     VALUES (?, ?, ?, ?, ?)`,
    [course_code, course_name, facultyId, credits || 3, semester || 4]
  );

  const [created] = await pool.query('SELECT * FROM COURSES WHERE course_id = ?', [result.insertId]);
  return created[0];
}

/**
 * Get single course by ID
 */
async function getCourseById(facultyId, courseId) {
  const [rows] = await pool.query(
    'SELECT * FROM COURSES WHERE course_id = ? AND faculty_id = ?',
    [courseId, facultyId]
  );
  if (rows.length === 0) {
    const err = new Error('Course not found or access unauthorized');
    err.statusCode = 404;
    throw err;
  }
  return rows[0];
}

/**
 * Update course
 */
async function updateCourse(facultyId, courseId, { course_code, course_name, credits, semester }) {
  const course = await getCourseById(facultyId, courseId);

  await pool.query(
    `UPDATE COURSES 
     SET course_code = COALESCE(?, course_code),
         course_name = COALESCE(?, course_name),
         credits = COALESCE(?, credits),
         semester = COALESCE(?, semester)
     WHERE course_id = ? AND faculty_id = ?`,
    [course_code, course_name, credits, semester, courseId, facultyId]
  );

  return getCourseById(facultyId, courseId);
}

/**
 * Delete course
 */
async function deleteCourse(facultyId, courseId) {
  await getCourseById(facultyId, courseId);
  await pool.query('DELETE FROM COURSES WHERE course_id = ? AND faculty_id = ?', [courseId, facultyId]);
  return { message: 'Course and associated tasks deleted successfully' };
}

/**
 * Get all tasks for this faculty's courses
 */
async function getTasks(facultyId, courseId = null) {
  let query = `
    SELECT t.*, c.course_code, c.course_name, c.semester,
           COUNT(DISTINCT st.student_id) AS assigned_students,
           COALESCE(ROUND(AVG(st.completion_percentage), 2), 0.00) AS avg_completion_percentage
    FROM TASKS t
    JOIN COURSES c ON t.course_id = c.course_id
    LEFT JOIN STUDENT_TASKS st ON t.task_id = st.task_id
    WHERE c.faculty_id = ?
  `;
  const params = [facultyId];

  if (courseId) {
    query += ' AND t.course_id = ?';
    params.push(courseId);
  }

  query += ' GROUP BY t.task_id ORDER BY t.deadline_datetime ASC';

  const [tasks] = await pool.query(query, params);
  return tasks;
}

/**
 * Create task and automatically assign to matching semester students
 */
async function createTask(facultyId, {
  course_id,
  title,
  description,
  task_type,
  release_datetime,
  deadline_datetime,
  estimated_hours,
  difficulty_level,
  cognitive_load,
  assessment_weight,
  is_team_task
}) {
  // Verify ownership of course
  await getCourseById(facultyId, course_id);

  // Validate dates
  const relDt = formatMySqlDateTime(release_datetime) || formatMySqlDateTime(new Date());
  const deadlineDt = formatMySqlDateTime(deadline_datetime);
  if (new Date(deadlineDt) <= new Date(relDt)) {
    const err = new Error('Deadline datetime must be strictly after release datetime');
    err.statusCode = 400;
    throw err;
  }

  const [result] = await pool.query(
    `INSERT INTO TASKS (
       course_id, title, description, task_type,
       release_datetime, deadline_datetime, estimated_hours,
       difficulty_level, cognitive_load, assessment_weight,
       is_team_task, status
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
    [
      course_id,
      title,
      description || '',
      task_type || 'assignment',
      relDt,
      deadlineDt,
      estimated_hours || 5.0,
      difficulty_level || 3,
      cognitive_load || 5,
      assessment_weight || 10.0,
      is_team_task ? 1 : 0
    ]
  );

  const taskId = result.insertId;

  // Auto-assign to semester students via stored procedure
  await pool.query('CALL sp_assign_task_to_students(?)', [taskId]);

  const [created] = await pool.query(
    `SELECT t.*, c.course_code, c.course_name 
     FROM TASKS t 
     JOIN COURSES c ON t.course_id = c.course_id 
     WHERE t.task_id = ?`,
    [taskId]
  );
  return created[0];
}

/**
 * Get task details by ID with dependencies
 */
async function getTaskById(facultyId, taskId) {
  const [rows] = await pool.query(
    `SELECT t.*, c.course_code, c.course_name, c.semester, c.faculty_id
     FROM TASKS t
     JOIN COURSES c ON t.course_id = c.course_id
     WHERE t.task_id = ? AND c.faculty_id = ?`,
    [taskId, facultyId]
  );

  if (rows.length === 0) {
    const err = new Error('Task not found or unauthorized');
    err.statusCode = 404;
    throw err;
  }

  const task = rows[0];

  // Fetch prerequisite dependencies
  const [prereqs] = await pool.query(
    `SELECT td.dependency_id, td.prerequisite_task_id, td.dependency_type,
            pt.title AS prerequisite_title, pt.deadline_datetime AS prerequisite_deadline
     FROM TASK_DEPENDENCIES td
     JOIN TASKS pt ON td.prerequisite_task_id = pt.task_id
     WHERE td.task_id = ?`,
    [taskId]
  );

  task.prerequisites = prereqs;
  return task;
}

/**
 * Update task
 */
async function updateTask(facultyId, taskId, fields) {
  await getTaskById(facultyId, taskId);

  const {
    title,
    description,
    task_type,
    release_datetime,
    deadline_datetime,
    estimated_hours,
    difficulty_level,
    cognitive_load,
    assessment_weight,
    is_team_task,
    status
  } = fields;

  const formattedRelease = release_datetime !== undefined ? formatMySqlDateTime(release_datetime) : null;
  const formattedDeadline = deadline_datetime !== undefined ? formatMySqlDateTime(deadline_datetime) : null;

  await pool.query(
    `UPDATE TASKS 
     SET title = COALESCE(?, title),
         description = COALESCE(?, description),
         task_type = COALESCE(?, task_type),
         release_datetime = COALESCE(?, release_datetime),
         deadline_datetime = COALESCE(?, deadline_datetime),
         estimated_hours = COALESCE(?, estimated_hours),
         difficulty_level = COALESCE(?, difficulty_level),
         cognitive_load = COALESCE(?, cognitive_load),
         assessment_weight = COALESCE(?, assessment_weight),
         is_team_task = COALESCE(?, is_team_task),
         status = COALESCE(?, status)
     WHERE task_id = ?`,
    [
      title,
      description,
      task_type,
      formattedRelease,
      formattedDeadline,
      estimated_hours,
      difficulty_level,
      cognitive_load,
      assessment_weight,
      is_team_task,
      status,
      taskId
    ]
  );

  return getTaskById(facultyId, taskId);
}

/**
 * Delete task
 */
async function deleteTask(facultyId, taskId) {
  await getTaskById(facultyId, taskId);
  await pool.query('DELETE FROM TASKS WHERE task_id = ?', [taskId]);
  return { message: 'Task deleted successfully' };
}

/**
 * Add prerequisite dependency
 */
async function addDependency(facultyId, taskId, { prerequisite_task_id, dependency_type }) {
  await getTaskById(facultyId, taskId);

  if (Number(taskId) === Number(prerequisite_task_id)) {
    const err = new Error('A task cannot depend on itself');
    err.statusCode = 400;
    throw err;
  }

  // Check prerequisite task exists
  const [prereq] = await pool.query('SELECT task_id, title FROM TASKS WHERE task_id = ?', [prerequisite_task_id]);
  if (prereq.length === 0) {
    const err = new Error('Prerequisite task does not exist');
    err.statusCode = 404;
    throw err;
  }

  // Insert into TASK_DEPENDENCIES (trigger trg_prevent_circular_dependencies verifies cycles)
  const [result] = await pool.query(
    'INSERT INTO TASK_DEPENDENCIES (task_id, prerequisite_task_id, dependency_type) VALUES (?, ?, ?)',
    [taskId, prerequisite_task_id, dependency_type || 'hard_prerequisite']
  );

  return {
    dependency_id: result.insertId,
    task_id: taskId,
    prerequisite_task_id,
    dependency_type: dependency_type || 'hard_prerequisite'
  };
}

/**
 * Delete dependency
 */
async function deleteDependency(facultyId, taskId, prerequisiteTaskId) {
  await getTaskById(facultyId, taskId);

  await pool.query(
    'DELETE FROM TASK_DEPENDENCIES WHERE task_id = ? AND prerequisite_task_id = ?',
    [taskId, prerequisiteTaskId]
  );

  return { message: 'Dependency removed successfully' };
}

/**
 * Get assigned students for a task
 */
async function getTaskStudents(facultyId, taskId) {
  await getTaskById(facultyId, taskId);

  const [students] = await pool.query(
    `SELECT st.student_task_id, st.student_id, s.roll_no, u.username AS student_name,
            u.email AS student_email, s.section, s.program,
            st.assigned_at, st.status, st.actual_hours, st.completion_percentage,
            st.submitted_at, st.score
     FROM STUDENT_TASKS st
     JOIN STUDENTS s ON st.student_id = s.student_id
     JOIN USERS u ON s.user_id = u.user_id
     WHERE st.task_id = ?
     ORDER BY s.roll_no ASC`,
    [taskId]
  );

  return students;
}

/**
 * Execute deadline simulation via stored procedure
 */
async function runSimulation(facultyId, { task_id, proposed_deadline }) {
  if (!task_id || !proposed_deadline) {
    const err = new Error('task_id and proposed_deadline are required');
    err.statusCode = 400;
    throw err;
  }

  // Verify task exists and belongs to this faculty member (reuses existing ownership lookup)
  await getTaskById(facultyId, task_id);

  // Normalize proposed_deadline to MySQL DATETIME format (YYYY-MM-DD HH:MM:SS)
  const formattedDeadline = formatMySqlDateTime(proposed_deadline);

  // Call simulation stored procedure
  await pool.query(
    'CALL sp_simulate_deadline_change(?, ?, ?)',
    [task_id, formattedDeadline, facultyId]
  );

  // Retrieve the most recently created simulation
  const [sims] = await pool.query(
    `SELECT s.*, t.title AS task_title, c.course_code 
     FROM SIMULATIONS s
     JOIN TASKS t ON s.task_id = t.task_id
     JOIN COURSES c ON t.course_id = c.course_id
     WHERE s.faculty_id = ? 
     ORDER BY s.created_at DESC, s.simulation_id DESC 
     LIMIT 1`,
    [facultyId]
  );

  return sims.length > 0 ? sims[0] : null;
}

/**
 * Get history of simulations for this faculty
 */
async function getSimulations(facultyId) {
  const [sims] = await pool.query(
    `SELECT s.*, t.title AS task_title, c.course_code, c.course_name
     FROM SIMULATIONS s
     JOIN TASKS t ON s.task_id = t.task_id
     JOIN COURSES c ON t.course_id = c.course_id
     WHERE s.faculty_id = ?
     ORDER BY s.created_at DESC`,
    [facultyId]
  );
  return sims;
}

/**
 * Get course risk overview and enrolled student details
 */
async function getCourseRiskSummary(facultyId, courseId) {
  await getCourseById(facultyId, courseId);

  // Get aggregated stats from view
  const [summary] = await pool.query(
    'SELECT * FROM v_course_risk_summary WHERE course_id = ?',
    [courseId]
  );

  // Get enrolled students and their individual latest risk
  const [students] = await pool.query(
    `SELECT s.student_id, s.roll_no, u.username AS student_name, u.email,
            s.section, s.semester,
            COALESCE(latest_wa.overall_risk_score, 0.00) AS overall_risk_score,
            COALESCE(latest_wa.risk_level, 'LOW') AS risk_level,
            COALESCE(latest_wa.temporal_pressure, 0.00) AS temporal_pressure,
            COALESCE(latest_wa.workload_pressure, 0.00) AS workload_pressure,
            COALESCE(latest_wa.cognitive_pressure, 0.00) AS cognitive_pressure,
            COALESCE(latest_wa.assessment_pressure, 0.00) AS assessment_pressure,
            COALESCE(latest_wa.dependency_pressure, 0.00) AS dependency_pressure,
            (SELECT COUNT(*) FROM COLLISIONS c WHERE c.student_id = s.student_id AND c.resolved = FALSE) AS active_collisions
     FROM COURSES c
     JOIN STUDENTS s ON c.semester = s.semester
     JOIN USERS u ON s.user_id = u.user_id
     LEFT JOIN (
       SELECT wa1.*
       FROM WORKLOAD_ANALYSIS wa1
       JOIN (
         SELECT student_id, MAX(analysis_id) AS max_id 
         FROM WORKLOAD_ANALYSIS 
         GROUP BY student_id
       ) wa_max ON wa1.analysis_id = wa_max.max_id
     ) latest_wa ON s.student_id = latest_wa.student_id
     WHERE c.course_id = ?
     ORDER BY latest_wa.overall_risk_score DESC`,
    [courseId]
  );

  return {
    course: summary.length > 0 ? summary[0] : null,
    enrolled_students: students
  };
}

module.exports = {
  getCourses,
  createCourse,
  getCourseById,
  updateCourse,
  deleteCourse,
  getTasks,
  createTask,
  getTaskById,
  updateTask,
  deleteTask,
  addDependency,
  deleteDependency,
  getTaskStudents,
  runSimulation,
  getSimulations,
  getCourseRiskSummary
};

