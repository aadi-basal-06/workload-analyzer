import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

DOC_PATH = "project_report/DBMS_MINI_PROJECT_REPORT.docx"
TXT_PATH = "project_report/DBMS_MINI_PROJECT_REPORT.txt"
SCREENSHOTS_DIR = "project_report/screenshots"

def create_report():
    doc = docx.Document()

    # Set standard margins (1 inch)
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(1)
        section.bottom_margin = Inches(1)
        section.left_margin = Inches(1)
        section.right_margin = Inches(1)

    # Style definitions
    styles = doc.styles
    normal_style = styles['Normal']
    normal_style.font.name = 'Times New Roman'
    normal_style.font.size = Pt(11)
    normal_style.font.color.rgb = RGBColor(0x1e, 0x29, 0x3b)

    # Helper functions
    def add_title(text, level=1):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(14)
        p.paragraph_format.space_after = Pt(6)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.bold = True
        run.font.name = 'Times New Roman'
        if level == 1:
            run.font.size = Pt(16)
            run.font.color.rgb = RGBColor(0x0f, 0x17, 0x2a)
        elif level == 2:
            run.font.size = Pt(13)
            run.font.color.rgb = RGBColor(0x1e, 0x3a, 0x8a)
        else:
            run.font.size = Pt(11.5)
            run.font.color.rgb = RGBColor(0x33, 0x41, 0x55)
        return p

    def add_p(text, bold_prefix="", italic=False):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.line_spacing = 1.15
        if bold_prefix:
            r_pre = p.add_run(bold_prefix + " ")
            r_pre.bold = True
            r_pre.font.name = 'Times New Roman'
        run = p.add_run(text)
        run.italic = italic
        run.font.name = 'Times New Roman'
        return p

    def add_image(img_rel_path, caption, width=Inches(6.0)):
        full_path = os.path.join(SCREENSHOTS_DIR, img_rel_path)
        if os.path.exists(full_path):
            p = doc.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.space_before = Pt(8)
            p.paragraph_format.space_after = Pt(2)
            p.add_run().add_picture(full_path, width=width)
            
            p_cap = doc.add_paragraph()
            p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_cap.paragraph_format.space_after = Pt(10)
            r_cap = p_cap.add_run("Figure: " + caption)
            r_cap.italic = True
            r_cap.font.size = Pt(9.5)
            r_cap.font.color.rgb = RGBColor(0x64, 0x74, 0x8b)
        else:
            print(f"Warning: Image not found: {full_path}")

    # =========================================================================
    # TITLE PAGE
    # =========================================================================
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("PES UNIVERSITY\nDEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING\nFACULTY OF ENGINEERING\n")
    r.bold = True
    r.font.size = Pt(13)
    p.paragraph_format.space_after = Pt(36)

    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_sub = p_title.add_run("Mini Project Report On\n")
    r_sub.font.size = Pt(12)
    r_main = p_title.add_run("STUDENT WORKLOAD AND DEADLINE COLLISION ANALYZER\nWITH WHAT-IF SIMULATION ENGINE & REDIS NOSQL CACHE\n")
    r_main.bold = True
    r_main.font.size = Pt(16)
    r_main.font.color.rgb = RGBColor(0x0f, 0x17, 0x2a)
    p_title.paragraph_format.space_after = Pt(30)

    p_course = doc.add_paragraph()
    p_course.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_c = p_course.add_run("Submitted in partial fulfilment of the requirements for the award of degree of\nBachelor of Technology in Computer Science & Engineering\nUE23CS351A – Database Management Systems Project\n")
    r_c.font.size = Pt(11)
    p_course.paragraph_format.space_after = Pt(36)

    p_by = doc.add_paragraph()
    p_by.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_by = p_by.add_run("Submitted by:\nAadi Basal (SRN: PES2UG23CS001, Roll No: CS2024-001)\n5th Semester, B.Tech CSE\n\nUnder the Guidance of:\nDr. Shilpa S\nAssistant Professor, Dept. of CSE\nPES University, Bengaluru\n\nAcademic Year: AUG - DEC 2026")
    r_by.font.size = Pt(11)

    doc.add_page_break()

    # =========================================================================
    # CERTIFICATE & DECLARATION
    # =========================================================================
    add_title("CERTIFICATE", level=1).alignment = WD_ALIGN_PARAGRAPH.CENTER
    add_p("This is to certify that the mini project entitled 'Student Workload and Deadline Collision Analyzer with What-If Simulation Engine' is a bonafide work carried out by Aadi Basal (SRN: PES2UG23CS001) in partial fulfilment for the completion of fifth semester DBMS Project (UE23CS351A) in the Program of Study - Bachelor of Technology in Computer Science and Engineering under the rules and regulations of PES University, Bengaluru during the period AUG 2026 – DEC 2026.")
    add_p("It is certified that all corrections and suggestions indicated for internal assessment have been incorporated in the report. The project has been approved as it satisfies the 5th semester academic requirements in respect of project work.\n\n")

    p_sig = doc.add_paragraph()
    p_sig.paragraph_format.space_before = Pt(36)
    p_sig.add_run("_____________________________                    _____________________________\nDr. Shilpa S                                      Dr. Sandesh B J\nAssistant Professor, Dept. of CSE                 Professor & Chairperson, Dept. of CSE\nPES University, Bengaluru                         PES University, Bengaluru")

    doc.add_page_break()

    # =========================================================================
    # ABSTRACT
    # =========================================================================
    add_title("ABSTRACT", level=1).alignment = WD_ALIGN_PARAGRAPH.CENTER
    add_p("In modern academic curricula, undergraduate students face uncoordinated deadline assignments across diverse courses, resulting in severe temporal clustering, chronic sleep deprivation, and compromised learning outcomes. This project presents the Student Workload and Deadline Collision Analyzer, an end-to-end full-stack database application designed to evaluate, detect, and resolve academic burnout risks across university cohorts.")
    add_p("The system is architected around a dual-database model: PostgreSQL 15+ serves as the primary ACID relational source of truth, managing strict referential integrity, relational views, stored procedures for mathematical workload modeling, and trigger integrity constraints. Redis 7 serves as a high-performance in-memory NoSQL database, delivering sub-millisecond workload analysis caching via version-based O(1) invalidation and real-time student deadline priority queues via Redis Sorted Sets (ZSET).")
    add_p("Key features include a 5-dimensional workload scoring engine (temporal, volume, cognitive, assessment, and dependency pressures), automated deadline collision clustering (<=48-hour proximity), a What-If Deadline Shift Simulation Engine that projects cohort risk deltas before faculty announce deadline changes, and Apple-grade responsive interactive visualization dashboards built with React 18, Vite, and Recharts.")

    doc.add_page_break()

    # =========================================================================
    # CHAPTER 1 & 2: INTRODUCTION & PROBLEM DEFINITION
    # =========================================================================
    add_title("1. INTRODUCTION", level=1)
    add_p("Higher education systems frequently suffer from uncoordinated coursework scheduling. Multiple professors independently assign major deliverables—such as semester projects, midterms, lab reports, and assignments—without visibility into peer courses. This leads to deadline collisions, where multiple rigorous milestones coincide on identical dates or tight calendar windows.")
    add_p("The Student Workload and Deadline Collision Analyzer addresses this systemic institutional blind spot. By creating a unified relational foundation, faculty gain cross-course visibility and automated impact projections, while students receive proactive workload risk diagnostics, deadline prioritization, and personalized capacity planning.")

    add_title("2. PROBLEM DEFINITION", level=1)
    add_p("Traditional LMS platforms (Canvas, Blackboard, Moodle) operate as passive task repositories. They lack mathematical models capable of assessing student time capacity against cumulative cognitive demands.")
    add_p("Specifically, traditional platforms exhibit the following critical limitations:")
    add_p("• Siloed Course Management: Instructors have zero insight into concurrent task deadlines across other registered courses.", bold_prefix="1.")
    add_p("• Static Deadlines: No simulation capability exists to preview how shifting a deadline will affect cohort stress or induce new collisions.", bold_prefix="2.")
    add_p("• Lack of Workload Modeling: Inability to account for prerequisite task dependencies (DAGs) and individual student study availability.", bold_prefix="3.")
    add_p("• Scalability Bottlenecks: Repeated calculation of multi-table analytical joins during high-traffic student portal dashboard requests.", bold_prefix="4.")

    doc.add_page_break()

    # =========================================================================
    # CHAPTER 3 & 4: ER MODEL & RELATIONAL MAPPING
    # =========================================================================
    add_title("3. ER MODEL", level=1)
    add_p("The conceptual schema consists of 10 strong and weak entity sets interconnected through 1:1, 1:N, and N:M relationships with integrity constraints:")
    add_p("• USERS: Core superclass entity containing user authentication credentials and roles ('student', 'faculty', 'admin').")
    add_p("• STUDENTS: Specialization entity referencing USERS (1:1), containing roll_no, program, semester, section, and faculty advisor.")
    add_p("• COURSES: Academic subjects offered by faculty instructors (1:N from USERS).")
    add_p("• TASKS: Course deliverables with deadlines, estimated hours, difficulty weights (1-5), and cognitive load ratings (1-10).")
    add_p("• STUDENT_TASKS: Associative entity mapping students to assigned tasks with individual completion percentages and actual logged hours.")
    add_p("• AVAILABILITY: Student time allocations specifying study blocks and dedicated academic hours.")
    add_p("• WORKLOAD_ANALYSIS: Analytical ledger capturing snapshot scores across the 5 workload pressure dimensions.")
    add_p("• COLLISIONS: Detected bottleneck clusters where multiple assignments fall within 48 hours.")
    add_p("• TASK_DEPENDENCIES: Directed Acyclic Graph (DAG) edges representing prerequisite milestone requirements.")
    add_p("• SIMULATIONS: Faculty simulation ledger capturing original vs. projected risk scores and automated approval recommendations.")

    add_title("4. ER TO RELATIONAL MAPPING", level=1)
    add_p("The ER schema is normalized to Boyce-Codd Normal Form (BCNF) through standard 7-step mapping:")
    add_p("Step 1: Regular Entity Sets -> Relational Tables (USERS, COURSES, TASKS).")
    add_p("Step 2: Weak Entity Sets -> Relational Tables with Composite FKs (STUDENTS with user_id cascade).")
    add_p("Step 3: 1:1 Relationships -> Foreign Key references with UNIQUE constraints.")
    add_p("Step 4: 1:N Relationships -> Foreign Keys placed in the N-side relation (e.g. TASKS.course_id -> COURSES.course_id).")
    add_p("Step 5: N:M Relationships -> Associative Relations (STUDENT_TASKS with composite unique key (student_id, task_id)).")
    add_p("Step 6: Multivalued Attributes -> Normalized separate relations (AVAILABILITY study slots).")
    add_p("Step 7: Self-Referencing Recursive Relationships -> Directed adjacency list (TASK_DEPENDENCIES with cycle-prevention triggers).")

    doc.add_page_break()

    # =========================================================================
    # CHAPTER 5: DDL STATEMENTS WITH SCREENSHOTS
    # =========================================================================
    add_title("5. DDL STATEMENTS", level=1)
    add_p("All tables are implemented in PostgreSQL 15+ using explicit SERIAL primary keys, TIMESTAMPTZ temporal precision, CHECK domain constraints, and ON DELETE CASCADE / SET NULL foreign key actions.")

    add_title("5.1 Database Relations Overview", level=2)
    add_image("01_ddl_table_creation/01_relations_list.png", "PostgreSQL 15 \\dt Database Relations")

    add_title("5.2 USERS Table Schema", level=2)
    add_image("01_ddl_table_creation/02_table_users.png", "USERS Table Schema & Constraints")

    add_title("5.3 STUDENTS Table Schema", level=2)
    add_image("01_ddl_table_creation/03_table_students.png", "STUDENTS Table Schema & Foreign Keys")

    add_title("5.4 COURSES Table Schema", level=2)
    add_image("01_ddl_table_creation/04_table_courses.png", "COURSES Table Schema & Credits Check")

    add_title("5.5 TASKS Table Schema", level=2)
    add_image("01_ddl_table_creation/05_table_tasks.png", "TASKS Table Schema & Cognitive Weights")

    add_title("5.6 STUDENT_TASKS Associative Table", level=2)
    add_image("01_ddl_table_creation/06_table_student_tasks.png", "STUDENT_TASKS Progress Schema")

    add_title("5.7 AVAILABILITY Table Schema", level=2)
    add_image("01_ddl_table_creation/07_table_availability.png", "AVAILABILITY Study Blocks Schema")

    add_title("5.8 WORKLOAD_ANALYSIS Table Schema", level=2)
    add_image("01_ddl_table_creation/08_table_workload_analysis.png", "WORKLOAD_ANALYSIS 5-D Metric Schema")

    add_title("5.9 COLLISIONS Table Schema", level=2)
    add_image("01_ddl_table_creation/09_table_collisions.png", "COLLISIONS Deadline Bottleneck Schema")

    add_title("5.10 TASK_DEPENDENCIES Table Schema", level=2)
    add_image("01_ddl_table_creation/10_table_task_dependencies.png", "TASK_DEPENDENCIES DAG Milestone Schema")

    add_title("5.11 SIMULATIONS Table Schema", level=2)
    add_image("01_ddl_table_creation/11_table_simulations.png", "SIMULATIONS What-If Ledger Schema")

    doc.add_page_break()

    # =========================================================================
    # CHAPTER 6: DML STATEMENTS WITH SCREENSHOTS
    # =========================================================================
    add_title("6. DML STATEMENTS", level=1)
    add_p("The database is seeded with representative academic data simulating real-world university workloads, active assignments, faculty course offerings, student study allocations, and cross-course milestone collisions.")

    add_title("6.1 User Authentication Accounts", level=2)
    add_image("02_dml_data_insertion/01_users_data.png", "DML: Seeded User Records")

    add_title("6.2 Student Academic Roster", level=2)
    add_image("02_dml_data_insertion/02_students_data.png", "DML: Seeded Students Records")

    add_title("6.3 Department Course Curriculum", level=2)
    add_image("02_dml_data_insertion/03_courses_data.png", "DML: Seeded University Courses")

    add_title("6.4 Course Tasks, Milestones and Deadlines", level=2)
    add_image("02_dml_data_insertion/04_tasks_data.png", "DML: Seeded Academic Tasks")

    add_title("6.5 Student Task Assignments & Completion Rates", level=2)
    add_image("02_dml_data_insertion/05_student_tasks_data.png", "DML: Student Task Progress Entries")

    add_title("6.6 Student Study Availability Allocations", level=2)
    add_image("02_dml_data_insertion/06_availability_data.png", "DML: Student Availability Study Blocks")

    doc.add_page_break()

    # =========================================================================
    # CHAPTER 7: SQL QUERIES WITH SCREENSHOTS
    # =========================================================================
    add_title("7. SQL QUERIES", level=1)
    add_p("The database supports advanced analytical querying covering relational aggregation, atomic state modification, cascaded deletions, correlated subqueries, and nested multi-table unions.")

    add_title("7.1 Simple Query with GROUP BY and Aggregate", level=2)
    add_p("Calculates total task volume, average estimated hours, and mean cognitive difficulty across academic courses.")
    add_image("03_sql_queries/01_query_groupby_aggregate.png", "Query 7.1: Aggregate & GROUP BY Execution")

    add_title("7.2 UPDATE Operation with RETURNING Clause", level=2)
    add_p("Updates a student's milestone completion percentage and logs actual completed hours.")
    add_image("03_sql_queries/02_query_update_operation.png", "Query 7.2: UPDATE Operation with RETURNING")

    add_title("7.3 DELETE Operation with RETURNING Clause", level=2)
    add_p("Atomically deletes an availability study block while retrieving deleted metadata.")
    add_image("03_sql_queries/03_query_delete_operation.png", "Query 7.3: DELETE Operation Execution")

    add_title("7.4 Correlated Subquery", level=2)
    add_p("Finds students whose composite workload score exceeds their respective section's average workload.")
    add_image("03_sql_queries/04_query_correlated_subquery.png", "Query 7.4: Correlated Subquery Execution")

    add_title("7.5 Nested Query with Set Operation (UNION)", level=2)
    add_p("Identifies assignments that are either currently assigned to students or carry a high cognitive load (>= 7).")
    add_image("03_sql_queries/05_query_nested_subquery.png", "Query 7.5: Nested Subquery with Set UNION")

    doc.add_page_break()

    # =========================================================================
    # CHAPTER 8: STORED PROCEDURES & TRIGGERS WITH SCREENSHOTS
    # =========================================================================
    add_title("8. STORED PROCEDURES AND TRIGGERS", level=1)
    add_p("Server-side PL/pgSQL routines enforce business logic, transactional integrity, and mathematical modeling directly inside the PostgreSQL database engine.")

    add_title("8.1 Stored Procedures", level=2)
    add_p("• sp_calculate_workload: Synthesizes temporal, volume, cognitive, assessment, and dependency pressures into an overall risk score (0-100).")
    add_image("04_procedures_and_triggers/01_sp_calculate_workload.png", "Procedure 8.1.1: 5-Dimensional Workload Calculation")

    add_p("• sp_simulate_deadline_change: Simulates the cohort impact of shifting a task deadline prior to publication.")
    add_image("04_procedures_and_triggers/02_sp_simulate_deadline_change.png", "Procedure 8.1.2: What-If Simulation Engine Execution")

    add_title("8.2 Triggers and Integrity Constraints", level=2)
    add_p("• fn_prevent_circular_dependencies: Executes a recursive CTE across TASK_DEPENDENCIES to detect and reject directed dependency cycles.")
    add_image("04_procedures_and_triggers/03_trigger_circular_dependency.png", "Trigger 8.2.1: Prevention of Circular DAG Dependencies")

    add_p("• fn_tasks_deadline_check: Enforces that task deadline_datetime must occur strictly after release_datetime.")
    add_image("04_procedures_and_triggers/04_trigger_deadline_validation.png", "Trigger 8.2.2: Temporal Deadline Validation Rule")

    doc.add_page_break()

    # =========================================================================
    # CHAPTER 9: FRONT END DEVELOPMENT WITH SCREENSHOTS
    # =========================================================================
    add_title("9. FRONT END DEVELOPMENT", level=1)
    add_p("The client interface is crafted using React 18, Vite, and Recharts, adhering to Apple Human Interface Guidelines with dark glassmorphism styling, responsive layouts, and live real-time metrics.")

    add_title("9.1 Authentication & Quick Persona Selector", level=2)
    add_image("05_frontend_development/01_login_page.png", "Figure 9.1: Universal Authentication Interface")

    add_title("9.2 Student Workload Dashboard & Redis Priority Queue", level=2)
    add_image("05_frontend_development/02_student_dashboard.png", "Figure 9.2: Student Dashboard & 5-D Workload Risk Gauge")

    add_title("9.3 Student Workload Analytics Breakdown", level=2)
    add_image("05_frontend_development/03_student_workload_analytics.png", "Figure 9.3: Detailed Workload Pressure Analytics")

    add_title("9.4 Assigned Tasks Management & Progress Tracking", level=2)
    add_image("05_frontend_development/04_student_tasks.png", "Figure 9.4: Student Task Progress & Submission Manager")

    add_title("9.5 Student Study Availability Planner", level=2)
    add_image("05_frontend_development/05_student_availability.png", "Figure 9.5: Student Availability & Study Block Planner")

    add_title("9.6 Deadline Collisions Matrix & Heatmap", level=2)
    add_image("05_frontend_development/06_student_collisions.png", "Figure 9.6: Cross-Course Deadline Collision Matrix")

    add_title("9.7 Faculty Course Risk Summary Dashboard", level=2)
    add_image("05_frontend_development/07_faculty_dashboard.png", "Figure 9.7: Faculty Dashboard & High-Risk Cohort Overview")

    add_title("9.8 Faculty What-If Deadline Shift Simulator", level=2)
    add_image("05_frontend_development/08_faculty_what_if_simulator.png", "Figure 9.8: Real-Time What-If Simulation Engine")

    add_title("9.9 Historical Simulation Audit Ledger", level=2)
    add_image("05_frontend_development/09_faculty_simulation_history.png", "Figure 9.9: Faculty Simulation Ledger & History")

    add_title("9.10 Department Course Management", level=2)
    add_image("05_frontend_development/10_faculty_courses.png", "Figure 9.10: Faculty Course Offerings Overview")

    doc.add_page_break()

    # =========================================================================
    # CHAPTER 10: REDIS NOSQL CACHE & PRIORITY QUEUE
    # =========================================================================
    add_title("10. REDIS NOSQL CACHE & PRIORITY QUEUE", level=1)
    add_p("Redis 7 is integrated alongside PostgreSQL to accelerate dashboard delivery and maintain real-time priority queues.")

    add_title("10.1 Active Namespaced Redis Keys", level=2)
    add_p("Keys are isolated by namespace: workload-analyzer:v1:workload:student:<id> and workload-analyzer:v1:deadlines:student:<id>.")
    add_image("06_redis_nosql_cache/01_redis_active_keys.png", "Figure 10.1: Namespaced Redis Cache & Sorted Set Keys")

    add_title("10.2 Redis Sorted Set Priority Queue (ZSET)", level=2)
    add_p("Deadlines are indexed as Unix epoch millisecond scores for O(log(N)) nearest deadline retrieval.")
    add_image("06_redis_nosql_cache/02_redis_sorted_set_deadlines.png", "Figure 10.2: Redis Sorted Set Priority Deadlines Queue")

    add_title("10.3 Version-Based O(1) Cache Invalidation", level=2)
    add_p("Per-student version keys increment upon any data modification, invalidating cached entries without slow KEYS scans.")
    add_image("06_redis_nosql_cache/03_redis_version_invalidation_key.png", "Figure 10.3: Redis Per-Student Version Invalidation Key")

    doc.add_page_break()

    # =========================================================================
    # REFERENCES & APPENDIX
    # =========================================================================
    add_title("REFERENCES", level=1)
    add_p("[1] PostgreSQL Global Development Group. 'PostgreSQL 15 Documentation: PL/pgSQL & Constraints', 2024.")
    add_p("[2] Redis Ltd. 'Redis Documentation: Sorted Sets & Cache Invalidation Patterns', 2024.")
    add_p("[3] Elmasri, R., & Navathe, S. B. 'Fundamentals of Database Systems', 7th Edition, Pearson, 2016.")
    add_p("[4] React & Vite Documentation: 'Optimizing Single-Page Application Performance with In-Memory State', 2024.")
    add_p("[5] GitHub Repository: https://github.com/aadi-basal-06/DBMS_MP")

    doc.save(DOC_PATH)
    print(f"🎉 Successfully created Word document report at: {DOC_PATH}")

if __name__ == "__main__":
    create_report()
