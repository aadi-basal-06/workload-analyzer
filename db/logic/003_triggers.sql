-- =====================================================================
-- 003_triggers.sql: Database Triggers for Integrity & Workload Sync (PostgreSQL)
-- =====================================================================

-- ---------------------------------------------------------------------
-- Trigger 1: trg_prevent_circular_dependencies
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_prevent_circular_dependencies()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_cycle_detected INT := 0;
BEGIN
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
        RAISE EXCEPTION 'Circular dependency detected: Prerequisite chain cannot form a cycle (SQLSTATE 45000)';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_circular_dependencies ON TASK_DEPENDENCIES;
CREATE TRIGGER trg_prevent_circular_dependencies
BEFORE INSERT ON TASK_DEPENDENCIES
FOR EACH ROW
EXECUTE FUNCTION fn_prevent_circular_dependencies();

-- ---------------------------------------------------------------------
-- Trigger 2: trg_tasks_deadline_check (Insert & Update)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_tasks_deadline_check()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.release_datetime IS NOT NULL AND NEW.deadline_datetime <= NEW.release_datetime THEN
        RAISE EXCEPTION 'Invalid task dates: deadline_datetime must be strictly after release_datetime (SQLSTATE 45000)';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tasks_deadline_check_insert ON TASKS;
CREATE TRIGGER trg_tasks_deadline_check_insert
BEFORE INSERT ON TASKS
FOR EACH ROW
EXECUTE FUNCTION fn_tasks_deadline_check();

DROP TRIGGER IF EXISTS trg_tasks_deadline_check_update ON TASKS;
CREATE TRIGGER trg_tasks_deadline_check_update
BEFORE UPDATE ON TASKS
FOR EACH ROW
EXECUTE FUNCTION fn_tasks_deadline_check();

-- ---------------------------------------------------------------------
-- Trigger 3: trg_student_tasks_after_insert
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_student_tasks_after_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    CALL sp_calculate_workload(NEW.student_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '14 days');
    CALL sp_detect_collisions(NEW.student_id);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_student_tasks_after_insert ON STUDENT_TASKS;
CREATE TRIGGER trg_student_tasks_after_insert
AFTER INSERT ON STUDENT_TASKS
FOR EACH ROW
EXECUTE FUNCTION fn_student_tasks_after_insert();
