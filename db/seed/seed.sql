-- =====================================================================
-- seed.sql: Realistic Seed Data for Student Workload & Deadline Collision Analyzer
-- All users share the default password: password123
-- Bcrypt Hash: $2b$10$4d1csmYBj5Ff7XCmXA9XVuYtlCN6XBLT2KeoucBRJfxB5hOt1XWaK
-- Relative dates ensure the seed data stays fresh and never expires.
-- =====================================================================

TRUNCATE TABLE SIMULATIONS, COLLISIONS, WORKLOAD_ANALYSIS, STUDENT_TASKS, TASK_DEPENDENCIES, AVAILABILITY, TASKS, COURSES, STUDENTS, USERS CASCADE;

-- ---------------------------------------------------------------------
-- 1. USERS (2 Faculty, 8 Students, 1 Admin)
-- ---------------------------------------------------------------------
INSERT INTO USERS (user_id, username, email, password_hash, role, created_at) VALUES
-- Faculty
(1, 'dr_sarah', 'sarah@university.edu', '$2b$10$4d1csmYBj5Ff7XCmXA9XVuYtlCN6XBLT2KeoucBRJfxB5hOt1XWaK', 'faculty', CURRENT_TIMESTAMP),
(2, 'prof_raj', 'raj@university.edu', '$2b$10$4d1csmYBj5Ff7XCmXA9XVuYtlCN6XBLT2KeoucBRJfxB5hOt1XWaK', 'faculty', CURRENT_TIMESTAMP),

-- Students (Semester 4)
(3, 'alice_wong', 'alice@university.edu', '$2b$10$4d1csmYBj5Ff7XCmXA9XVuYtlCN6XBLT2KeoucBRJfxB5hOt1XWaK', 'student', CURRENT_TIMESTAMP),
(4, 'bob_martinez', 'bob@university.edu', '$2b$10$4d1csmYBj5Ff7XCmXA9XVuYtlCN6XBLT2KeoucBRJfxB5hOt1XWaK', 'student', CURRENT_TIMESTAMP),
(5, 'charlie_kim', 'charlie@university.edu', '$2b$10$4d1csmYBj5Ff7XCmXA9XVuYtlCN6XBLT2KeoucBRJfxB5hOt1XWaK', 'student', CURRENT_TIMESTAMP),
(6, 'diana_prince', 'diana@university.edu', '$2b$10$4d1csmYBj5Ff7XCmXA9XVuYtlCN6XBLT2KeoucBRJfxB5hOt1XWaK', 'student', CURRENT_TIMESTAMP),

-- Students (Semester 6)
(7, 'ethan_hunt', 'ethan@university.edu', '$2b$10$4d1csmYBj5Ff7XCmXA9XVuYtlCN6XBLT2KeoucBRJfxB5hOt1XWaK', 'student', CURRENT_TIMESTAMP),
(8, 'fiona_gallagher', 'fiona@university.edu', '$2b$10$4d1csmYBj5Ff7XCmXA9XVuYtlCN6XBLT2KeoucBRJfxB5hOt1XWaK', 'student', CURRENT_TIMESTAMP),
(9, 'george_clark', 'george@university.edu', '$2b$10$4d1csmYBj5Ff7XCmXA9XVuYtlCN6XBLT2KeoucBRJfxB5hOt1XWaK', 'student', CURRENT_TIMESTAMP),
(10, 'hannah_abbott', 'hannah@university.edu', '$2b$10$4d1csmYBj5Ff7XCmXA9XVuYtlCN6XBLT2KeoucBRJfxB5hOt1XWaK', 'student', CURRENT_TIMESTAMP),

-- Admin
(11, 'admin_system', 'admin@university.edu', '$2b$10$4d1csmYBj5Ff7XCmXA9XVuYtlCN6XBLT2KeoucBRJfxB5hOt1XWaK', 'admin', CURRENT_TIMESTAMP);


-- ---------------------------------------------------------------------
-- 2. STUDENTS PROFILE (8 Students)
-- Semester 4 and Semester 6 cohorts
-- ---------------------------------------------------------------------
INSERT INTO STUDENTS (student_id, user_id, roll_no, program, semester, section, advisor_id) VALUES
(1, 3, 'CS2024-001', 'B.Tech Computer Science', 4, 'A', 1),
(2, 4, 'CS2024-002', 'B.Tech Computer Science', 4, 'A', 1),
(3, 5, 'CS2024-003', 'B.Tech Computer Science', 4, 'B', 2),
(4, 6, 'CS2024-004', 'B.Tech Computer Science', 4, 'B', 2),
(5, 7, 'CS2022-005', 'B.Tech Computer Science', 6, 'A', 1),
(6, 8, 'CS2022-006', 'B.Tech Computer Science', 6, 'A', 1),
(7, 9, 'CS2022-007', 'B.Tech Computer Science', 6, 'B', 2),
(8, 10, 'CS2022-008', 'B.Tech Computer Science', 6, 'B', 2);


-- ---------------------------------------------------------------------
-- 3. COURSES (4 Courses)
-- Semester 4: CS401 (DBMS), CS402 (OS)
-- Semester 6: CS601 (Cloud), CS602 (ML)
-- ---------------------------------------------------------------------
INSERT INTO COURSES (course_id, course_code, course_name, faculty_id, credits, semester) VALUES
(1, 'CS401', 'Database Management Systems', 1, 4, 4),
(2, 'CS402', 'Operating Systems & Concurrency', 2, 4, 4),
(3, 'CS601', 'Distributed Cloud Architecture', 1, 3, 6),
(4, 'CS602', 'Machine Learning & Neural Systems', 2, 4, 6);


-- ---------------------------------------------------------------------
-- 4. TASKS (12 Tasks across courses with relative dates)
-- Relative windows:
-- CS401 & CS402 tasks intentionally create:
--   a) DEADLINE_CLUSTER (3 tasks clustered within 48h around Day 4-5)
--   b) ASSESSMENT_OVERLAP (2 tasks with 25% + 20% due within 24h around Day 9)
--   c) OVERLOAD (tasks sum to 38+ hours vs limited availability)
-- ---------------------------------------------------------------------
INSERT INTO TASKS (
    task_id, course_id, title, description, task_type, 
    release_datetime, deadline_datetime, estimated_hours, 
    difficulty_level, cognitive_load, assessment_weight, 
    is_team_task, status, created_at
) VALUES
-- Semester 4: CS401 (DBMS) Tasks
(1, 1, 'Milestone 1: E-R Schema Design', 'Design normalized 3NF database schema with primary and foreign key constraints.', 'assignment', 
 CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP + INTERVAL '3 days', 6.00, 2, 5, 10.00, FALSE, 'active', CURRENT_TIMESTAMP),

(2, 1, 'Milestone 2: Complex SQL & Views', 'Write nested SQL queries, aggregate views, and optimize with composite indexes.', 'assignment', 
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '4 days', 8.00, 3, 6, 15.00, FALSE, 'active', CURRENT_TIMESTAMP),

(3, 1, 'Midterm Lab Exam: Query Optimization', 'Timed practical lab on query execution plans, indexing strategies, and locking.', 'exam', 
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '5 days', 5.00, 4, 8, 20.00, FALSE, 'active', CURRENT_TIMESTAMP),

(4, 1, 'Term Project: Full-Stack DBMS App', 'Production grade web application connected to normalized MySQL database with stored procedures.', 'project', 
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '14 days', 22.00, 5, 9, 30.00, TRUE, 'active', CURRENT_TIMESTAMP),

-- Semester 4: CS402 (OS) Tasks
(5, 2, 'Kernel Threading Lab', 'Implement POSIX thread synchronization using mutexes, condition variables, and semaphores.', 'lab', 
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '4 days', 10.00, 4, 8, 15.00, FALSE, 'active', CURRENT_TIMESTAMP),

(6, 2, 'Virtual Memory Simulator', 'Implement LRU and Clock page replacement algorithms in C++.', 'assignment', 
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '5 days', 9.00, 4, 7, 15.00, FALSE, 'active', CURRENT_TIMESTAMP),

(7, 2, 'OS Midterm Assessment', 'Comprehensive theoretical assessment on scheduling, deadlocks, and memory management.', 'exam', 
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '9 days', 6.00, 4, 9, 25.00, FALSE, 'active', CURRENT_TIMESTAMP),

(8, 2, 'Distributed File System Project', 'Build a replicated fault-tolerant user-space file system (FUSE).', 'project', 
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '18 days', 20.00, 5, 10, 25.00, TRUE, 'active', CURRENT_TIMESTAMP),

-- Semester 6: CS601 (Cloud) Tasks
(9, 3, 'Containerized Microservices Deploy', 'Dockerize REST microservices and deploy via Kubernetes with Ingress controllers.', 'assignment', 
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '6 days', 8.00, 3, 6, 15.00, FALSE, 'active', CURRENT_TIMESTAMP),

(10, 3, 'Cloud Native Architecture Report', 'Technical whitepaper on CAP theorem trade-offs in globally distributed databases.', 'report', 
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '12 days', 7.00, 3, 5, 15.00, FALSE, 'active', CURRENT_TIMESTAMP),

-- Semester 6: CS602 (ML) Tasks
(11, 4, 'CNN Image Classifier Pipeline', 'Build and fine-tune convolutional neural network using PyTorch on CIFAR-10.', 'assignment', 
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '7 days', 12.00, 4, 8, 20.00, FALSE, 'active', CURRENT_TIMESTAMP),

(12, 4, 'Transformer Model Implementation', 'Implement multi-head self-attention mechanism from scratch.', 'project', 
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '16 days', 24.00, 5, 10, 35.00, TRUE, 'active', CURRENT_TIMESTAMP);


-- ---------------------------------------------------------------------
-- 5. TASK DEPENDENCIES
-- E.g. Milestone 2 requires Milestone 1; Term Project requires Milestone 2;
-- VM Simulator requires Kernel Threading Lab; Transformer requires CNN Pipeline.
-- ---------------------------------------------------------------------
INSERT INTO TASK_DEPENDENCIES (task_id, prerequisite_task_id, dependency_type) VALUES
(2, 1, 'hard_prerequisite'),
(4, 2, 'hard_prerequisite'),
(6, 5, 'hard_prerequisite'),
(12, 11, 'recommended');


-- ---------------------------------------------------------------------
-- 6. AVAILABILITY
-- Deliberately gives Alice (student 1) and Bob (student 2) tight availability
-- (e.g. 16 hours over the next 14 days) while tasks demand 38+ hours -> triggers OVERLOAD.
-- Gives other students standard study blocks (30-40 hours).
-- ---------------------------------------------------------------------
INSERT INTO AVAILABILITY (student_id, start_datetime, end_datetime, available_hours, availability_type) VALUES
-- Student 1 (Alice): Constrained schedule (part-time internship + lab duties)
(1, CURRENT_TIMESTAMP + INTERVAL '1 days', CURRENT_TIMESTAMP + INTERVAL '1 days' + INTERVAL '4 hours', 4.00, 'study_block'),
(1, CURRENT_TIMESTAMP + INTERVAL '3 days', CURRENT_TIMESTAMP + INTERVAL '3 days' + INTERVAL '4 hours', 4.00, 'study_block'),
(1, CURRENT_TIMESTAMP + INTERVAL '5 days', CURRENT_TIMESTAMP + INTERVAL '5 days' + INTERVAL '4 hours', 4.00, 'study_block'),
(1, CURRENT_TIMESTAMP + INTERVAL '8 days', CURRENT_TIMESTAMP + INTERVAL '8 days' + INTERVAL '4 hours', 4.00, 'study_block'),

-- Student 2 (Bob): Constrained schedule (sports commitment)
(2, CURRENT_TIMESTAMP + INTERVAL '2 days', CURRENT_TIMESTAMP + INTERVAL '2 days' + INTERVAL '3 hours', 3.00, 'study_block'),
(2, CURRENT_TIMESTAMP + INTERVAL '4 days', CURRENT_TIMESTAMP + INTERVAL '4 days' + INTERVAL '4 hours', 4.00, 'study_block'),
(2, CURRENT_TIMESTAMP + INTERVAL '6 days', CURRENT_TIMESTAMP + INTERVAL '6 days' + INTERVAL '4 hours', 4.00, 'study_block'),
(2, CURRENT_TIMESTAMP + INTERVAL '9 days', CURRENT_TIMESTAMP + INTERVAL '9 days' + INTERVAL '4 hours', 4.00, 'study_block'),

-- Student 3 (Charlie): Moderate availability
(3, CURRENT_TIMESTAMP + INTERVAL '1 days', CURRENT_TIMESTAMP + INTERVAL '1 days' + INTERVAL '6 hours', 6.00, 'study_block'),
(3, CURRENT_TIMESTAMP + INTERVAL '3 days', CURRENT_TIMESTAMP + INTERVAL '3 days' + INTERVAL '6 hours', 6.00, 'study_block'),
(3, CURRENT_TIMESTAMP + INTERVAL '6 days', CURRENT_TIMESTAMP + INTERVAL '6 days' + INTERVAL '6 hours', 6.00, 'study_block'),
(3, CURRENT_TIMESTAMP + INTERVAL '8 days', CURRENT_TIMESTAMP + INTERVAL '8 days' + INTERVAL '6 hours', 6.00, 'study_block'),

-- Student 4 (Diana): Ample availability
(4, CURRENT_TIMESTAMP + INTERVAL '1 days', CURRENT_TIMESTAMP + INTERVAL '1 days' + INTERVAL '8 hours', 8.00, 'study_block'),
(4, CURRENT_TIMESTAMP + INTERVAL '4 days', CURRENT_TIMESTAMP + INTERVAL '4 days' + INTERVAL '8 hours', 8.00, 'study_block'),
(4, CURRENT_TIMESTAMP + INTERVAL '7 days', CURRENT_TIMESTAMP + INTERVAL '7 days' + INTERVAL '8 hours', 8.00, 'study_block'),
(4, CURRENT_TIMESTAMP + INTERVAL '10 days', CURRENT_TIMESTAMP + INTERVAL '10 days' + INTERVAL '8 hours', 8.00, 'study_block'),

-- Students 5-8 (Semester 6): Regular availability
(5, CURRENT_TIMESTAMP + INTERVAL '2 days', CURRENT_TIMESTAMP + INTERVAL '2 days' + INTERVAL '6 hours', 6.00, 'study_block'),
(5, CURRENT_TIMESTAMP + INTERVAL '5 days', CURRENT_TIMESTAMP + INTERVAL '5 days' + INTERVAL '6 hours', 6.00, 'study_block'),
(6, CURRENT_TIMESTAMP + INTERVAL '3 days', CURRENT_TIMESTAMP + INTERVAL '3 days' + INTERVAL '8 hours', 8.00, 'study_block'),
(7, CURRENT_TIMESTAMP + INTERVAL '2 days', CURRENT_TIMESTAMP + INTERVAL '2 days' + INTERVAL '5 hours', 5.00, 'study_block'),
(8, CURRENT_TIMESTAMP + INTERVAL '4 days', CURRENT_TIMESTAMP + INTERVAL '4 days' + INTERVAL '6 hours', 6.00, 'study_block');


-- ---------------------------------------------------------------------
-- 7. STUDENT_TASKS (Enrollment mapping by semester)
-- Semester 4 students (1, 2, 3, 4) get tasks 1, 2, 3, 4 (CS401) and 5, 6, 7, 8 (CS402).
-- Semester 6 students (5, 6, 7, 8) get tasks 9, 10 (CS601) and 11, 12 (CS602).
-- We set diverse progress states to make the dashboard dynamic.
-- ---------------------------------------------------------------------

-- Semester 4 enrollments
INSERT INTO STUDENT_TASKS (student_id, task_id, assigned_at, status, actual_hours, completion_percentage, submitted_at, score) VALUES
-- Student 1 (Alice)
(1, 1, CURRENT_TIMESTAMP - INTERVAL '2 days', 'completed', 6.00, 100.00, CURRENT_TIMESTAMP - INTERVAL '1 days', 95.00),
(1, 2, CURRENT_TIMESTAMP, 'in_progress', 3.00, 40.00, NULL, NULL),
(1, 3, CURRENT_TIMESTAMP, 'assigned', 0.00, 0.00, NULL, NULL),
(1, 4, CURRENT_TIMESTAMP, 'assigned', 0.00, 0.00, NULL, NULL),
(1, 5, CURRENT_TIMESTAMP, 'in_progress', 4.00, 30.00, NULL, NULL),
(1, 6, CURRENT_TIMESTAMP, 'assigned', 0.00, 0.00, NULL, NULL),
(1, 7, CURRENT_TIMESTAMP, 'assigned', 0.00, 0.00, NULL, NULL),
(1, 8, CURRENT_TIMESTAMP, 'assigned', 0.00, 0.00, NULL, NULL),

-- Student 2 (Bob)
(2, 1, CURRENT_TIMESTAMP - INTERVAL '2 days', 'in_progress', 2.00, 30.00, NULL, NULL),
(2, 2, CURRENT_TIMESTAMP, 'assigned', 0.00, 0.00, NULL, NULL),
(2, 3, CURRENT_TIMESTAMP, 'assigned', 0.00, 0.00, NULL, NULL),
(2, 4, CURRENT_TIMESTAMP, 'assigned', 0.00, 0.00, NULL, NULL),
(2, 5, CURRENT_TIMESTAMP, 'assigned', 0.00, 0.00, NULL, NULL),
(2, 6, CURRENT_TIMESTAMP, 'assigned', 0.00, 0.00, NULL, NULL),
(2, 7, CURRENT_TIMESTAMP, 'assigned', 0.00, 0.00, NULL, NULL),
(2, 8, CURRENT_TIMESTAMP, 'assigned', 0.00, 0.00, NULL, NULL),

-- Student 3 (Charlie)
(3, 1, CURRENT_TIMESTAMP - INTERVAL '2 days', 'completed', 5.50, 100.00, CURRENT_TIMESTAMP - INTERVAL '1 days', 90.00),
(3, 2, CURRENT_TIMESTAMP, 'in_progress', 4.00, 50.00, NULL, NULL),
(3, 3, CURRENT_TIMESTAMP, 'assigned', 0.00, 0.00, NULL, NULL),
(3, 4, CURRENT_TIMESTAMP, 'assigned', 0.00, 0.00, NULL, NULL),
(3, 5, CURRENT_TIMESTAMP, 'completed', 9.00, 100.00, CURRENT_TIMESTAMP - INTERVAL '1 hour', 88.00),
(3, 6, CURRENT_TIMESTAMP, 'in_progress', 2.00, 25.00, NULL, NULL),
(3, 7, CURRENT_TIMESTAMP, 'assigned', 0.00, 0.00, NULL, NULL),
(3, 8, CURRENT_TIMESTAMP, 'assigned', 0.00, 0.00, NULL, NULL),

-- Student 4 (Diana)
(4, 1, CURRENT_TIMESTAMP - INTERVAL '2 days', 'completed', 5.00, 100.00, CURRENT_TIMESTAMP - INTERVAL '1 days', 98.00),
(4, 2, CURRENT_TIMESTAMP, 'completed', 7.50, 100.00, CURRENT_TIMESTAMP, 94.00),
(4, 3, CURRENT_TIMESTAMP, 'in_progress', 2.00, 40.00, NULL, NULL),
(4, 4, CURRENT_TIMESTAMP, 'in_progress', 5.00, 20.00, NULL, NULL),
(4, 5, CURRENT_TIMESTAMP, 'completed', 8.50, 100.00, CURRENT_TIMESTAMP - INTERVAL '2 hours', 92.00),
(4, 6, CURRENT_TIMESTAMP, 'in_progress', 4.00, 50.00, NULL, NULL),
(4, 7, CURRENT_TIMESTAMP, 'assigned', 0.00, 0.00, NULL, NULL),
(4, 8, CURRENT_TIMESTAMP, 'assigned', 0.00, 0.00, NULL, NULL),

-- Semester 6 enrollments
-- Student 5 (Ethan)
(5, 9, CURRENT_TIMESTAMP, 'in_progress', 3.00, 40.00, NULL, NULL),
(5, 10, CURRENT_TIMESTAMP, 'assigned', 0.00, 0.00, NULL, NULL),
(5, 11, CURRENT_TIMESTAMP, 'in_progress', 4.00, 30.00, NULL, NULL),
(5, 12, CURRENT_TIMESTAMP, 'assigned', 0.00, 0.00, NULL, NULL),

-- Student 6 (Fiona)
(6, 9, CURRENT_TIMESTAMP, 'completed', 7.00, 100.00, CURRENT_TIMESTAMP, 91.00),
(6, 10, CURRENT_TIMESTAMP, 'assigned', 0.00, 0.00, NULL, NULL),
(6, 11, CURRENT_TIMESTAMP, 'in_progress', 6.00, 50.00, NULL, NULL),
(6, 12, CURRENT_TIMESTAMP, 'assigned', 0.00, 0.00, NULL, NULL),

-- Student 7 (George)
(7, 9, CURRENT_TIMESTAMP, 'assigned', 0.00, 0.00, NULL, NULL),
(7, 10, CURRENT_TIMESTAMP, 'assigned', 0.00, 0.00, NULL, NULL),
(7, 11, CURRENT_TIMESTAMP, 'assigned', 0.00, 0.00, NULL, NULL),
(7, 12, CURRENT_TIMESTAMP, 'assigned', 0.00, 0.00, NULL, NULL),

-- Student 8 (Hannah)
(8, 9, CURRENT_TIMESTAMP, 'completed', 8.00, 100.00, CURRENT_TIMESTAMP, 96.00),
(8, 10, CURRENT_TIMESTAMP, 'in_progress', 2.00, 30.00, NULL, NULL),
(8, 11, CURRENT_TIMESTAMP, 'completed', 11.00, 100.00, CURRENT_TIMESTAMP, 90.00),
(8, 12, CURRENT_TIMESTAMP, 'in_progress', 4.00, 15.00, NULL, NULL);


-- ---------------------------------------------------------------------

-- Reset serial sequences after explicit ID inserts
SELECT setval(pg_get_serial_sequence('users', 'user_id'), COALESCE(MAX(user_id), 1)) FROM USERS;
SELECT setval(pg_get_serial_sequence('students', 'student_id'), COALESCE(MAX(student_id), 1)) FROM STUDENTS;
SELECT setval(pg_get_serial_sequence('courses', 'course_id'), COALESCE(MAX(course_id), 1)) FROM COURSES;
SELECT setval(pg_get_serial_sequence('tasks', 'task_id'), COALESCE(MAX(task_id), 1)) FROM TASKS;
SELECT setval(pg_get_serial_sequence('availability', 'availability_id'), COALESCE(MAX(availability_id), 1)) FROM AVAILABILITY;
SELECT setval(pg_get_serial_sequence('student_tasks', 'student_task_id'), COALESCE(MAX(student_task_id), 1)) FROM STUDENT_TASKS;
SELECT setval(pg_get_serial_sequence('task_dependencies', 'dependency_id'), COALESCE(MAX(dependency_id), 1)) FROM TASK_DEPENDENCIES;

-- 8. TRIGGER FULL WORKLOAD & COLLISION ANALYSIS FOR ALL 8 STUDENTS
-- ---------------------------------------------------------------------
CALL sp_calculate_workload(1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '14 days');
CALL sp_detect_collisions(1);

CALL sp_calculate_workload(2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '14 days');
CALL sp_detect_collisions(2);

CALL sp_calculate_workload(3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '14 days');
CALL sp_detect_collisions(3);

CALL sp_calculate_workload(4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '14 days');
CALL sp_detect_collisions(4);

CALL sp_calculate_workload(5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '14 days');
CALL sp_detect_collisions(5);

CALL sp_calculate_workload(6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '14 days');
CALL sp_detect_collisions(6);

CALL sp_calculate_workload(7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '14 days');
CALL sp_detect_collisions(7);

CALL sp_calculate_workload(8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '14 days');
CALL sp_detect_collisions(8);

-- ---------------------------------------------------------------------
-- 9. PRE-RUN AN INITIAL FACULTY SIMULATION (for history)
-- ---------------------------------------------------------------------
CALL sp_simulate_deadline_change(3, CURRENT_TIMESTAMP + INTERVAL '11 days', 1);

