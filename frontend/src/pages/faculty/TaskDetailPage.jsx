// =====================================================================
// TaskDetailPage.jsx: Task Inspection, Student Roster & Dependencies
// =====================================================================

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../api/client';

export default function TaskDetailPage() {
  const { id } = useParams();
  const [task, setTask] = useState(null);
  const [students, setStudents] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Dependency add state
  const [selectedPrereq, setSelectedPrereq] = useState('');
  const [addingPrereq, setAddingPrereq] = useState(false);

  const fetchTaskDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const [taskRes, studentsRes, allTasksRes] = await Promise.all([
        api.get(`/faculty/tasks/${id}`),
        api.get(`/faculty/tasks/${id}/students`),
        api.get('/faculty/tasks')
      ]);
      setTask(taskRes);
      setStudents(studentsRes || []);
      setAllTasks(allTasksRes || []);
    } catch (err) {
      setError(err.message || 'Failed to load task details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaskDetails();
  }, [id]);

  const handleAddDependency = async (e) => {
    e.preventDefault();
    if (!selectedPrereq) return;
    setAddingPrereq(true);
    try {
      await api.post(`/faculty/tasks/${id}/dependencies`, {
        prerequisite_task_id: Number(selectedPrereq),
        dependency_type: 'hard_prerequisite'
      });
      setSelectedPrereq('');
      fetchTaskDetails();
    } catch (err) {
      alert(`Dependency rejected by database: ${err.message}`);
    } finally {
      setAddingPrereq(false);
    }
  };

  const handleDeleteDependency = async (prereqId) => {
    if (!window.confirm('Remove this prerequisite dependency?')) return;
    try {
      await api.delete(`/faculty/tasks/${id}/dependencies/${prereqId}`);
      fetchTaskDetails();
    } catch (err) {
      alert(`Could not remove dependency: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p>Loading task specification & student cohort progress...</p>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="card empty-state">
        <h3>Task not found</h3>
        <Link to="/faculty/tasks" className="btn btn-primary" style={{ marginTop: '1rem' }}>
          Back to Tasks
        </Link>
      </div>
    );
  }

  const eligiblePrereqs = allTasks.filter(
    (t) => String(t.task_id) !== String(id) && !task.prerequisites?.some(p => String(p.prerequisite_task_id) === String(t.task_id))
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <Link to="/faculty/tasks" style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '0.85rem' }}>
              ← Back to Tasks
            </Link>
            <span style={{ color: 'var(--text-muted)' }}>/</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>{task.course_code}</span>
          </div>
          <h1 className="page-title">{task.title}</h1>
          <p className="page-subtitle">{task.course_name} • Semester {task.semester}</p>
        </div>

        <Link to={`/faculty/simulator?taskId=${task.task_id}`} className="btn btn-primary">
          ⚡ Simulate Deadline Shift
        </Link>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* Task Specification Card */}
      <div className="card" style={{ marginBottom: '1.75rem' }}>
        <div className="card-title">Task Specification & Calibration Parameters</div>

        <div className="grid-cols-4" style={{ marginBottom: '1.25rem' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>DEADLINE</span>
            <div style={{ fontWeight: 800, fontSize: '1rem' }}>
              {new Date(task.deadline_datetime).toLocaleDateString()}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {new Date(task.deadline_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>ESTIMATED HOURS</span>
            <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--primary)' }}>
              {task.estimated_hours} Hours
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>COMPLEXITY</span>
            <div style={{ fontWeight: 700 }}>
              Difficulty: {task.difficulty_level}/5 • Cognitive: {task.cognitive_load}/10
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>GRADE IMPACT</span>
            <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--success)' }}>
              {task.assessment_weight}% Weight
            </div>
          </div>
        </div>

        {task.description && (
          <div style={{ padding: '0.85rem 1rem', background: '#f8fafc', borderRadius: '8px', fontSize: '0.9rem', color: 'var(--text-main)', border: '1px solid var(--border)' }}>
            <strong>Deliverable Brief:</strong> {task.description}
          </div>
        )}
      </div>

      {/* Prerequisite Dependencies Section */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div className="card-title">
          <span>🔗 Prerequisite Task Dependencies</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Enforces logical task ordering & detects circular bottlenecks</span>
        </div>

        {task.prerequisites?.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
            {task.prerequisites.map((p) => (
              <div
                key={p.dependency_id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  background: '#f8fafc',
                  border: '1px solid var(--border)',
                  borderRadius: '6px'
                }}
              >
                <div>
                  <strong>{p.prerequisite_title}</strong>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '1rem' }}>
                    Due: {new Date(p.prerequisite_deadline).toLocaleDateString()}
                  </span>
                  <span className="role-tag faculty" style={{ marginLeft: '0.75rem' }}>
                    {p.dependency_type}
                  </span>
                </div>
                <button
                  onClick={() => handleDeleteDependency(p.prerequisite_task_id)}
                  className="btn btn-danger btn-sm"
                >
                  Remove Prerequisite
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
            No prerequisite tasks configured. This task has no preliminary dependencies.
          </p>
        )}

        {/* Add Prerequisite Form */}
        <form onSubmit={handleAddDependency} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <select
            className="form-select"
            value={selectedPrereq}
            onChange={(e) => setSelectedPrereq(e.target.value)}
            style={{ maxWidth: '400px' }}
            required
          >
            <option value="">Select prerequisite task...</option>
            {eligiblePrereqs.map((t) => (
              <option key={t.task_id} value={t.task_id}>
                {t.course_code}: {t.title}
              </option>
            ))}
          </select>

          <button type="submit" className="btn btn-secondary" disabled={addingPrereq || !selectedPrereq}>
            {addingPrereq ? 'Validating Tree...' : '+ Add Prerequisite'}
          </button>
        </form>
        <div className="form-help" style={{ marginTop: '0.5rem' }}>
          Verified by MySQL BEFORE INSERT trigger: Circular chains (A → B → A) are automatically rejected.
        </div>
      </div>

      {/* Assigned Students Roster */}
      <div className="card">
        <div className="card-title">
          <span>👥 Enrolled Student Cohort Roster ({students.length})</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Assigned via sp_assign_task_to_students</span>
        </div>

        {students.length === 0 ? (
          <div className="empty-state">
            <p>No students enrolled in Semester {task.semester}.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Roll Number</th>
                  <th>Student Name</th>
                  <th>Section</th>
                  <th>Actual Hours</th>
                  <th>Progress</th>
                  <th>Status</th>
                  <th>Submitted At</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.student_task_id}>
                    <td><strong>{s.roll_no}</strong></td>
                    <td>
                      <div>{s.student_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.student_email}</div>
                    </td>
                    <td>Section {s.section}</td>
                    <td>{s.actual_hours}h</td>
                    <td style={{ minWidth: '150px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.2rem' }}>
                        <span>{Number(s.completion_percentage).toFixed(0)}%</span>
                      </div>
                      <div className="progress-bar-container">
                        <div
                          className={`progress-bar-fill ${Number(s.completion_percentage) >= 100 ? 'completed' : ''}`}
                          style={{ width: `${s.completion_percentage}%` }}
                        ></div>
                      </div>
                    </td>
                    <td>
                      <span className={`severity-pill ${s.status === 'completed' ? 'LOW' : 'MEDIUM'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td>
                      {s.submitted_at ? new Date(s.submitted_at).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

