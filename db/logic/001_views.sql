-- =====================================================================
-- 001_views.sql: Database Views for Student Workload & Collision Analyzer
-- =====================================================================

USE student_workload;

-- Drop existing views if they exist
DROP VIEW IF EXISTS v_student_task_overview;
DROP VIEW IF EXISTS v_high_risk_students;
DROP VIEW IF EXISTS v_course_risk_summary;

-- ---------------------------------------------------------------------
-- 1. v_student_task_overview:
-- Detailed flat view joining students, enrolled courses, assigned tasks,
-- and submission progress. Computes overdue status dynamically.
-- ---------------------------------------------------------------------
CREATE VIEW v_student_task_overview AS
SELECT 
    st.student_task_id,
    s.student_id,
    s.roll_no,
    u.username AS student_name,
    u.email AS student_email,
    s.program,
    s.semester AS student_semester,
    s.section,
    c.course_id,
    c.course_code,
    c.course_name,
    c.faculty_id,
    fu.username AS faculty_name,
    t.task_id,
    t.title AS task_title,
    t.description AS task_description,
    t.task_type,
    t.release_datetime,
    t.deadline_datetime,
    t.estimated_hours,
    t.difficulty_level,
    t.cognitive_load,
    t.assessment_weight,
    t.is_team_task,
    t.status AS task_status,
    st.assigned_at,
    st.status AS submission_status,
    st.actual_hours,
    st.completion_percentage,
    st.submitted_at,
    st.score,
    CASE 
        WHEN t.deadline_datetime < NOW() AND (st.completion_percentage < 100 OR st.status != 'completed') THEN 1 
        ELSE 0 
    END AS is_overdue,
    TIMESTAMPDIFF(HOUR, NOW(), t.deadline_datetime) AS hours_until_deadline
FROM STUDENT_TASKS st
JOIN STUDENTS s ON st.student_id = s.student_id
JOIN USERS u ON s.user_id = u.user_id
JOIN TASKS t ON st.task_id = t.task_id
JOIN COURSES c ON t.course_id = c.course_id
LEFT JOIN USERS fu ON c.faculty_id = fu.user_id;

-- ---------------------------------------------------------------------
-- 2. v_course_risk_summary:
-- Aggregates course metrics, enrolled students (matching semester),
-- average task completion, and average student risk score.
-- ---------------------------------------------------------------------
CREATE VIEW v_course_risk_summary AS
SELECT 
    c.course_id,
    c.course_code,
    c.course_name,
    c.credits,
    c.semester,
    c.faculty_id,
    fu.username AS faculty_name,
    COUNT(DISTINCT t.task_id) AS total_tasks,
    COUNT(DISTINCT s.student_id) AS total_enrolled_students,
    COALESCE(ROUND(AVG(st.completion_percentage), 2), 0.00) AS avg_completion_percentage,
    COALESCE(ROUND(AVG(latest_wa.overall_risk_score), 2), 0.00) AS avg_student_risk_score,
    COUNT(DISTINCT CASE WHEN latest_wa.risk_level IN ('HIGH', 'CRITICAL') THEN s.student_id END) AS high_risk_student_count
FROM COURSES c
LEFT JOIN USERS fu ON c.faculty_id = fu.user_id
LEFT JOIN TASKS t ON c.course_id = t.course_id
LEFT JOIN STUDENTS s ON s.semester = c.semester
LEFT JOIN STUDENT_TASKS st ON st.task_id = t.task_id AND st.student_id = s.student_id
LEFT JOIN (
    -- Subquery to fetch only the latest workload analysis per student
    SELECT wa1.*
    FROM WORKLOAD_ANALYSIS wa1
    INNER JOIN (
        SELECT student_id, MAX(analysis_id) AS max_analysis_id
        FROM WORKLOAD_ANALYSIS
        GROUP BY student_id
    ) wa_max ON wa1.analysis_id = wa_max.max_analysis_id
) latest_wa ON latest_wa.student_id = s.student_id
GROUP BY 
    c.course_id, 
    c.course_code, 
    c.course_name, 
    c.credits, 
    c.semester, 
    c.faculty_id, 
    fu.username;

-- ---------------------------------------------------------------------
-- 3. v_high_risk_students:
-- Lists students whose latest workload analysis indicates HIGH or CRITICAL risk,
-- including counts of unresolved collisions and pending tasks.
-- ---------------------------------------------------------------------
CREATE VIEW v_high_risk_students AS
SELECT 
    s.student_id,
    s.user_id,
    u.username AS student_name,
    u.email AS student_email,
    s.roll_no,
    s.program,
    s.semester,
    s.section,
    adv.username AS advisor_name,
    wa.analysis_id,
    wa.total_estimated_hours,
    wa.available_hours,
    wa.temporal_pressure,
    wa.workload_pressure,
    wa.cognitive_pressure,
    wa.assessment_pressure,
    wa.dependency_pressure,
    wa.overall_risk_score,
    wa.risk_level,
    wa.calculated_at,
    (
        SELECT COUNT(*) 
        FROM COLLISIONS col 
        WHERE col.student_id = s.student_id AND col.resolved = FALSE
    ) AS active_collisions_count,
    (
        SELECT COUNT(*) 
        FROM STUDENT_TASKS st2 
        JOIN TASKS t2 ON st2.task_id = t2.task_id
        WHERE st2.student_id = s.student_id 
          AND st2.status != 'completed' 
          AND t2.deadline_datetime >= NOW()
    ) AS pending_tasks_count
FROM STUDENTS s
JOIN USERS u ON s.user_id = u.user_id
LEFT JOIN USERS adv ON s.advisor_id = adv.user_id
JOIN WORKLOAD_ANALYSIS wa ON wa.analysis_id = (
    SELECT MAX(analysis_id) 
    FROM WORKLOAD_ANALYSIS 
    WHERE student_id = s.student_id
)
WHERE wa.overall_risk_score >= 55.00 OR wa.risk_level IN ('HIGH', 'CRITICAL');

