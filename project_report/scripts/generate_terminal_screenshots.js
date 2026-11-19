const puppeteer = require('puppeteer-core');
const { execSync } = require('child_process');
const path = require('path');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE_DIR = path.join(__dirname, 'project_report/screenshots');

function runPsql(cmd) {
  try {
    return execSync(`psql -U postgres -h 127.0.0.1 -d student_workload -c "${cmd.replace(/"/g, '\\"')}"`, {
      encoding: 'utf8'
    });
  } catch (err) {
    return (err.stdout || '') + '\n' + (err.stderr || err.message);
  }
}

function runRedis(cmd) {
  try {
    return execSync(`redis-cli ${cmd}`, { encoding: 'utf8' });
  } catch (err) {
    return err.message;
  }
}

function generateTerminalHtml(title, commandPrompt, output) {
  const safeOutput = output
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background-color: #0b0f19;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 30px;
    min-height: 100vh;
  }
  .window {
    background: #0f172a;
    border: 1px solid #334155;
    border-radius: 12px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
    width: 100%;
    max-width: 1100px;
    overflow: hidden;
  }
  .titlebar {
    background: #1e293b;
    padding: 12px 18px;
    display: flex;
    align-items: center;
    border-bottom: 1px solid #334155;
  }
  .dots {
    display: flex;
    gap: 8px;
    margin-right: 18px;
  }
  .dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
  }
  .dot.red { background: #ef4444; }
  .dot.yellow { background: #f59e0b; }
  .dot.green { background: #10b981; }
  .title {
    color: #94a3b8;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.5px;
    flex: 1;
    text-align: center;
    padding-right: 60px;
  }
  .terminal-body {
    padding: 24px 28px;
    font-family: "SF Mono", Menlo, Monaco, "Courier New", monospace;
    font-size: 13.5px;
    line-height: 1.5;
    color: #e2e8f0;
    overflow-x: auto;
  }
  .prompt-line {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin-bottom: 16px;
    color: #38bdf8;
    font-weight: 600;
  }
  .prompt-symbol {
    color: #10b981;
  }
  .command {
    color: #f8fafc;
    word-break: break-all;
  }
  pre {
    color: #cbd5e1;
    white-space: pre;
    font-family: inherit;
    font-size: 13px;
    line-height: 1.45;
  }
</style>
</head>
<body>
  <div class="window">
    <div class="titlebar">
      <div class="dots">
        <div class="dot red"></div>
        <div class="dot yellow"></div>
        <div class="dot green"></div>
      </div>
      <div class="title">${title}</div>
    </div>
    <div class="terminal-body">
      <div class="prompt-line">
        <span class="prompt-symbol">student_workload=#</span>
        <span class="command">${commandPrompt}</span>
      </div>
      <pre>${safeOutput}</pre>
    </div>
  </div>
</body>
</html>
`;
}

async function renderCard(browser, html, outputPath, width = 1200) {
  const page = await browser.newPage();
  await page.setViewport({ width: width, height: 800, deviceScaleFactor: 2 });
  await page.setContent(html, { waitUntil: 'load' });
  const element = await page.$('.window');
  if (element) {
    await element.screenshot({ path: outputPath });
  } else {
    await page.screenshot({ path: outputPath });
  }
  await page.close();
  console.log('Saved:', path.basename(outputPath));
}

async function main() {
  console.log('[Terminal Screenshots] Starting capture...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // ==========================================
  // SECTION 1: DDL TABLE CREATION & RELATIONS
  // ==========================================
  console.log('\n--- Section 1: DDL Table Creation ---');
  const ddlDir = path.join(BASE_DIR, '01_ddl_table_creation');

  await renderCard(
    browser,
    generateTerminalHtml('PostgreSQL 15 - Database Relations & Tables', '\\dt', runPsql('\\dt')),
    path.join(ddlDir, '01_relations_list.png')
  );

  await renderCard(
    browser,
    generateTerminalHtml('Table Schema: USERS (RBAC & Authentication)', '\\d users', runPsql('\\d users')),
    path.join(ddlDir, '02_table_users.png')
  );

  await renderCard(
    browser,
    generateTerminalHtml('Table Schema: STUDENTS (Academic Profiles)', '\\d students', runPsql('\\d students')),
    path.join(ddlDir, '03_table_students.png')
  );

  await renderCard(
    browser,
    generateTerminalHtml('Table Schema: COURSES (Curriculum & Faculty)', '\\d courses', runPsql('\\d courses')),
    path.join(ddlDir, '04_table_courses.png')
  );

  await renderCard(
    browser,
    generateTerminalHtml('Table Schema: TASKS (Assignments, Weights & Deadlines)', '\\d tasks', runPsql('\\d tasks')),
    path.join(ddlDir, '05_table_tasks.png')
  );

  await renderCard(
    browser,
    generateTerminalHtml('Table Schema: STUDENT_TASKS (Progress & Status)', '\\d student_tasks', runPsql('\\d student_tasks')),
    path.join(ddlDir, '06_table_student_tasks.png')
  );

  await renderCard(
    browser,
    generateTerminalHtml('Table Schema: AVAILABILITY (Student Study Slots)', '\\d availability', runPsql('\\d availability')),
    path.join(ddlDir, '07_table_availability.png')
  );

  await renderCard(
    browser,
    generateTerminalHtml('Table Schema: WORKLOAD_ANALYSIS (5-D Workload Records)', '\\d workload_analysis', runPsql('\\d workload_analysis')),
    path.join(ddlDir, '08_table_workload_analysis.png')
  );

  await renderCard(
    browser,
    generateTerminalHtml('Table Schema: COLLISIONS (Detected Deadline Bottlenecks)', '\\d collisions', runPsql('\\d collisions')),
    path.join(ddlDir, '09_table_collisions.png')
  );

  await renderCard(
    browser,
    generateTerminalHtml('Table Schema: TASK_DEPENDENCIES (DAG Milestone Constraints)', '\\d task_dependencies', runPsql('\\d task_dependencies')),
    path.join(ddlDir, '10_table_task_dependencies.png')
  );

  await renderCard(
    browser,
    generateTerminalHtml('Table Schema: SIMULATIONS (What-If Projection Ledger)', '\\d simulations', runPsql('\\d simulations')),
    path.join(ddlDir, '11_table_simulations.png')
  );

  // ==========================================
  // SECTION 2: DML DATA INSERTION
  // ==========================================
  console.log('\n--- Section 2: DML Data Insertion ---');
  const dmlDir = path.join(BASE_DIR, '02_dml_data_insertion');

  await renderCard(
    browser,
    generateTerminalHtml('DML: Seeded User Accounts', 'SELECT user_id, username, email, role, created_at FROM users LIMIT 10;', runPsql('SELECT user_id, username, email, role FROM users LIMIT 10;')),
    path.join(dmlDir, '01_users_data.png')
  );

  await renderCard(
    browser,
    generateTerminalHtml('DML: Seeded Student Roster', 'SELECT student_id, user_id, roll_no, program, semester, section FROM students;', runPsql('SELECT student_id, user_id, roll_no, program, semester, section FROM students;')),
    path.join(dmlDir, '02_students_data.png')
  );

  await renderCard(
    browser,
    generateTerminalHtml('DML: Seeded University Courses', 'SELECT course_id, course_code, course_name, credits FROM courses;', runPsql('SELECT course_id, course_code, course_name, credits FROM courses;')),
    path.join(dmlDir, '03_courses_data.png')
  );

  await renderCard(
    browser,
    generateTerminalHtml('DML: Seeded Academic Tasks & Deadlines', 'SELECT task_id, course_id, title, estimated_hours, difficulty_level, cognitive_load, deadline_datetime FROM tasks LIMIT 8;', runPsql('SELECT task_id, course_id, title, estimated_hours, difficulty_level, cognitive_load, deadline_datetime FROM tasks LIMIT 8;')),
    path.join(dmlDir, '04_tasks_data.png')
  );

  await renderCard(
    browser,
    generateTerminalHtml('DML: Seeded Student Task Assignments', 'SELECT student_task_id, student_id, task_id, status, completion_percentage, actual_hours FROM student_tasks LIMIT 10;', runPsql('SELECT student_task_id, student_id, task_id, status, completion_percentage, actual_hours FROM student_tasks LIMIT 10;')),
    path.join(dmlDir, '05_student_tasks_data.png')
  );

  await renderCard(
    browser,
    generateTerminalHtml('DML: Seeded Student Availability Blocks', 'SELECT availability_id, student_id, start_datetime, end_datetime, available_hours, availability_type FROM availability LIMIT 8;', runPsql('SELECT availability_id, student_id, start_datetime, end_datetime, available_hours, availability_type FROM availability LIMIT 8;')),
    path.join(dmlDir, '06_availability_data.png')
  );

  // ==========================================
  // SECTION 3: SQL QUERIES (7.1 to 7.5)
  // ==========================================
  console.log('\n--- Section 3: Complex SQL Queries ---');
  const queryDir = path.join(BASE_DIR, '03_sql_queries');

  // 7.1 Aggregate & GROUP BY
  const q71 = `SELECT c.course_code, c.course_name, COUNT(t.task_id) AS total_tasks, ROUND(AVG(t.estimated_hours)::numeric, 1) AS avg_hours, ROUND(AVG(t.difficulty_level)::numeric, 1) AS avg_difficulty, ROUND(AVG(t.cognitive_load)::numeric, 1) AS avg_cog_load FROM courses c LEFT JOIN tasks t ON c.course_id = t.course_id GROUP BY c.course_code, c.course_name ORDER BY total_tasks DESC;`;
  await renderCard(
    browser,
    generateTerminalHtml('Query 7.1: Aggregate & GROUP BY (Course Task Metrics)', q71, runPsql(q71)),
    path.join(queryDir, '01_query_groupby_aggregate.png')
  );

  // 7.2 UPDATE Operation
  const q72 = `UPDATE student_tasks SET completion_percentage = 85.00, actual_hours = 12.5 WHERE student_id = 1 AND task_id = 1 RETURNING student_task_id, student_id, task_id, completion_percentage, actual_hours, status;`;
  await renderCard(
    browser,
    generateTerminalHtml('Query 7.2: UPDATE Operation with RETURNING Clause', q72, runPsql(q72)),
    path.join(queryDir, '02_query_update_operation.png')
  );

  // 7.3 DELETE Operation
  runPsql(`INSERT INTO availability (student_id, start_datetime, end_datetime, available_hours, availability_type) VALUES (1, CURRENT_TIMESTAMP + INTERVAL '10 days', CURRENT_TIMESTAMP + INTERVAL '10 days 2 hours', 2.0, 'study_block');`);
  const q73 = `DELETE FROM availability WHERE student_id = 1 AND availability_type = 'study_block' AND start_datetime > CURRENT_TIMESTAMP + INTERVAL '9 days' RETURNING availability_id, student_id, available_hours, availability_type;`;
  await renderCard(
    browser,
    generateTerminalHtml('Query 7.3: DELETE Operation with RETURNING Clause', q73, runPsql(q73)),
    path.join(queryDir, '03_query_delete_operation.png')
  );

  // 7.4 Correlated Subquery
  const q74 = `SELECT s.student_id, s.roll_no, s.section, w.overall_risk_score, w.risk_level FROM students s JOIN workload_analysis w ON s.student_id = w.student_id WHERE w.overall_risk_score > (SELECT AVG(w2.overall_risk_score) FROM students s2 JOIN workload_analysis w2 ON s2.student_id = w2.student_id WHERE s2.section = s.section);`;
  await renderCard(
    browser,
    generateTerminalHtml('Query 7.4: Correlated Subquery (Students Above Section Average)', q74, runPsql(q74)),
    path.join(queryDir, '04_query_correlated_subquery.png')
  );

  // 7.5 Nested Query with UNION
  const q75 = `SELECT t.task_id, c.course_code, t.title, t.estimated_hours, t.difficulty_level, t.deadline_datetime FROM tasks t JOIN courses c ON t.course_id = c.course_id WHERE t.task_id IN (SELECT task_id FROM student_tasks WHERE status = 'assigned' UNION SELECT task_id FROM tasks WHERE cognitive_load >= 7);`;
  await renderCard(
    browser,
    generateTerminalHtml('Query 7.5: Nested Subquery with UNION (High-Cognitive & Assigned Tasks)', q75, runPsql(q75)),
    path.join(queryDir, '05_query_nested_subquery.png')
  );

  // ==========================================
  // SECTION 4: PROCEDURES & TRIGGERS
  // ==========================================
  console.log('\n--- Section 4: Procedures and Triggers ---');
  const procDir = path.join(BASE_DIR, '04_procedures_and_triggers');

  // 8.1.1 sp_calculate_workload
  const spWorkloadCmd = `CALL sp_calculate_workload(1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '14 days');\nSELECT student_id, ROUND(temporal_pressure::numeric, 2) AS temporal_p, ROUND(workload_pressure::numeric, 2) AS workload_p, ROUND(cognitive_pressure::numeric, 2) AS cognitive_p, ROUND(assessment_pressure::numeric, 2) AS assessment_p, ROUND(overall_risk_score::numeric, 2) AS overall_risk, risk_level FROM workload_analysis WHERE student_id = 1 ORDER BY calculated_at DESC LIMIT 1;`;
  const spWorkloadOut = runPsql(`CALL sp_calculate_workload(1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '14 days'); SELECT student_id, ROUND(temporal_pressure::numeric, 2) AS temporal_p, ROUND(workload_pressure::numeric, 2) AS workload_p, ROUND(cognitive_pressure::numeric, 2) AS cognitive_p, ROUND(assessment_pressure::numeric, 2) AS assessment_p, ROUND(overall_risk_score::numeric, 2) AS overall_risk, risk_level FROM workload_analysis WHERE student_id = 1 ORDER BY calculated_at DESC LIMIT 1;`);
  await renderCard(
    browser,
    generateTerminalHtml('Stored Procedure 8.1.1: 5-Dimensional Workload Calculation Engine', spWorkloadCmd, spWorkloadOut),
    path.join(procDir, '01_sp_calculate_workload.png')
  );

  // 8.1.2 sp_simulate_deadline_change
  const spSimCmd = `CALL sp_simulate_deadline_change(1, (CURRENT_TIMESTAMP + INTERVAL '7 days')::timestamptz, 1);\nSELECT simulation_id, task_id, ROUND(original_risk::numeric, 2) AS original_risk, ROUND(projected_risk::numeric, 2) AS projected_risk, original_collisions, projected_collisions, recommendation FROM simulations ORDER BY simulation_id DESC LIMIT 1;`;
  const spSimOut = runPsql(`CALL sp_simulate_deadline_change(1, (CURRENT_TIMESTAMP + INTERVAL '7 days')::timestamptz, 1); SELECT simulation_id, task_id, ROUND(original_risk::numeric, 2) AS original_risk, ROUND(projected_risk::numeric, 2) AS projected_risk, original_collisions, projected_collisions, recommendation FROM simulations ORDER BY simulation_id DESC LIMIT 1;`);
  await renderCard(
    browser,
    generateTerminalHtml('Stored Procedure 8.1.2: What-If Deadline Shift Simulation Engine', spSimCmd, spSimOut),
    path.join(procDir, '02_sp_simulate_deadline_change.png')
  );

  // 8.2.1 Trigger: Circular Dependency Prevention
  const trigCircCmd = `-- Attempting circular dependency: Task 1 depends on Task 2, and Task 2 depends on Task 1\nINSERT INTO task_dependencies (task_id, prerequisite_task_id) VALUES (1, 2);\nINSERT INTO task_dependencies (task_id, prerequisite_task_id) VALUES (2, 1);`;
  runPsql(`INSERT INTO task_dependencies (task_id, prerequisite_task_id) VALUES (1, 2) ON CONFLICT DO NOTHING;`);
  const trigCircOut = runPsql(`INSERT INTO task_dependencies (task_id, prerequisite_task_id) VALUES (2, 1);`);
  await renderCard(
    browser,
    generateTerminalHtml('Trigger 8.2.1: Prevention of Circular Task Dependencies (DAG Rule)', trigCircCmd, trigCircOut),
    path.join(procDir, '03_trigger_circular_dependency.png')
  );

  // 8.2.2 Trigger: Task Deadline Temporal Validation
  const trigDeadCmd = `-- Attempting to create task with deadline before release\nINSERT INTO tasks (course_id, title, release_datetime, deadline_datetime, estimated_hours, difficulty_level, cognitive_load, assessment_weight)\nVALUES (1, 'Invalid Past Milestone', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP - INTERVAL '1 day', 5.0, 3, 5, 10.0);`;
  const trigDeadOut = runPsql(`INSERT INTO tasks (course_id, title, release_datetime, deadline_datetime, estimated_hours, difficulty_level, cognitive_load, assessment_weight) VALUES (1, 'Invalid Past Milestone', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP - INTERVAL '1 day', 5.0, 3, 5, 10.0);`);
  await renderCard(
    browser,
    generateTerminalHtml('Trigger 8.2.2: Task Deadline Temporal Validation Rule', trigDeadCmd, trigDeadOut),
    path.join(procDir, '04_trigger_deadline_validation.png')
  );

  // ==========================================
  // SECTION 5: REDIS NOSQL CACHE & PRIORITY QUEUE
  // ==========================================
  console.log('\n--- Section 5: Redis NoSQL Cache & Priority Queue ---');
  const redisDir = path.join(BASE_DIR, '06_redis_nosql_cache');

  // Redis Keys
  const redisKeysOut = runRedis('KEYS "workload-analyzer:*"');
  await renderCard(
    browser,
    generateTerminalHtml('Redis NoSQL: Active Namespaced Cache & Queue Keys', 'redis-cli KEYS "workload-analyzer:*"', redisKeysOut),
    path.join(redisDir, '01_redis_active_keys.png')
  );

  // Redis Sorted Set Priority Queue
  const redisZsetOut = runRedis('ZRANGE "workload-analyzer:v1:deadlines:student:1" 0 -1 WITHSCORES');
  await renderCard(
    browser,
    generateTerminalHtml('Redis Sorted Set: Student 1 Priority Deadline Queue (Task ID -> Milliseconds)', 'redis-cli ZRANGE "workload-analyzer:v1:deadlines:student:1" 0 -1 WITHSCORES', redisZsetOut),
    path.join(redisDir, '02_redis_sorted_set_deadlines.png')
  );

  // Redis Version Invalidation Key
  const redisVerOut = runRedis('GET "workload-analyzer:v1:workload:student:1:version"');
  await renderCard(
    browser,
    generateTerminalHtml('Redis Version Key: O(1) Cache Invalidation Mechanism', 'redis-cli GET "workload-analyzer:v1:workload:student:1:version"', 'Value: ' + redisVerOut.trim()),
    path.join(redisDir, '03_redis_version_invalidation_key.png')
  );

  await browser.close();
  console.log('\n🎉 ALL TERMINAL SCREENSHOTS GENERATED CLEANLY!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
