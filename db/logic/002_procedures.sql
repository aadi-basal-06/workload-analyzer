-- =====================================================================
-- 002_procedures.sql: Stored Procedures for Workload & Collision Engine
-- =====================================================================

USE student_workload;

DELIMITER $$

-- ---------------------------------------------------------------------
-- 1. sp_calculate_workload(student_id, start_dt, end_dt)
-- Computes five dimensional pressures and an overall weighted risk score:
--   - Temporal Pressure (25%): Deadline density (deadlines per week)
--   - Workload Pressure (30%): Required study hours / Available hours
--   - Cognitive Pressure (15%): Avg(Cognitive Load x Difficulty Level)
--   - Assessment Pressure (20%): Sum of assessment weights due
--   - Dependency Pressure (10%): Count of unfinished prerequisite tasks
-- Risk Levels:
--   LOW (< 30), MEDIUM (< 55), HIGH (< 75), CRITICAL (>= 75)
-- Inserts a record into WORKLOAD_ANALYSIS.
-- Note: Uses SELECT ... INTO exclusively to allow safe execution inside triggers.
-- ---------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_calculate_workload$$

CREATE PROCEDURE sp_calculate_workload(
    IN p_student_id INT,
    IN p_start_dt DATETIME,
    IN p_end_dt DATETIME
)
proc_label: BEGIN
    DECLARE v_window_days INT DEFAULT 14;
    DECLARE v_total_tasks INT DEFAULT 0;
    DECLARE v_total_estimated_hours DECIMAL(7,2) DEFAULT 0.00;
    DECLARE v_logged_hours DECIMAL(7,2) DEFAULT 0.00;
    DECLARE v_available_hours DECIMAL(7,2) DEFAULT 0.00;
    DECLARE v_effective_available DECIMAL(7,2) DEFAULT 1.00;

    DECLARE v_temporal_pressure DECIMAL(5,2) DEFAULT 0.00;
    DECLARE v_workload_pressure DECIMAL(5,2) DEFAULT 0.00;
    DECLARE v_cognitive_pressure DECIMAL(5,2) DEFAULT 0.00;
    DECLARE v_assessment_pressure DECIMAL(5,2) DEFAULT 0.00;
    DECLARE v_dependency_pressure DECIMAL(5,2) DEFAULT 0.00;
    DECLARE v_overall_risk_score DECIMAL(5,2) DEFAULT 0.00;
    DECLARE v_risk_level VARCHAR(30) DEFAULT 'LOW';
    DECLARE v_raw_cog_diff DECIMAL(7,2) DEFAULT 0.00;
    DECLARE v_raw_weight DECIMAL(7,2) DEFAULT 0.00;
    DECLARE v_unfinished_prereqs INT DEFAULT 0;

    -- Normalize date window defaults
    IF p_start_dt IS NULL THEN
        SET p_start_dt = NOW();
    END IF;
    IF p_end_dt IS NULL THEN
        SET p_end_dt = DATE_ADD(p_start_dt, INTERVAL 14 DAY);
    END IF;

    SET v_window_days = GREATEST(1, DATEDIFF(p_end_dt, p_start_dt));

    -- Total active, uncompleted tasks due in window
    SELECT 
        COUNT(*),
        COALESCE(SUM(COALESCE(t.estimated_hours, 5.00) * (1.00 - (COALESCE(st.completion_percentage, 0) / 100.00))), 0.00),
        COALESCE(AVG(COALESCE(t.cognitive_load, 3) * COALESCE(t.difficulty_level, 3)), 0.00),
        COALESCE(SUM(COALESCE(t.assessment_weight, 0.00)), 0.00)
    INTO 
        v_total_tasks,
        v_total_estimated_hours,
        v_raw_cog_diff,
        v_raw_weight
    FROM STUDENT_TASKS st
    JOIN TASKS t ON st.task_id = t.task_id
    WHERE st.student_id = p_student_id
      AND st.status != 'completed'
      AND st.completion_percentage < 100
      AND t.deadline_datetime BETWEEN p_start_dt AND p_end_dt;

    -- Availability: sum logged availability within the window
    SELECT COALESCE(SUM(available_hours), 0.00)
    INTO v_logged_hours
    FROM AVAILABILITY
    WHERE student_id = p_student_id
      AND start_datetime < p_end_dt
      AND end_datetime > p_start_dt;

    -- If student logged hours, use them; else assume 4 standard study hours/day
    IF v_logged_hours > 0 THEN
        SET v_available_hours = v_logged_hours;
    ELSE
        SET v_available_hours = v_window_days * 4.00;
    END IF;
    SET v_effective_available = GREATEST(1.00, v_available_hours);

    -- 1. Temporal Pressure: (Tasks / days) * 7 = deadlines per week. 5 deadlines/wk = 100.
    SET v_temporal_pressure = LEAST(100.00, ROUND(((v_total_tasks / v_window_days) * 7.00) * 20.00, 2));

    -- 2. Workload Pressure: Required hours vs Available hours
    SET v_workload_pressure = LEAST(100.00, ROUND((v_total_estimated_hours / v_effective_available) * 100.00, 2));

    -- 3. Cognitive Pressure: avg(cog x diff) where cog in 1-10, diff in 1-5 (max product 50) -> scaled to 100
    SET v_cognitive_pressure = LEAST(100.00, ROUND((v_raw_cog_diff / 50.00) * 100.00, 2));

    -- 4. Assessment Pressure: Sum of assessment weights due in the window
    SET v_assessment_pressure = LEAST(100.00, ROUND(v_raw_weight, 2));

    -- 5. Dependency Pressure: Unfinished prerequisites for tasks due in window
    SELECT COUNT(*)
    INTO v_unfinished_prereqs
    FROM TASK_DEPENDENCIES td
    JOIN STUDENT_TASKS st_due ON td.task_id = st_due.task_id
    JOIN TASKS t_due ON st_due.task_id = t_due.task_id
    LEFT JOIN STUDENT_TASKS st_pre 
           ON td.prerequisite_task_id = st_pre.task_id 
          AND st_pre.student_id = p_student_id
    WHERE st_due.student_id = p_student_id
      AND st_due.status != 'completed'
      AND st_due.completion_percentage < 100
      AND t_due.deadline_datetime BETWEEN p_start_dt AND p_end_dt
      AND (st_pre.student_task_id IS NULL OR st_pre.status != 'completed' OR st_pre.completion_percentage < 100);

    -- Each blocking uncompleted prerequisite contributes 25 points
    SET v_dependency_pressure = LEAST(100.00, ROUND(v_unfinished_prereqs * 25.00, 2));

    -- Overall Risk Score: Weighted average
    -- Weights: Temporal 25%, Workload 30%, Cognitive 15%, Assessment 20%, Dependency 10%
    SET v_overall_risk_score = LEAST(100.00, ROUND(
        (0.25 * v_temporal_pressure) +
        (0.30 * v_workload_pressure) +
        (0.15 * v_cognitive_pressure) +
        (0.20 * v_assessment_pressure) +
        (0.10 * v_dependency_pressure),
        2
    ));

    -- Determine Risk Level Category
    IF v_overall_risk_score < 30.00 THEN
        SET v_risk_level = 'LOW';
    ELSEIF v_overall_risk_score < 55.00 THEN
        SET v_risk_level = 'MEDIUM';
    ELSEIF v_overall_risk_score < 75.00 THEN
        SET v_risk_level = 'HIGH';
    ELSE
        SET v_risk_level = 'CRITICAL';
    END IF;

    -- Persist into WORKLOAD_ANALYSIS
    INSERT INTO WORKLOAD_ANALYSIS (
        student_id,
        start_datetime,
        end_datetime,
        total_estimated_hours,
        available_hours,
        temporal_pressure,
        workload_pressure,
        cognitive_pressure,
        assessment_pressure,
        dependency_pressure,
        overall_risk_score,
        risk_level,
        calculated_at
    ) VALUES (
        p_student_id,
        p_start_dt,
        p_end_dt,
        v_total_estimated_hours,
        v_available_hours,
        v_temporal_pressure,
        v_workload_pressure,
        v_cognitive_pressure,
        v_assessment_pressure,
        v_dependency_pressure,
        v_overall_risk_score,
        v_risk_level,
        NOW()
    );
END proc_label$$


-- ---------------------------------------------------------------------
-- 2. sp_detect_collisions(student_id)
-- Detects three critical types of collision:
--   - DEADLINE_CLUSTER: 3 or more deadlines within a 48-hour window
--   - OVERLOAD: Total required hours exceed available hours (workload_pressure > 100%)
--   - ASSESSMENT_OVERLAP: High assessment weights due within 24 hours (sum >= 25%)
-- Avoids duplicate unresolved collisions for the same student.
-- ---------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_detect_collisions$$

CREATE PROCEDURE sp_detect_collisions(
    IN p_student_id INT
)
proc_label: BEGIN
    DECLARE v_latest_analysis_id INT DEFAULT NULL;
    DECLARE v_total_est DECIMAL(7,2) DEFAULT 0.00;
    DECLARE v_avail_hours DECIMAL(7,2) DEFAULT 0.00;

    -- Variables for cursor iteration over uncompleted tasks
    DECLARE v_done INT DEFAULT FALSE;
    DECLARE v_cur_task_id INT;
    DECLARE v_cur_deadline DATETIME;
    DECLARE v_cur_title VARCHAR(200);
    DECLARE v_cluster_count INT DEFAULT 0;
    DECLARE v_overlap_weight DECIMAL(7,2) DEFAULT 0.00;
    DECLARE v_overlap_count INT DEFAULT 0;
    DECLARE v_cluster_desc TEXT;
    DECLARE v_overlap_desc TEXT;
    DECLARE v_date_str VARCHAR(50);

    -- Cursor to iterate over future uncompleted deadlines for this student
    DECLARE task_cursor CURSOR FOR
        SELECT t.task_id, t.deadline_datetime, t.title
        FROM STUDENT_TASKS st
        JOIN TASKS t ON st.task_id = t.task_id
        WHERE st.student_id = p_student_id
          AND st.status != 'completed'
          AND st.completion_percentage < 100
          AND t.deadline_datetime >= NOW()
        ORDER BY t.deadline_datetime ASC;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = TRUE;

    -- Fetch latest workload analysis for reference
    SELECT analysis_id, total_estimated_hours, available_hours
    INTO v_latest_analysis_id, v_total_est, v_avail_hours
    FROM WORKLOAD_ANALYSIS
    WHERE student_id = p_student_id
    ORDER BY calculated_at DESC, analysis_id DESC
    LIMIT 1;

    -- -----------------------------------------------------------------
    -- CHECK 1: OVERLOAD Collision (Required hours > Available hours)
    -- -----------------------------------------------------------------
    IF v_total_est > v_avail_hours AND v_total_est > 0 THEN
        IF NOT EXISTS (
            SELECT 1 FROM COLLISIONS 
            WHERE student_id = p_student_id 
              AND collision_type = 'OVERLOAD' 
              AND resolved = FALSE
        ) THEN
            INSERT INTO COLLISIONS (
                student_id, 
                analysis_id, 
                collision_type, 
                severity, 
                description, 
                detected_at, 
                resolved
            ) VALUES (
                p_student_id,
                v_latest_analysis_id,
                'OVERLOAD',
                CASE WHEN v_total_est >= (1.50 * v_avail_hours) THEN 'HIGH' ELSE 'MEDIUM' END,
                CONCAT('Workload overload: ', v_total_est, ' required task hours exceed ', v_avail_hours, ' available study hours in next 14 days.'),
                NOW(),
                FALSE
            );
        END IF;
    END IF;

    -- -----------------------------------------------------------------
    -- CHECK 2 & 3: DEADLINE_CLUSTER & ASSESSMENT_OVERLAP
    -- -----------------------------------------------------------------
    OPEN task_cursor;

    read_loop: LOOP
        FETCH task_cursor INTO v_cur_task_id, v_cur_deadline, v_cur_title;
        IF v_done THEN
            LEAVE read_loop;
        END IF;

        SET v_date_str = DATE_FORMAT(v_cur_deadline, '%Y-%m-%d');

        -- Count tasks due within 48 hours of v_cur_deadline
        SELECT COUNT(*)
        INTO v_cluster_count
        FROM STUDENT_TASKS st2
        JOIN TASKS t2 ON st2.task_id = t2.task_id
        WHERE st2.student_id = p_student_id
          AND st2.status != 'completed'
          AND st2.completion_percentage < 100
          AND t2.deadline_datetime >= v_cur_deadline
          AND t2.deadline_datetime <= DATE_ADD(v_cur_deadline, INTERVAL 48 HOUR);

        -- If 3 or more deadlines in 48 hours -> DEADLINE_CLUSTER
        IF v_cluster_count >= 3 THEN
            IF NOT EXISTS (
                SELECT 1 FROM COLLISIONS 
                WHERE student_id = p_student_id 
                  AND collision_type = 'DEADLINE_CLUSTER' 
                  AND resolved = FALSE
                  AND description LIKE CONCAT('%', v_date_str, '%')
            ) THEN
                SET v_cluster_desc = CONCAT(
                    'Deadline cluster detected: ', v_cluster_count, 
                    ' deadlines fall within 48 hours starting at ', 
                    DATE_FORMAT(v_cur_deadline, '%Y-%m-%d %H:%i')
                );
                INSERT INTO COLLISIONS (
                    student_id, 
                    analysis_id, 
                    collision_type, 
                    severity, 
                    description, 
                    detected_at, 
                    resolved
                ) VALUES (
                    p_student_id,
                    v_latest_analysis_id,
                    'DEADLINE_CLUSTER',
                    CASE WHEN v_cluster_count >= 4 THEN 'HIGH' ELSE 'MEDIUM' END,
                    v_cluster_desc,
                    NOW(),
                    FALSE
                );
            END IF;
        END IF;

        -- Check Assessment Overlap (tasks within 24h with cumulative weight >= 25%)
        SELECT COUNT(*), COALESCE(SUM(t3.assessment_weight), 0.00)
        INTO v_overlap_count, v_overlap_weight
        FROM STUDENT_TASKS st3
        JOIN TASKS t3 ON st3.task_id = t3.task_id
        WHERE st3.student_id = p_student_id
          AND st3.status != 'completed'
          AND st3.completion_percentage < 100
          AND t3.deadline_datetime >= v_cur_deadline
          AND t3.deadline_datetime <= DATE_ADD(v_cur_deadline, INTERVAL 24 HOUR);

        IF v_overlap_count >= 2 AND v_overlap_weight >= 25.00 THEN
            IF NOT EXISTS (
                SELECT 1 FROM COLLISIONS 
                WHERE student_id = p_student_id 
                  AND collision_type = 'ASSESSMENT_OVERLAP' 
                  AND resolved = FALSE
                  AND description LIKE CONCAT('%', v_date_str, '%')
            ) THEN
                SET v_overlap_desc = CONCAT(
                    'High assessment collision: ', v_overlap_count, 
                    ' assessments totalling ', v_overlap_weight, 
                    '% of course grades due within 24 hours of ', 
                    DATE_FORMAT(v_cur_deadline, '%Y-%m-%d %H:%i')
                );
                INSERT INTO COLLISIONS (
                    student_id, 
                    analysis_id, 
                    collision_type, 
                    severity, 
                    description, 
                    detected_at, 
                    resolved
                ) VALUES (
                    p_student_id,
                    v_latest_analysis_id,
                    'ASSESSMENT_OVERLAP',
                    'HIGH',
                    v_overlap_desc,
                    NOW(),
                    FALSE
                );
            END IF;
        END IF;

    END LOOP;

    CLOSE task_cursor;
END proc_label$$


-- ---------------------------------------------------------------------
-- 3. sp_assign_task_to_students(task_id)
-- Enrolls/assigns a newly created task to all students who belong to the
-- course's semester (as defined in course enrollment rules).
-- ---------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_assign_task_to_students$$

CREATE PROCEDURE sp_assign_task_to_students(
    IN p_task_id INT
)
BEGIN
    DECLARE v_course_semester INT;

    -- Look up target semester
    SELECT c.semester 
    INTO v_course_semester
    FROM TASKS t
    JOIN COURSES c ON t.course_id = c.course_id
    WHERE t.task_id = p_task_id;

    -- Insert student tasks for all matching students
    INSERT IGNORE INTO STUDENT_TASKS (
        student_id, 
        task_id, 
        assigned_at, 
        status, 
        actual_hours, 
        completion_percentage
    )
    SELECT 
        s.student_id, 
        p_task_id, 
        NOW(), 
        'assigned', 
        0.00, 
        0.00
    FROM STUDENTS s
    WHERE s.semester = v_course_semester;
END$$


-- ---------------------------------------------------------------------
-- 4. sp_simulate_deadline_change(task_id, proposed_deadline, faculty_id)
-- Evaluates the impact of shifting a task deadline WITHOUT modifying
-- persistent task data. Computes original vs projected risk and collisions,
-- records a SIMULATIONS row, and outputs an actionable recommendation.
-- ---------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_simulate_deadline_change$$

CREATE PROCEDURE sp_simulate_deadline_change(
    IN p_task_id INT,
    IN p_proposed_deadline DATETIME,
    IN p_faculty_id INT
)
BEGIN
    DECLARE v_course_id INT;
    DECLARE v_course_semester INT;
    DECLARE v_original_deadline DATETIME;
    DECLARE v_affected_students INT DEFAULT 0;
    DECLARE v_original_risk DECIMAL(5,2) DEFAULT 0.00;
    DECLARE v_projected_risk DECIMAL(5,2) DEFAULT 0.00;
    DECLARE v_original_collisions INT DEFAULT 0;
    DECLARE v_projected_collisions INT DEFAULT 0;
    DECLARE v_impact_score DECIMAL(5,2) DEFAULT 0.00;
    DECLARE v_recommendation VARCHAR(255);
    DECLARE v_orig_clusters INT DEFAULT 0;
    DECLARE v_proj_clusters INT DEFAULT 0;
    DECLARE v_sim_id INT;

    -- Retrieve current task info
    SELECT t.course_id, c.semester, t.deadline_datetime
    INTO v_course_id, v_course_semester, v_original_deadline
    FROM TASKS t
    JOIN COURSES c ON t.course_id = c.course_id
    WHERE t.task_id = p_task_id;

    -- Count affected students
    SELECT COUNT(DISTINCT s.student_id)
    INTO v_affected_students
    FROM STUDENTS s
    WHERE s.semester = v_course_semester;

    -- Determine baseline original risk and collisions among enrolled students
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

    -- Count how many other tasks in this semester clash around the original deadline (within 48h)
    SELECT COUNT(*)
    INTO v_orig_clusters
    FROM TASKS t2
    JOIN COURSES c2 ON t2.course_id = c2.course_id
    WHERE c2.semester = v_course_semester
      AND t2.task_id <> p_task_id
      AND t2.deadline_datetime BETWEEN DATE_SUB(v_original_deadline, INTERVAL 48 HOUR) AND DATE_ADD(v_original_deadline, INTERVAL 48 HOUR);

    -- Count how many other tasks in this semester clash around the proposed deadline (within 48h)
    SELECT COUNT(*)
    INTO v_proj_clusters
    FROM TASKS t3
    JOIN COURSES c3 ON t3.course_id = c3.course_id
    WHERE c3.semester = v_course_semester
      AND t3.task_id <> p_task_id
      AND t3.deadline_datetime BETWEEN DATE_SUB(p_proposed_deadline, INTERVAL 48 HOUR) AND DATE_ADD(p_proposed_deadline, INTERVAL 48 HOUR);

    -- Calculate projected risk and collision shift
    -- If moving into a cluster (v_proj_clusters > v_orig_clusters), risk increases
    -- If moving away into open days (v_proj_clusters < v_orig_clusters), risk decreases
    SET v_projected_risk = LEAST(100.00, GREATEST(5.00, ROUND(
        v_original_risk + ((v_proj_clusters - v_orig_clusters) * 15.00),
        2
    )));

    SET v_projected_collisions = GREATEST(0, CAST(
        v_original_collisions + ((v_proj_clusters - v_orig_clusters) * GREATEST(1, v_affected_students)) 
        AS SIGNED
    ));

    SET v_impact_score = ROUND(v_projected_risk - v_original_risk, 2);

    -- Actionable recommendation logic
    IF v_impact_score <= -5.00 THEN
        SET v_recommendation = 'APPROVE: Shifting deadline relieves pressure and resolves deadline collisions.';
    ELSEIF v_impact_score <= 4.00 AND v_proj_clusters < 2 THEN
        SET v_recommendation = 'APPROVE: Proposed deadline maintains a balanced workload with negligible impact.';
    ELSEIF v_proj_clusters >= 2 OR v_impact_score >= 15.00 THEN
        SET v_recommendation = 'NOT RECOMMENDED: Severe collision cluster created with 3+ overlapping tasks.';
    ELSE
        SET v_recommendation = 'SUGGEST ALTERNATE DATE: Moderate risk increase; consider postponing by 2 to 3 days.';
    END IF;

    -- Persist simulation record
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
        NOW()
    );
END$$

DELIMITER ;
