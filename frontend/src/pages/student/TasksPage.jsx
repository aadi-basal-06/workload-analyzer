// =====================================================================
// TasksPage.jsx: Student Tasks List, Progress Updater & Submissions
// =====================================================================

import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [editingTask, setEditingTask] = useState(null);
  const [actualHours, setActualHours] = useState('');
  const [completion, setCompletion] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get('/student/tasks');
      setTasks(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const openUpdateModal = (task) => {
    setEditingTask(task);
    setCompletion(Number(task.completion_percentage || 0));
    setActualHours(task.actual_hours || '');
  };

  const closeUpdateModal = () => {
    setEditingTask(null);
  };

  const handleSaveProgress = async (e) => {
    e.preventDefault();
    if (!editingTask) return;
    setSubmitting(true);
    try {
      await api.patch(`/student/tasks/${editingTask.student_task_id}/progress`, {
        actual_hours: Number(actualHours) || 0,
        completion_percentage: Number(completion)
      });
      closeUpdateModal();
      fetchTasks();
    } catch (err) {
      alert(`Update failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitTask = async (studentTaskId) => {
    if (!window.confirm('Are you sure you want to mark this task as complete and submit?')) {
      return;
    }
    try {
      await api.post(`/student/tasks/${studentTaskId}/submit`, { actual_hours: 5 });
      fetchTasks();
    } catch (err) {
      alert(`Submission failed: ${err.message}`);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'all') return true;
    if (filter === 'in_progress') return t.submission_status === 'in_progress' || (t.completion_percentage > 0 && t.completion_percentage < 100);
    if (filter === 'completed') return t.submission_status === 'completed' || t.completion_percentage >= 100;
    if (filter === 'assigned') return t.submission_status === 'assigned' && t.completion_percentage == 0;
    if (filter === 'overdue') return Boolean(t.is_overdue);
    return true;
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">My Assigned Tasks</h1>
          <p className="page-subtitle">Track academic deliverables, log hours, and update progress</p>
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {['all', 'assigned', 'in_progress', 'completed', 'overdue'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
              style={{ textTransform: 'capitalize' }}
            >
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading course assignments...</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">📋</div>
          <p>No tasks match the selected filter.</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Course</th>
                <th>Task Title</th>
                <th>Deadline</th>
                <th>Workload</th>
                <th>Weight</th>
                <th>Progress</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((t) => (
                <tr key={t.student_task_id}>
                  <td>
                    <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.85rem' }}>
                      {t.course_code}
                    </span>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {t.course_name}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{t.task_title}</div>
                    <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', maxWidth: '280px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {t.task_description}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>
                      {new Date(t.deadline_datetime).toLocaleDateString()}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: t.is_overdue ? 'var(--danger)' : 'var(--text-muted)' }}>
                      {t.is_overdue ? '⚠️ Overdue' : `${t.hours_until_deadline}h remaining`}
                    </div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600 }}>{t.estimated_hours}h</span>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Diff: {t.difficulty_level}/5 • Cog: {t.cognitive_load}/10
                    </div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 700 }}>{t.assessment_weight}%</span>
                  </td>
                  <td style={{ minWidth: '140px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.2rem' }}>
                      <span>{Number(t.completion_percentage).toFixed(0)}%</span>
                      <span>{t.actual_hours}h spent</span>
                    </div>
                    <div className="progress-bar-container">
                      <div
                        className={`progress-bar-fill ${Number(t.completion_percentage) >= 100 ? 'completed' : ''}`}
                        style={{ width: `${t.completion_percentage}%` }}
                      ></div>
                    </div>
                  </td>
                  <td>
                    <span className={`severity-pill ${t.submission_status === 'completed' ? 'LOW' : t.is_overdue ? 'HIGH' : 'MEDIUM'}`}>
                      {t.submission_status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button
                        onClick={() => openUpdateModal(t)}
                        className="btn btn-secondary btn-sm"
                        title="Update study progress"
                      >
                        Update
                      </button>
                      {t.submission_status !== 'completed' && Number(t.completion_percentage) < 100 && (
                        <button
                          onClick={() => handleSubmitTask(t.student_task_id)}
                          className="btn btn-primary btn-sm"
                          title="Submit and mark complete"
                        >
                          Submit
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Progress Update Modal */}
      {editingTask && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Update Task Progress</h3>
              <button onClick={closeUpdateModal} className="modal-close">&times;</button>
            </div>

            <div style={{ marginBottom: '1.25rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '6px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{editingTask.task_title}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {editingTask.course_code} • Estimated: {editingTask.estimated_hours}h • Deadline: {new Date(editingTask.deadline_datetime).toLocaleString()}
              </div>
            </div>

            <form onSubmit={handleSaveProgress}>
              <div className="form-group">
                <label className="form-label">
                  Completion Percentage: <strong>{completion}%</strong>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  className="form-input"
                  value={completion}
                  onChange={(e) => setCompletion(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Actual Hours Spent So Far</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  className="form-input"
                  value={actualHours}
                  onChange={(e) => setActualHours(e.target.value)}
                  placeholder="e.g. 4.5"
                  required
                />
                <div className="form-help">
                  Updating logged hours dynamically recalibrates your workload pressure and overall risk score.
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={closeUpdateModal} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save & Recalculate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

