-- =====================================================================
-- 002_procedures.sql: Stored Procedures for Workload & Collision Engine (PostgreSQL)
-- =====================================================================

DROP PROCEDURE IF EXISTS sp_calculate_workload(INT, TIMESTAMPTZ, TIMESTAMPTZ);
DROP PROCEDURE IF EXISTS sp_detect_collisions(INT);
DROP PROCEDURE IF EXISTS sp_assign_task_to_students(INT);
DROP PROCEDURE IF EXISTS sp_simulate_deadline_change(INT, TIMESTAMPTZ, INT);

-- ---------------------------------------------------------------------
-- 1. sp_calculate_workload(student_id, start_dt, end_dt)
-- ---------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_calculate_workload(
    p_student_id INT,
    p_start_dt TIMESTAMPTZ DEFAULT NULL,
    p_end_dt TIMESTAMPTZ DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_start_dt TIMESTAMPTZ;
    v_end_dt TIMESTAMPTZ;
    v_window_days INT := 14;
    v_total_tasks INT := 0;
    v_total_estimated_hours DECIMAL(7,2) := 0.00;
    v_logged_hours DECIMAL(7,2) := 0.00;
    v_available_hours DECIMAL(7,2) := 0.00;
    v_effective_available DECIMAL(7,2) := 1.00;

    v_temporal_pressure DECIMAL(5,2) := 0.00;
    v_workload_pressure DECIMAL(5,2) := 0.00;
    v_cognitive_pressure DECIMAL(5,2) := 0.00;
    v_assessment_pressure DECIMAL(5,2) := 0.00;
    v_dependency_pressure DECIMAL(5,2) := 0.00;
    v_overall_risk_score DECIMAL(5,2) := 0.00;
    v_risk_level VARCHAR(30) := 'LOW';
    v_raw_cog_diff DECIMAL(7,2) := 0.00;
    v_raw_weight DECIMAL(7,2) := 0.00;
    v_unfinished_prereqs INT := 0;
BEGIN
    v_start_dt := COALESCE(p_start_dt, CURRENT_TIMESTAMP);
    v_end_dt := COALESCE(p_end_dt, v_start_dt + INTERVAL '14 days');

    v_window_days := GREATEST(1, ROUND(EXTRACT(EPOCH FROM (v_end_dt - v_start_dt)) / 86400)::INT);

    -- 1. Aggregate active uncompleted tasks
    SELECT 
        COUNT(*),
        COALESCE(SUM(t.estimated_hours * (1.00 - (st.completion_percentage / 100.00))), 0.00),
        COALESCE(AVG(t.difficulty_level * t.cognitive_load), 0.00),
        COALESCE(SUM(t.assessment_weight), 0.00)
    INTO 
        v_total_tasks,
        v_total_estimated_hours,
        v_raw_cog_diff,
        v_raw_weight
    FROM STUDENT_TASKS st
    JOIN TASKS t ON st.task_id = t.task_id
    WHERE st.student_id = p_student_id
      AND st.status <> 'completed'
      AND st.completion_percentage < 100.00
      AND t.deadline_datetime BETWEEN v_start_dt AND v_end_dt;

    -- 2. Aggregate logged availability
    SELECT COALESCE(SUM(available_hours), 0.00)
    INTO v_logged_hours
    FROM AVAILABILITY
    WHERE student_id = p_student_id
      AND start_datetime >= v_start_dt
      AND end_datetime <= v_end_dt;

    -- Default baseline availability (4 hours/day) if student has not logged calendar
    IF v_logged_hours > 0.00 THEN
        v_available_hours := v_logged_hours;
    ELSE
        v_available_hours := v_window_days * 4.00;
    END IF;

    v_effective_available := GREATEST(1.00, v_available_hours);

    -- 3. Calculate 5 Pressure Dimensions
    v_temporal_pressure := LEAST(100.00, (v_total_tasks::DECIMAL / v_window_days::DECIMAL) * 7.00 * 20.00);
    v_workload_pressure := LEAST(100.00, (v_total_estimated_hours / v_effective_available) * 100.00);
    v_cognitive_pressure := LEAST(100.00, (v_raw_cog_diff / 50.00) * 100.00);
    v_assessment_pressure := LEAST(100.00, v_raw_weight);

    -- 4. Calculate Dependency Bottlenecks
    SELECT COUNT(*)
    INTO v_unfinished_prereqs
    FROM TASK_DEPENDENCIES td
    JOIN STUDENT_TASKS st_child ON td.task_id = st_child.task_id
    JOIN STUDENT_TASKS st_prereq ON td.prerequisite_task_id = st_prereq.task_id
    JOIN TASKS t_child ON st_child.task_id = t_child.task_id
    WHERE st_child.student_id = p_student_id
      AND st_prereq.student_id = p_student_id
      AND st_child.status <> 'completed'
      AND t_child.deadline_datetime BETWEEN v_start_dt AND v_end_dt
      AND (st_prereq.status <> 'completed' OR st_prereq.completion_percentage < 100.00);

    v_dependency_pressure := LEAST(100.00, v_unfinished_prereqs * 25.00);

    -- 5. Overall Risk Score Calculation
    v_overall_risk_score := (0.25 * v_temporal_pressure) +
                            (0.30 * v_workload_pressure) +
                            (0.15 * v_cognitive_pressure) +
                            (0.20 * v_assessment_pressure) +
                            (0.10 * v_dependency_pressure);

    IF v_overall_risk_score >= 75.00 THEN
        v_risk_level := 'CRITICAL';
    ELSIF v_overall_risk_score >= 55.00 THEN
        v_risk_level := 'HIGH';
    ELSIF v_overall_risk_score >= 30.00 THEN
        v_risk_level := 'MEDIUM';
    ELSE
        v_risk_level := 'LOW';
    END IF;

    -- 6. Insert Snapshot Record into WORKLOAD_ANALYSIS
    INSERT INTO WORKLOAD_ANALYSIS (
        student_id, start_datetime, end_datetime,
        total_estimated_hours, available_hours,
        temporal_pressure, workload_pressure, cognitive_pressure,
        assessment_pressure, dependency_pressure,
        overall_risk_score, risk_level, calculated_at
    ) VALUES (
        p_student_id, v_start_dt, v_end_dt,
        v_total_estimated_hours, v_available_hours,
        v_temporal_pressure, v_workload_pressure, v_cognitive_pressure,
        v_assessment_pressure, v_dependency_pressure,
        v_overall_risk_score, v_risk_level, CURRENT_TIMESTAMP
    );
END;
$$;

-- ---------------------------------------------------------------------
-- 2. sp_detect_collisions(student_id)
-- ---------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_detect_collisions(p_student_id INT)
LANGUAGE plpgsql
AS $$
DECLARE
    v_latest_analysis_id INT;
    v_cluster_count INT := 0;
    v_overload_hours DECIMAL(7,2) := 0.00;
    v_available_7d DECIMAL(7,2) := 0.00;
    v_overlap_weight DECIMAL(5,2) := 0.00;
BEGIN
    SELECT analysis_id INTO v_latest_analysis_id
    FROM WORKLOAD_ANALYSIS
    WHERE student_id = p_student_id
    ORDER BY calculated_at DESC
    LIMIT 1;

    -- Clean existing unresolved collisions
    DELETE FROM COLLISIONS WHERE student_id = p_student_id AND resolved = FALSE;

    -- Collision 1: DEADLINE_CLUSTER (3+ incomplete tasks within 48 hours)
    SELECT COUNT(*) INTO v_cluster_count
    FROM TASKS t1
    JOIN STUDENT_TASKS st1 ON t1.task_id = st1.task_id
    WHERE st1.student_id = p_student_id AND st1.status <> 'completed'
      AND (
          SELECT COUNT(*)
          FROM TASKS t2
          JOIN STUDENT_TASKS st2 ON t2.task_id = st2.task_id
          WHERE st2.student_id = p_student_id AND st2.status <> 'completed'
            AND t2.deadline_datetime >= t1.deadline_datetime
            AND t2.deadline_datetime <= t1.deadline_datetime + INTERVAL '48 hours'
      ) >= 3;

    IF v_cluster_count > 0 THEN
        INSERT INTO COLLISIONS (student_id, analysis_id, collision_type, severity, description)
        VALUES (p_student_id, v_latest_analysis_id, 'DEADLINE_CLUSTER', 'HIGH',
                'Three or more academic deliverables are scheduled within a 48-hour collision window.');
    END IF;

    -- Collision 2: OVERLOAD (Required task effort exceeds study capacity over next 7 days)
    SELECT COALESCE(SUM(t.estimated_hours * (1.00 - (st.completion_percentage / 100.00))), 0.00)
    INTO v_overload_hours
    FROM TASKS t
    JOIN STUDENT_TASKS st ON t.task_id = st.task_id
    WHERE st.student_id = p_student_id AND st.status <> 'completed'
      AND t.deadline_datetime BETWEEN CURRENT_TIMESTAMP AND CURRENT_TIMESTAMP + INTERVAL '7 days';

    SELECT COALESCE(SUM(available_hours), 28.00) INTO v_available_7d
    FROM AVAILABILITY
    WHERE student_id = p_student_id
      AND start_datetime >= CURRENT_TIMESTAMP 
      AND end_datetime <= CURRENT_TIMESTAMP + INTERVAL '7 days';

    IF v_overload_hours > v_available_7d THEN
        INSERT INTO COLLISIONS (student_id, analysis_id, collision_type, severity, description)
        VALUES (p_student_id, v_latest_analysis_id, 'OVERLOAD', 'CRITICAL',
                'Impending deliverable effort (' || v_overload_hours || 'h) exceeds total study capacity (' || v_available_7d || 'h) over 7 days.');
    END IF;

    -- Collision 3: ASSESSMENT_OVERLAP (Cumulative weight >= 25% due within 24 hours)
    SELECT COALESCE(MAX(window_weight), 0.00) INTO v_overlap_weight
    FROM (
        SELECT SUM(t_sub.assessment_weight) AS window_weight
        FROM TASKS t_main
        JOIN STUDENT_TASKS st_main ON t_main.task_id = st_main.task_id
        JOIN TASKS t_sub ON t_sub.deadline_datetime BETWEEN t_main.deadline_datetime AND t_main.deadline_datetime + INTERVAL '24 hours'
        JOIN STUDENT_TASKS st_sub ON t_sub.task_id = st_sub.task_id AND st_sub.student_id = p_student_id
        WHERE st_main.student_id = p_student_id AND st_main.status <> 'completed'
        GROUP BY t_main.task_id
    ) AS weights;

    IF v_overlap_weight >= 25.00 THEN
        INSERT INTO COLLISIONS (student_id, analysis_id, collision_type, severity, description)
        VALUES (p_student_id, v_latest_analysis_id, 'ASSESSMENT_OVERLAP', 'HIGH',
                'Multiple high-stakes assessments with cumulative grade weight >= 25% fall within 24 hours.');
    END IF;
END;
$$;

-- ---------------------------------------------------------------------
-- 3. sp_assign_task_to_students(task_id)
-- ---------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_assign_task_to_students(p_task_id INT)
LANGUAGE plpgsql
AS $$
DECLARE
    v_course_semester INT;
BEGIN
    SELECT c.semester INTO v_course_semester
    FROM TASKS t
    JOIN COURSES c ON t.course_id = c.course_id
    WHERE t.task_id = p_task_id;

    INSERT INTO STUDENT_TASKS (student_id, task_id, status, actual_hours, completion_percentage)
    SELECT s.student_id, p_task_id, 'assigned', 0.00, 0.00
    FROM STUDENTS s
    WHERE s.semester = v_course_semester
    ON CONFLICT (student_id, task_id) DO NOTHING;
END;
$$;

-- ---------------------------------------------------------------------
-- 4. sp_simulate_deadline_change(task_id, proposed_deadline, faculty_id)
-- ---------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_simulate_deadline_change(
    p_task_id INT,
    p_proposed_deadline TIMESTAMPTZ,
    p_faculty_id INT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_course_id INT;
    v_course_semester INT;
    v_original_deadline TIMESTAMPTZ;
    v_affected_students INT := 0;
    v_original_risk DECIMAL(5,2) := 0.00;
    v_projected_risk DECIMAL(5,2) := 0.00;
    v_original_collisions INT := 0;
    v_projected_collisions INT := 0;
    v_impact_score DECIMAL(5,2) := 0.00;
    v_recommendation VARCHAR(255);
    v_orig_clusters INT := 0;
    v_proj_clusters INT := 0;
BEGIN
    SELECT t.course_id, c.semester, t.deadline_datetime
    INTO v_course_id, v_course_semester, v_original_deadline
    FROM TASKS t
    JOIN COURSES c ON t.course_id = c.course_id
    WHERE t.task_id = p_task_id;

    SELECT COUNT(DISTINCT s.student_id)
    INTO v_affected_students
    FROM STUDENTS s
    WHERE s.semester = v_course_semester;

    SELECT 
        COALESCE(ROUND(AVG(latest_wa.overall_risk_score), 2), 35.00),
        COALESCE(SUM(col_cnt.unresolved_count), 0)
    INTO 
        v_original_risk,
        v_original_collisions
    FROM STUDENTS s
    LEFT JOIN (
        SELECT wa1.student_id, wa1.overall_risk_score
        FROM WORKLOAD_ANALYSIS wa1
        JOIN (
            SELECT student_id, MAX(analysis_id) AS max_id 
            FROM WORKLOAD_ANALYSIS 
            GROUP BY student_id
        ) wa_sub ON wa1.analysis_id = wa_sub.max_id
    ) latest_wa ON s.student_id = latest_wa.student_id
    LEFT JOIN (
        SELECT student_id, COUNT(*) AS unresolved_count
        FROM COLLISIONS
        WHERE resolved = FALSE
        GROUP BY student_id
    ) col_cnt ON s.student_id = col_cnt.student_id
    WHERE s.semester = v_course_semester;

    -- Count cluster density around original deadline (+/- 48 hours)
    SELECT COUNT(*) INTO v_orig_clusters
    FROM TASKS t2
    JOIN COURSES c2 ON t2.course_id = c2.course_id
    WHERE c2.semester = v_course_semester
      AND t2.task_id <> p_task_id
      AND t2.deadline_datetime BETWEEN (v_original_deadline - INTERVAL '48 hours') AND (v_original_deadline + INTERVAL '48 hours');

    -- Count cluster density around proposed deadline (+/- 48 hours)
    SELECT COUNT(*) INTO v_proj_clusters
    FROM TASKS t3
    JOIN COURSES c3 ON t3.course_id = c3.course_id
    WHERE c3.semester = v_course_semester
      AND t3.task_id <> p_task_id
      AND t3.deadline_datetime BETWEEN (p_proposed_deadline - INTERVAL '48 hours') AND (p_proposed_deadline + INTERVAL '48 hours');

    v_projected_risk := LEAST(100.00, GREATEST(5.00, ROUND(
        v_original_risk + ((v_proj_clusters - v_orig_clusters) * 15.00),
        2
    )));

    v_projected_collisions := GREATEST(0, (v_original_collisions + ((v_proj_clusters - v_orig_clusters) * GREATEST(1, v_affected_students))));

    v_impact_score := ROUND(v_projected_risk - v_original_risk, 2);

    IF v_impact_score <= -5.00 THEN
        v_recommendation := 'APPROVE: Shifting deadline relieves pressure and resolves deadline collisions.';
    ELSIF v_impact_score <= 4.00 AND v_proj_clusters < 2 THEN
        v_recommendation := 'APPROVE: Proposed deadline maintains a balanced workload with negligible impact.';
    ELSIF v_proj_clusters >= 2 OR v_impact_score >= 15.00 THEN
        v_recommendation := 'NOT RECOMMENDED: Severe collision cluster created with 3+ overlapping tasks.';
    ELSE
        v_recommendation := 'SUGGEST ALTERNATE DATE: Moderate risk increase; consider postponing by 2 to 3 days.';
    END IF;

    INSERT INTO SIMULATIONS (
        faculty_id,
        task_id,
        original_deadline,
        proposed_deadline,
        affected_students,
        original_risk,
        projected_risk,
        original_collisions,
        projected_collisions,
        impact_score,
        recommendation,
        created_at
    ) VALUES (
        p_faculty_id,
        p_task_id,
        v_original_deadline,
        p_proposed_deadline,
        v_affected_students,
        v_original_risk,
        v_projected_risk,
        v_original_collisions,
        v_projected_collisions,
        v_impact_score,
        v_recommendation,
        CURRENT_TIMESTAMP
    );
END;
$$;
