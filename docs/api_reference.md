# RESTful API Reference

Base URL: `http://localhost:5001/api`

Standard Response Structure:
```json
{
  "success": true,
  "data": { ... },
  "message": "Human-readable status"
}
```

Standard Error Structure:
```json
{
  "success": false,
  "error": "ErrorType",
  "message": "Descriptive message",
  "details": [ ... ]
}
```

---

## 1. Authentication (`/api/auth`)

| Method | Endpoint | Description | Protected |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register new student, faculty, or admin user | Public |
| `POST` | `/api/auth/login` | Authenticate with email/password; returns JWT | Public |
| `GET` | `/api/auth/me` | Fetch authenticated user profile & student metadata | JWT |

---

## 2. Student Endpoints (`/api/student`)
*Requires `Authorization: Bearer <token>` with `role=student`*

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/student/profile` | Retrieve student profile (roll no, semester, advisor) |
| `PUT` | `/api/student/profile` | Update student profile fields |
| `GET` | `/api/student/availability` | List logged study availability blocks |
| `POST` | `/api/student/availability` | Log availability block (validates non-overlap and end > start) |
| `PUT` | `/api/student/availability/:id` | Update availability block (validates non-overlap) |
| `DELETE` | `/api/student/availability/:id` | Delete availability block |
| `GET` | `/api/student/tasks` | List assigned coursework with progress & overdue status |
| `PATCH` | `/api/student/tasks/:id/progress`| Update actual hours spent & completion percentage |
| `POST` | `/api/student/tasks/:id/submit` | Mark task as completed with final actual hours |
| `GET` | `/api/student/workload` *(alias: `/api/student/workload/current`)* | Runs `sp_calculate_workload` and returns 5 pressures & history |
| `POST` | `/api/student/workload/calculate` | Recalculate student workload analysis |
| `GET` | `/api/student/collisions` | Runs `sp_detect_collisions` and returns collisions |
| `PATCH` | `/api/student/collisions/:id/resolve` | Mark collision alert as resolved |

---

## 3. Faculty Endpoints (`/api/faculty`)
*Requires `Authorization: Bearer <token>` with `role=faculty` or `admin`*

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/faculty/courses` | List courses taught by authenticated faculty |
| `POST` | `/api/faculty/courses` | Create new course offering |
| `GET` | `/api/faculty/courses/:id` | Get course details |
| `PUT` | `/api/faculty/courses/:id` | Update course parameters |
| `DELETE` | `/api/faculty/courses/:id` | Delete course and cascade dependent tasks |
| `GET` | `/api/faculty/tasks` | List tasks in faculty courses (supports `?course_id=`) |
| `POST` | `/api/faculty/tasks` | Create task and auto-assigns via `sp_assign_task_to_students` |
| `GET` | `/api/faculty/tasks/:id` | Get task details with prerequisite dependencies |
| `PUT` | `/api/faculty/tasks/:id` | Update task fields |
| `DELETE` | `/api/faculty/tasks/:id` | Delete task |
| `POST` | `/api/faculty/tasks/:id/dependencies` | Add prerequisite (blocked by trigger if circular) |
| `DELETE` | `/api/faculty/tasks/:id/dependencies/:prereqId` | Remove prerequisite dependency |
| `GET` | `/api/faculty/tasks/:id/students` | Get enrolled student roster with progress & hours |
| `POST` | `/api/faculty/simulations` *(alias: `/api/faculty/simulator/run`)* | Runs `sp_simulate_deadline_change` |
| `GET` | `/api/faculty/simulations` *(alias: `/api/faculty/simulator/history`)* | Retrieve simulation audit log |
| `GET` | `/api/faculty/courses/:id/risk-summary` | Aggregated course risk view and student list |

