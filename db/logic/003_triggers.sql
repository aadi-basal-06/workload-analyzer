-- =====================================================================
-- 003_triggers.sql: Database Triggers for Integrity & Workload Sync
-- =====================================================================

USE student_workload;

DELIMITER $$

-- ---------------------------------------------------------------------
-- Trigger (a): trg_prevent_circular_dependencies
-- BEFORE INSERT ON TASK_DEPENDENCIES
-- Prevents circular / cyclic dependencies in prerequisite task trees
-- by traversing prerequisite chains recursively.
-- ---------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_prevent_circular_dependencies$$

CREATE TRIGGER trg_prevent_circular_dependencies
BEFORE INSERT ON TASK_DEPENDENCIES
FOR EACH ROW
BEGIN
    DECLARE v_cycle_detected INT DEFAULT 0;

    -- Self-dependency is blocked by CHECK constraint (task_id <> prerequisite_task_id).
    -- Here we verify that NEW.task_id is not already an indirect prerequisite of NEW.prerequisite_task_id.
    WITH RECURSIVE prereq_path AS (
        SELECT prerequisite_task_id 
        FROM TASK_DEPENDENCIES 
        WHERE task_id = NEW.prerequisite_task_id

        UNION ALL

        SELECT td.prerequisite_task_id 
        FROM TASK_DEPENDENCIES td 
        JOIN prereq_path pp ON td.task_id = pp.prerequisite_task_id
    )
    SELECT COUNT(*) 
    INTO v_cycle_detected 
    FROM prereq_path 
    WHERE prerequisite_task_id = NEW.task_id;

    IF v_cycle_detected > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Circular dependency detected: Prerequisite chain cannot form a cycle.';
    END IF;
END$$


-- ---------------------------------------------------------------------
-- Trigger (b1): trg_tasks_deadline_check_insert
-- BEFORE INSERT ON TASKS
-- Ensures deadline_datetime is strictly greater than release_datetime
-- whenever release_datetime is specified.
-- ---------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_tasks_deadline_check_insert$$

CREATE TRIGGER trg_tasks_deadline_check_insert
BEFORE INSERT ON TASKS
FOR EACH ROW
BEGIN
    IF NEW.release_datetime IS NOT NULL AND NEW.deadline_datetime <= NEW.release_datetime THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid task dates: deadline_datetime must be strictly after release_datetime.';
    END IF;
END$$


-- ---------------------------------------------------------------------
-- Trigger (b2): trg_tasks_deadline_check_update
-- BEFORE UPDATE ON TASKS
-- Ensures updated deadline_datetime remains strictly greater than release_datetime.
-- ---------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_tasks_deadline_check_update$$

CREATE TRIGGER trg_tasks_deadline_check_update
BEFORE UPDATE ON TASKS
FOR EACH ROW
BEGIN
    IF NEW.release_datetime IS NOT NULL AND NEW.deadline_datetime <= NEW.release_datetime THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid task dates: deadline_datetime must be strictly after release_datetime.';
    END IF;
END$$


-- ---------------------------------------------------------------------
-- Trigger (c): trg_student_tasks_after_insert
-- AFTER INSERT ON STUDENT_TASKS
-- Automatically re-computes workload analysis and re-evaluates collision
-- risks for the student whenever a new task is assigned.
-- (Protected from recursion because sp_calculate_workload & sp_detect_collisions
--  do not perform INSERTs into STUDENT_TASKS).
-- ---------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_student_tasks_after_insert$$

CREATE TRIGGER trg_student_tasks_after_insert
AFTER INSERT ON STUDENT_TASKS
FOR EACH ROW
BEGIN
    -- Only evaluate if not explicitly suppressed during bulk maintenance
    IF @DISABLE_TRIGGERS IS NULL OR @DISABLE_TRIGGERS = 0 THEN
        CALL sp_calculate_workload(NEW.student_id, NOW(), DATE_ADD(NOW(), INTERVAL 14 DAY));
        CALL sp_detect_collisions(NEW.student_id);
    END IF;
END$$

DELIMITER ;

