DROP DATABASE IF EXISTS student_workload;
CREATE DATABASE student_workload;
USE student_workload;

CREATE TABLE USERS (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (role IN ('student', 'faculty', 'admin'))
);

CREATE TABLE STUDENTS (
    student_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    roll_no VARCHAR(50) NOT NULL UNIQUE,
    program VARCHAR(100),
    semester INT,
    section VARCHAR(20),
    advisor_id INT,
    FOREIGN KEY (user_id) REFERENCES USERS(user_id) ON DELETE CASCADE,
    FOREIGN KEY (advisor_id) REFERENCES USERS(user_id) ON DELETE SET NULL
);

CREATE TABLE COURSES (
    course_id INT AUTO_INCREMENT PRIMARY KEY,
    course_code VARCHAR(50) NOT NULL UNIQUE,
    course_name VARCHAR(150) NOT NULL,
    faculty_id INT,
    credits INT,
    semester INT,
    FOREIGN KEY (faculty_id) REFERENCES USERS(user_id) ON DELETE SET NULL
);

CREATE TABLE TASKS (
    task_id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    task_type VARCHAR(50),
    release_datetime DATETIME,
    deadline_datetime DATETIME NOT NULL,
    estimated_hours DECIMAL(7,2),
    difficulty_level INT,
    cognitive_load INT,
    assessment_weight DECIMAL(5,2),
    is_team_task BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES COURSES(course_id) ON DELETE CASCADE,
    CHECK (difficulty_level BETWEEN 1 AND 5),
    INDEX idx_tasks_deadline (deadline_datetime)
);

CREATE TABLE AVAILABILITY (
    availability_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    start_datetime DATETIME NOT NULL,
    end_datetime DATETIME NOT NULL,
    available_hours DECIMAL(5,2),
    availability_type VARCHAR(50),
    FOREIGN KEY (student_id) REFERENCES STUDENTS(student_id) ON DELETE CASCADE,
    CHECK (end_datetime > start_datetime)
);

CREATE TABLE WORKLOAD_ANALYSIS (
    analysis_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    start_datetime DATETIME,
    end_datetime DATETIME,
    total_estimated_hours DECIMAL(7,2),
    available_hours DECIMAL(7,2),
    temporal_pressure DECIMAL(5,2),
    workload_pressure DECIMAL(5,2),
    cognitive_pressure DECIMAL(5,2),
    assessment_pressure DECIMAL(5,2),
    dependency_pressure DECIMAL(5,2),
    overall_risk_score DECIMAL(5,2),
    risk_level VARCHAR(30),
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES STUDENTS(student_id) ON DELETE CASCADE
);

CREATE TABLE STUDENT_TASKS (
    student_task_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    task_id INT NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'assigned',
    actual_hours DECIMAL(7,2) DEFAULT 0,
    completion_percentage DECIMAL(5,2) DEFAULT 0,
    submitted_at TIMESTAMP NULL,
    score DECIMAL(5,2),
    FOREIGN KEY (student_id) REFERENCES STUDENTS(student_id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES TASKS(task_id) ON DELETE CASCADE,
    UNIQUE (student_id, task_id),
    CHECK (completion_percentage BETWEEN 0 AND 100)
);

CREATE TABLE COLLISIONS (
    collision_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    analysis_id INT,
    collision_type VARCHAR(50),
    severity VARCHAR(30),
    description TEXT,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (student_id) REFERENCES STUDENTS(student_id) ON DELETE CASCADE,
    FOREIGN KEY (analysis_id) REFERENCES WORKLOAD_ANALYSIS(analysis_id) ON DELETE SET NULL
);

CREATE TABLE TASK_DEPENDENCIES (
    dependency_id INT AUTO_INCREMENT PRIMARY KEY,
    task_id INT NOT NULL,
    prerequisite_task_id INT NOT NULL,
    dependency_type VARCHAR(50),
    FOREIGN KEY (task_id) REFERENCES TASKS(task_id) ON DELETE CASCADE,
    FOREIGN KEY (prerequisite_task_id) REFERENCES TASKS(task_id) ON DELETE CASCADE,
    UNIQUE (task_id, prerequisite_task_id),
    CHECK (task_id <> prerequisite_task_id)
);

CREATE TABLE SIMULATIONS (
    simulation_id INT AUTO_INCREMENT PRIMARY KEY,
    faculty_id INT NOT NULL,
    task_id INT NOT NULL,
    original_deadline DATETIME,
    proposed_deadline DATETIME,
    affected_students INT,
    original_risk DECIMAL(5,2),
    projected_risk DECIMAL(5,2),
    original_collisions INT,
    projected_collisions INT,
    impact_score DECIMAL(5,2),
    recommendation VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (faculty_id) REFERENCES USERS(user_id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES TASKS(task_id) ON DELETE CASCADE
);

