// =====================================================================
// deadlineQueueService.js: Redis Sorted Set Priority Queue for Deadlines
// =====================================================================

const pool = require('../config/db');
const { isRedisAvailable } = require('../config/redis');
const { REDIS_KEYS, safeRedisOp } = require('./redisService');

/**
 * Helper to compute task urgency indicators
 */
function enrichUrgency(task, scoreMs) {
  const deadlineMs = scoreMs || new Date(task.deadline_datetime).getTime();
  const nowMs = Date.now();
  const diffHours = Math.round((deadlineMs - nowMs) / (1000 * 60 * 60));
  const isOverdue = diffHours < 0;

  let urgencyStatus = 'UPCOMING';
  if (isOverdue) {
    urgencyStatus = 'OVERDUE';
  } else if (diffHours <= 24) {
    urgencyStatus = 'DUE_TODAY';
  } else if (diffHours <= 72) {
    urgencyStatus = 'DUE_SOON';
  }

  return {
    ...task,
    deadline_ms: deadlineMs,
    hours_until_deadline: diffHours,
    is_overdue: isOverdue,
    urgency_status: urgencyStatus
  };
}

/**
 * Add a task to an individual student's deadline queue
 */
async function addTaskToStudentQueue(studentId, taskId, deadline) {
  const score = new Date(deadline).getTime();
  if (isNaN(score)) return false;

  return safeRedisOp(async (client) => {
    const key = REDIS_KEYS.deadlineQueueKey(studentId);
    await client.zAdd(key, [{ score, value: String(taskId) }]);
    return true;
  }, false);
}

/**
 * Add a task to multiple students' deadline queues
 */
async function addTasksToStudentsQueue(studentIds, taskId, deadline) {
  const score = new Date(deadline).getTime();
  if (isNaN(score) || !Array.isArray(studentIds) || studentIds.length === 0) return false;

  return safeRedisOp(async (client) => {
    const promises = studentIds.map((studentId) => {
      const key = REDIS_KEYS.deadlineQueueKey(studentId);
      return client.zAdd(key, [{ score, value: String(taskId) }]);
    });
    await Promise.all(promises);
    return true;
  }, false);
}

/**
 * Update task deadline score across multiple students' deadline queues
 */
async function updateTaskDeadlineInQueues(studentIds, taskId, deadline) {
  return addTasksToStudentsQueue(studentIds, taskId, deadline);
}

/**
 * Remove task from an individual student's deadline queue (e.g. upon completion)
 */
async function removeTaskFromStudentQueue(studentId, taskId) {
  return safeRedisOp(async (client) => {
    const key = REDIS_KEYS.deadlineQueueKey(studentId);
    await client.zRem(key, String(taskId));
    return true;
  }, false);
}

/**
 * Remove task from all assigned student deadline queues (e.g. upon task deletion)
 */
async function removeTaskFromAllQueues(taskId, studentIds = null) {
  return safeRedisOp(async (client) => {
    let targetStudentIds = studentIds;
    if (!targetStudentIds) {
      const [rows] = await pool.query(
        'SELECT DISTINCT student_id FROM STUDENT_TASKS WHERE task_id = ?',
        [taskId]
      );
      targetStudentIds = rows.map((r) => r.student_id);
    }

    if (targetStudentIds.length === 0) return true;

    const promises = targetStudentIds.map((studentId) => {
      const key = REDIS_KEYS.deadlineQueueKey(studentId);
      return client.zRem(key, String(taskId));
    });
    await Promise.all(promises);
    return true;
  }, false);
}

/**
 * Backfill student deadline queue in Redis from MySQL
 */
async function backfillStudentQueue(studentId) {
  return safeRedisOp(async (client) => {
    const [rows] = await pool.query(
      `SELECT t.task_id, t.deadline_datetime
       FROM STUDENT_TASKS st
       JOIN TASKS t ON st.task_id = t.task_id
       WHERE st.student_id = ?
         AND st.status <> 'completed'
         AND st.completion_percentage < 100`,
      [studentId]
    );

    const key = REDIS_KEYS.deadlineQueueKey(studentId);
    await client.del(key);

    if (rows.length > 0) {
      const members = rows.map((r) => ({
        score: new Date(r.deadline_datetime).getTime(),
        value: String(r.task_id)
      }));
      await client.zAdd(key, members);
    }
    return rows.length;
  }, 0);
}

/**
 * Retrieve sorted deadline priority queue for a student
 * Hybrid workflow:
 * 1. Query Redis Sorted Set (earliest deadlines first, including overdue)
 * 2. Enrich task IDs from MySQL
 * 3. Graceful fallback to MySQL query if Redis is offline or empty
 */
async function getStudentDeadlinesPriority(studentId, { withinDays = null, limit = 10 } = {}) {
  const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
  const nowMs = Date.now();

  // Try Redis path if available
  if (isRedisAvailable()) {
    try {
      const client = require('../config/redis').getRedisClient();
      const key = REDIS_KEYS.deadlineQueueKey(studentId);

      // Check set cardinality
      const totalInQueue = await client.zCard(key);

      // If key exists and has items
      if (totalInQueue > 0) {
        const minScore = '-inf';
        const maxScore = withinDays !== null && withinDays !== undefined
          ? String(nowMs + Number(withinDays) * 86400000)
          : '+inf';

        const redisItems = await client.zRangeWithScores(key, minScore, maxScore, {
          BY: 'SCORE',
          LIMIT: { offset: 0, count: parsedLimit }
        });

        if (redisItems.length > 0) {
          const taskIds = redisItems.map((item) => parseInt(item.value, 10));
          const scoreMap = new Map(redisItems.map((item) => [String(item.value), item.score]));

          // Enrich details from MySQL
          const [details] = await pool.query(
            `SELECT st.student_task_id, st.task_id, st.student_id,
                    st.completion_percentage, st.actual_hours, st.status AS submission_status,
                    t.title AS task_title, t.description, t.task_type,
                    t.deadline_datetime, t.estimated_hours, t.difficulty_level,
                    t.cognitive_load, t.assessment_weight,
                    c.course_code, c.course_name
             FROM STUDENT_TASKS st
             JOIN TASKS t ON st.task_id = t.task_id
             JOIN COURSES c ON t.course_id = c.course_id
             WHERE st.student_id = ? AND st.task_id IN (?)`,
            [studentId, taskIds]
          );

          // Map by task_id for rapid lookup
          const detailMap = new Map(details.map((d) => [String(d.task_id), d]));

          // Preserve exact Redis sorted set order
          const enrichedTasks = [];
          for (let i = 0; i < redisItems.length; i++) {
            const taskIdStr = String(redisItems[i].value);
            const task = detailMap.get(taskIdStr);
            if (task) {
              const enriched = enrichUrgency(task, scoreMap.get(taskIdStr));
              enriched.priority_rank = enrichedTasks.length + 1;
              enrichedTasks.push(enriched);
            }
          }

          return {
            tasks: enrichedTasks,
            total: enrichedTasks.length,
            source: 'redis'
          };
        }
      } else {
        // Cold queue in Redis: backfill asynchronously for next calls
        backfillStudentQueue(studentId).catch(() => {});
      }
    } catch (err) {
      console.warn(`[Deadline Queue] Redis retrieval failure: ${err.message}. Falling back to MySQL.`);
    }
  }

  // Fallback direct MySQL retrieval
  let query = `
    SELECT st.student_task_id, st.task_id, st.student_id,
           st.completion_percentage, st.actual_hours, st.status AS submission_status,
           t.title AS task_title, t.description, t.task_type,
           t.deadline_datetime, t.estimated_hours, t.difficulty_level,
           t.cognitive_load, t.assessment_weight,
           c.course_code, c.course_name
    FROM STUDENT_TASKS st
    JOIN TASKS t ON st.task_id = t.task_id
    JOIN COURSES c ON t.course_id = c.course_id
    WHERE st.student_id = ?
      AND st.status <> 'completed'
      AND st.completion_percentage < 100
  `;
  const params = [studentId];

  if (withinDays !== null && withinDays !== undefined) {
    query += ' AND t.deadline_datetime <= DATE_ADD(NOW(), INTERVAL ? DAY)';
    params.push(parseInt(withinDays, 10));
  }

  query += ' ORDER BY t.deadline_datetime ASC LIMIT ?';
  params.push(parsedLimit);

  const [rows] = await pool.query(query, params);

  const enrichedTasks = rows.map((task, idx) => {
    const enriched = enrichUrgency(task);
    enriched.priority_rank = idx + 1;
    return enriched;
  });

  return {
    tasks: enrichedTasks,
    total: enrichedTasks.length,
    source: 'mysql'
  };
}

module.exports = {
  addTaskToStudentQueue,
  addTasksToStudentsQueue,
  updateTaskDeadlineInQueues,
  removeTaskFromStudentQueue,
  removeTaskFromAllQueues,
  getStudentDeadlinesPriority,
  backfillStudentQueue
};

