-- =====================================================================
-- 001_schema.sql: PostgreSQL Database Schema Definition
-- =====================================================================

-- Drop existing tables in reverse dependency order
DROP TABLE IF EXISTS SIMULATIONS CASCADE;
DROP TABLE IF EXISTS TASK_DEPENDENCIES CASCADE;
DROP TABLE IF EXISTS COLLISIONS CASCADE;
DROP TABLE IF EXISTS STUDENT_TASKS CASCADE;
DROP TABLE IF EXISTS WORKLOAD_ANALYSIS CASCADE;
DROP TABLE IF EXISTS AVAILABILITY CASCADE;
DROP TABLE IF EXISTS TASKS CASCADE;
DROP TABLE IF EXISTS COURSES CASCADE;
DROP TABLE IF EXISTS STUDENTS CASCADE;
DROP TABLE IF EXISTS USERS CASCADE;

CREATE TABLE USERS (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_users_role CHECK (role IN ('student', 'faculty', 'admin'))
);

CREATE TABLE STUDENTS (
    student_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    roll_no VARCHAR(50) NOT NULL UNIQUE,
    program VARCHAR(100),
    semester INT,
    section VARCHAR(20),
    advisor_id INT,
    CONSTRAINT fk_students_user FOREIGN KEY (user_id) REFERENCES USERS(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_students_advisor FOREIGN KEY (advisor_id) REFERENCES USERS(user_id) ON DELETE SET NULL,
    CONSTRAINT chk_students_semester CHECK (semester BETWEEN 1 AND 8)
);

CREATE TABLE COURSES (
    course_id SERIAL PRIMARY KEY,
    course_code VARCHAR(50) NOT NULL UNIQUE,
    course_name VARCHAR(150) NOT NULL,
    faculty_id INT,
    credits INT,
    semester INT,
    CONSTRAINT fk_courses_faculty FOREIGN KEY (faculty_id) REFERENCES USERS(user_id) ON DELETE SET NULL,
    CONSTRAINT chk_courses_credits CHECK (credits > 0 AND credits <= 10)
);

CREATE TABLE TASKS (
    task_id SERIAL PRIMARY KEY,
    course_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    task_type VARCHAR(50),
    release_datetime TIMESTAMPTZ,
    deadline_datetime TIMESTAMPTZ NOT NULL,
    estimated_hours DECIMAL(7,2),
    difficulty_level INT,
    cognitive_load INT,
    assessment_weight DECIMAL(5,2),
    is_team_task BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tasks_course FOREIGN KEY (course_id) REFERENCES COURSES(course_id) ON DELETE CASCADE,
    CONSTRAINT chk_tasks_difficulty CHECK (difficulty_level BETWEEN 1 AND 5),
    CONSTRAINT chk_tasks_cognitive CHECK (cognitive_load BETWEEN 1 AND 10),
    CONSTRAINT chk_tasks_weight CHECK (assessment_weight BETWEEN 0.00 AND 100.00)
);

CREATE TABLE AVAILABILITY (
    availability_id SERIAL PRIMARY KEY,
    student_id INT NOT NULL,
    start_datetime TIMESTAMPTZ NOT NULL,
    end_datetime TIMESTAMPTZ NOT NULL,
    available_hours DECIMAL(5,2),
    availability_type VARCHAR(50) DEFAULT 'study_block',
    CONSTRAINT fk_availability_student FOREIGN KEY (student_id) REFERENCES STUDENTS(student_id) ON DELETE CASCADE,
    CONSTRAINT chk_availability_dates CHECK (end_datetime > start_datetime)
);

CREATE TABLE WORKLOAD_ANALYSIS (
    analysis_id SERIAL PRIMARY KEY,
    student_id INT NOT NULL,
    start_datetime TIMESTAMPTZ,
    end_datetime TIMESTAMPTZ,
    total_estimated_hours DECIMAL(7,2),
    available_hours DECIMAL(7,2),
    temporal_pressure DECIMAL(5,2),
    workload_pressure DECIMAL(5,2),
    cognitive_pressure DECIMAL(5,2),
    assessment_pressure DECIMAL(5,2),
    dependency_pressure DECIMAL(5,2),
    overall_risk_score DECIMAL(5,2),
    risk_level VARCHAR(30),
    calculated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_workload_student FOREIGN KEY (student_id) REFERENCES STUDENTS(student_id) ON DELETE CASCADE,
    CONSTRAINT chk_workload_risk_level CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'))
);

CREATE TABLE STUDENT_TASKS (
    student_task_id SERIAL PRIMARY KEY,
    student_id INT NOT NULL,
    task_id INT NOT NULL,
    assigned_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'assigned',
    actual_hours DECIMAL(7,2) DEFAULT 0,
    completion_percentage DECIMAL(5,2) DEFAULT 0,
    submitted_at TIMESTAMPTZ NULL,
    score DECIMAL(5,2),
    CONSTRAINT fk_st_student FOREIGN KEY (student_id) REFERENCES STUDENTS(student_id) ON DELETE CASCADE,
    CONSTRAINT fk_st_task FOREIGN KEY (task_id) REFERENCES TASKS(task_id) ON DELETE CASCADE,
    CONSTRAINT uq_student_task UNIQUE (student_id, task_id),
    CONSTRAINT chk_st_percentage CHECK (completion_percentage BETWEEN 0.00 AND 100.00)
);

CREATE TABLE COLLISIONS (
    collision_id SERIAL PRIMARY KEY,
    student_id INT NOT NULL,
    analysis_id INT,
    collision_type VARCHAR(50),
    severity VARCHAR(30),
    description TEXT,
    detected_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    resolved BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_collisions_student FOREIGN KEY (student_id) REFERENCES STUDENTS(student_id) ON DELETE CASCADE,
    CONSTRAINT fk_collisions_analysis FOREIGN KEY (analysis_id) REFERENCES WORKLOAD_ANALYSIS(analysis_id) ON DELETE SET NULL,
    CONSTRAINT chk_collisions_severity CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'))
);

CREATE TABLE TASK_DEPENDENCIES (
    dependency_id SERIAL PRIMARY KEY,
    task_id INT NOT NULL,
    prerequisite_task_id INT NOT NULL,
    dependency_type VARCHAR(50) DEFAULT 'hard_prerequisite',
    CONSTRAINT fk_dep_task FOREIGN KEY (task_id) REFERENCES TASKS(task_id) ON DELETE CASCADE,
    CONSTRAINT fk_dep_prereq FOREIGN KEY (prerequisite_task_id) REFERENCES TASKS(task_id) ON DELETE CASCADE,
    CONSTRAINT uq_task_dependency UNIQUE (task_id, prerequisite_task_id),
    CONSTRAINT chk_dep_acyclic CHECK (task_id <> prerequisite_task_id)
);

CREATE TABLE SIMULATIONS (
    simulation_id SERIAL PRIMARY KEY,
    faculty_id INT NOT NULL,
    task_id INT NOT NULL,
    original_deadline TIMESTAMPTZ,
    proposed_deadline TIMESTAMPTZ,
    affected_students INT,
    original_risk DECIMAL(5,2),
    projected_risk DECIMAL(5,2),
    original_collisions INT,
    projected_collisions INT,
    impact_score DECIMAL(5,2),
    recommendation VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sim_faculty FOREIGN KEY (faculty_id) REFERENCES USERS(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_sim_task FOREIGN KEY (task_id) REFERENCES TASKS(task_id) ON DELETE CASCADE
);

-- Performance Indexes
CREATE INDEX idx_tasks_deadline ON TASKS(deadline_datetime);
CREATE INDEX idx_st_student_status ON STUDENT_TASKS(student_id, status);
CREATE INDEX idx_avail_student_dates ON AVAILABILITY(student_id, start_datetime, end_datetime);
CREATE INDEX idx_workload_student_calc ON WORKLOAD_ANALYSIS(student_id, calculated_at DESC);
