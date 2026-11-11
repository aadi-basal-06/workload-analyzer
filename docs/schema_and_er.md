# Database Schema & Entity-Relationship Architecture

## Relational Schema Diagram

```mermaid
erDiagram
    USERS ||--o| STUDENTS : "extends profile (1:1)"
    USERS ||--o{ COURSES : "teaches (faculty)"
    USERS ||--o{ SIMULATIONS : "runs (faculty)"
    STUDENTS ||--o{ AVAILABILITY : "logs availability"
    STUDENTS ||--o{ WORKLOAD_ANALYSIS : "receives assessment"
    STUDENTS ||--o{ STUDENT_TASKS : "assigned to"
    STUDENTS ||--o{ COLLISIONS : "experiences"
    COURSES ||--o{ TASKS : "contains"
    TASKS ||--o{ STUDENT_TASKS : "distributed to"
    TASKS ||--o{ TASK_DEPENDENCIES : "has prerequisites"
    TASKS ||--o{ SIMULATIONS : "evaluated in"
    WORKLOAD_ANALYSIS ||--o{ COLLISIONS : "references"

    USERS {
        int user_id PK
        string username UK
        string email UK
        string password_hash
        string role
        timestamp created_at
    }

    STUDENTS {
        int student_id PK
        int user_id FK
        string roll_no UK
        string program
        int semester
        string section
        int advisor_id FK
    }

    COURSES {
        int course_id PK
        string course_code UK
        string course_name
        int faculty_id FK
        int credits
        int semester
    }

    TASKS {
        int task_id PK
        int course_id FK
        string title
        text description
        string task_type
        datetime release_datetime
        datetime deadline_datetime
        decimal estimated_hours
        int difficulty_level
        int cognitive_load
        decimal assessment_weight
        boolean is_team_task
        string status
        timestamp created_at
    }

    AVAILABILITY {
        int availability_id PK
        int student_id FK
        datetime start_datetime
        datetime end_datetime
        decimal available_hours
        string availability_type
    }

    WORKLOAD_ANALYSIS {
        int analysis_id PK
        int student_id FK
        datetime start_datetime
        datetime end_datetime
        decimal total_estimated_hours
        decimal available_hours
        decimal temporal_pressure
        decimal workload_pressure
        decimal cognitive_pressure
        decimal assessment_pressure
        decimal dependency_pressure
        decimal overall_risk_score
        string risk_level
        timestamp calculated_at
    }

    STUDENT_TASKS {
        int student_task_id PK
        int student_id FK
        int task_id FK
        timestamp assigned_at
        string status
        decimal actual_hours
        decimal completion_percentage
        timestamp submitted_at
        decimal score
    }

    COLLISIONS {
        int collision_id PK
        int student_id FK
        int analysis_id FK
        string collision_type
        string severity
        text description
        timestamp detected_at
        boolean resolved
    }

    TASK_DEPENDENCIES {
        int dependency_id PK
        int task_id FK
        int prerequisite_task_id FK
        string dependency_type
    }

    SIMULATIONS {
        int simulation_id PK
        int faculty_id FK
        int task_id FK
        datetime original_deadline
        datetime proposed_deadline
        int affected_students
        decimal original_risk
        decimal projected_risk
        int original_collisions
        int projected_collisions
        decimal impact_score
        string recommendation
        timestamp created_at
    }
```

## Relational Design Decisions & Normalization

1. **Third Normal Form (3NF)**:
   - All transitive and partial dependencies have been removed.
   - User authentication and common credentials reside in `USERS`. Student specific attributes (`roll_no`, `program`, `semester`, `section`, `advisor_id`) are partitioned into `STUDENTS`.
2. **Implicit Semester-Based Enrollment**:
   - As per project specifications, a student is enrolled in a course if `STUDENTS.semester = COURSES.semester`. This eliminates unnecessary join overhead while matching realistic academic batch cohorts.
3. **Integrity Enforcement**:
   - Foreign key constraints ensure cascade deletes on dependent task entities and nullification on optional advisors.
   - Check constraints enforce valid roles (`student`, `faculty`, `admin`), bounded ratings (`difficulty_level BETWEEN 1 AND 5`), progress percentages (`completion_percentage BETWEEN 0 AND 100`), temporal validity (`end_datetime > start_datetime`), and non-reflexive task dependencies (`task_id <> prerequisite_task_id`).

