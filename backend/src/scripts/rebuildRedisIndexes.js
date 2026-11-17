// =====================================================================
// rebuildRedisIndexes.js: Maintenance CLI to Synchronize/Rebuild Redis
// =====================================================================

const pool = require('../config/db');
const { connectRedis, disconnectRedis, getRedisClient, isRedisAvailable } = require('../config/redis');
const { REDIS_KEYS } = require('../services/redisService');

async function rebuild() {
  const startTime = Date.now();
  console.log('=====================================================================');
  console.log('⚡ Redis Maintenance: Rebuilding Priority Queues & Student Indexes');
  console.log('=====================================================================');

  // 1. Establish Redis connection
  const redisConnected = await connectRedis();
  if (!redisConnected && !isRedisAvailable()) {
    console.error('❌ Error: Could not connect to Redis server. Aborting index rebuild.');
    await pool.end();
    process.exit(1);
  }

  const client = getRedisClient();

  try {
    // 2. Fetch all active students
    const [students] = await pool.query('SELECT student_id, roll_no FROM STUDENTS ORDER BY student_id ASC');
    console.log(`[Rebuild] Found ${students.length} students registered in MySQL.`);

    // 3. Fetch all incomplete active student tasks
    const [tasks] = await pool.query(`
      SELECT st.student_id, st.task_id, t.title, t.deadline_datetime
      FROM STUDENT_TASKS st
      JOIN TASKS t ON st.task_id = t.task_id
      WHERE st.status <> 'completed'
        AND st.completion_percentage < 100
      ORDER BY t.deadline_datetime ASC
    `);
    console.log(`[Rebuild] Found ${tasks.length} pending incomplete student tasks.`);

    // Group tasks by student_id
    const studentTasksMap = new Map();
    for (const student of students) {
      studentTasksMap.set(student.student_id, []);
    }
    for (const task of tasks) {
      if (studentTasksMap.has(task.student_id)) {
        studentTasksMap.get(task.student_id).push(task);
      }
    }

    let totalTasksIndexed = 0;
    let studentsProcessed = 0;

    // 4. Rebuild indexes for each student
    for (const student of students) {
      const studentId = student.student_id;
      const queueKey = REDIS_KEYS.deadlineQueueKey(studentId);
      const versionKey = REDIS_KEYS.studentVersionKey(studentId);

      // Clean existing sorted set
      await client.del(queueKey);

      const assignedPendingTasks = studentTasksMap.get(studentId) || [];
      if (assignedPendingTasks.length > 0) {
        const members = assignedPendingTasks.map((t) => ({
          score: new Date(t.deadline_datetime).getTime(),
          value: String(t.task_id)
        }));
        await client.zAdd(queueKey, members);
        totalTasksIndexed += members.length;
      }

      // Initialize/reset version counter to 1
      await client.set(versionKey, '1');
      studentsProcessed++;
    }

    const elapsedMs = Date.now() - startTime;

    console.log('---------------------------------------------------------------------');
    console.log('✅ Redis Index Rebuild Completed Successfully!');
    console.log(`• Students Processed:     ${studentsProcessed}`);
    console.log(`• Total Deadlines Queued: ${totalTasksIndexed}`);
    console.log(`• Execution Duration:     ${elapsedMs} ms`);
    console.log('=====================================================================');

  } catch (err) {
    console.error('❌ Rebuild encountered fatal error:', err.message);
    process.exitCode = 1;
  } finally {
    // 5. Clean teardown
    await disconnectRedis();
    await pool.end();
    console.log('[Rebuild] Closed MySQL pool and Redis connections cleanly.');
  }
}

rebuild();

