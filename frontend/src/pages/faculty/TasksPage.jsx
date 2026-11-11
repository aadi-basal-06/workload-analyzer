// =====================================================================
// TasksPage.jsx: Faculty Task Management & Cohort Assignment
// =====================================================================

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';

export default function FacultyTasksPage() {
  const [tasks, setTasks] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [courseId, setCourseId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [taskType, setTaskType] = useState('assignment');
  const [releaseDatetime, setReleaseDatetime] = useState('');
  const [deadlineDatetime, setDeadlineDatetime] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('8.0');
  const [difficultyLevel, setDifficultyLevel] = useState(3);
  const [cognitiveLoad, setCognitiveLoad] = useState(6);
  const [assessmentWeight, setAssessmentWeight] = useState('15.0');
  const [isTeamTask, setIsTeamTask] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [tasksRes, coursesRes] = await Promise.all([
        api.get('/faculty/tasks'),
        api.get('/faculty/courses')
      ]);
      setTasks(tasksRes || []);
      setCourses(coursesRes || []);
      if (coursesRes?.length > 0 && !courseId) {
        setCourseId(coursesRes[0].course_id);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    const now = new Date();
    const releaseStr = now.toISOString().slice(0, 16);
    const deadline = new Date(now.getTime() + 7 * 24 * 3600 * 1000);
    const deadlineStr = deadline.toISOString().slice(0, 16);

    setReleaseDatetime(releaseStr);
    setDeadlineDatetime(deadlineStr);
    setTitle('');
    setDescription('');
    setShowModal(true);
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/faculty/tasks', {
        course_id: Number(courseId),
        title: title.trim(),
        description: description.trim(),
        task_type: taskType,
        release_datetime: releaseDatetime.replace('T', ' ') + ':00',
        deadline_datetime: deadlineDatetime.replace('T', ' ') + ':00',
        estimated_hours: parseFloat(estimatedHours),
        difficulty_level: parseInt(difficultyLevel, 10),
        cognitive_load: parseInt(cognitiveLoad, 10),
        assessment_weight: parseFloat(assessmentWeight),
        is_team_task: isTeamTask
      });
      setShowModal(false);
      fetchData();
    } catch (err) {
      alert(`Task creation failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTask = async (id, taskTitle) => {
    if (!window.confirm(`Delete task "${taskTitle}"? All student submission records will be purged.`)) {
      return;
    }
    try {
      await api.delete(`/faculty/tasks/${id}`);
      fetchData();
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const displayedTasks = selectedCourse
    ? tasks.filter(t => String(t.course_id) === String(selectedCourse))
    : tasks;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Curriculum Tasks & Deadlines</h1>
          <p className="page-subtitle">Schedule coursework, calibrate cognitive weights, and inspect cohort submissions</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <select
            className="form-select"
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            style={{ width: 'auto' }}
          >
            <option value="">All Courses ({tasks.length})</option>
            {courses.map(c => (
              <option key={c.course_id} value={c.course_id}>
                {c.course_code}: {c.course_name}
              </option>
            ))}
          </select>

          <button onClick={openCreateModal} className="btn btn-primary">
            + Schedule New Task
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading course tasks...</p>
        </div>
      ) : displayedTasks.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">📝</div>
          <h3>No tasks scheduled for this selection</h3>
          <p style={{ margin: '0.5rem 0 1rem' }}>Add a new assignment or exam to assign to students.</p>
          <button onClick={openCreateModal} className="btn btn-primary">
            Create First Task
          </button>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Course</th>
                <th>Title</th>
                <th>Type</th>
                <th>Deadline</th>
                <th>Estimated</th>
                <th>Complexity</th>
                <th>Weight</th>
                <th>Enrolled</th>
                <th>Avg Progress</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedTasks.map((t) => (
                <tr key={t.task_id}>
                  <td>
                    <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.85rem' }}>
                      {t.course_code}
                    </span>
                  </td>
                  <td>
                    <Link to={`/faculty/tasks/${t.task_id}`} style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                      {t.title}
                    </Link>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.description || 'No description provided'}
                    </div>
                  </td>
                  <td>
                    <span className="role-tag student" style={{ textTransform: 'capitalize' }}>
                      {t.task_type}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                      {new Date(t.deadline_datetime).toLocaleDateString()}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(t.deadline_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td>{t.estimated_hours}h</td>
                  <td>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                      D:{t.difficulty_level}/5 • C:{t.cognitive_load}/10
                    </span>
                  </td>
                  <td><strong>{t.assessment_weight}%</strong></td>
                  <td>{t.assigned_students} students</td>
                  <td style={{ minWidth: '120px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.2rem' }}>
                      {t.avg_completion_percentage}%
                    </div>
                    <div className="progress-bar-container">
                      <div className="progress-bar-fill" style={{ width: `${t.avg_completion_percentage}%` }}></div>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <Link to={`/faculty/tasks/${t.task_id}`} className="btn btn-secondary btn-sm">
                        Inspect
                      </Link>
                      <button
                        onClick={() => handleDeleteTask(t.task_id, t.title)}
                        className="btn btn-danger btn-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Task Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Schedule New Course Task</h3>
              <button onClick={() => setShowModal(false)} className="modal-close">&times;</button>
            </div>

            <form onSubmit={handleCreateTask}>
              <div className="grid-cols-2">
                <div className="form-group">
                  <label className="form-label">Course</label>
                  <select
                    className="form-select"
                    value={courseId}
                    onChange={(e) => setCourseId(e.target.value)}
                    required
                  >
                    {courses.map(c => (
                      <option key={c.course_id} value={c.course_id}>
                        {c.course_code}: {c.course_name} (Sem {c.semester})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Task Type</label>
                  <select
                    className="form-select"
                    value={taskType}
                    onChange={(e) => setTaskType(e.target.value)}
                  >
                    <option value="assignment">Assignment</option>
                    <option value="project">Course Project</option>
                    <option value="exam">Midterm / Final Exam</option>
                    <option value="lab">Coding Lab</option>
                    <option value="report">Research Report</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Task Title</label>
                <input
                  type="text"
                  className="form-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Milestone 3: B-Tree Index Optimization"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description / Instructions</label>
                <textarea
                  className="form-textarea"
                  rows="2"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Specify task deliverables and expectations..."
                ></textarea>
              </div>

              <div className="grid-cols-2">
                <div className="form-group">
                  <label className="form-label">Release Datetime</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={releaseDatetime}
                    onChange={(e) => setReleaseDatetime(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Deadline Datetime</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={deadlineDatetime}
                    onChange={(e) => setDeadlineDatetime(e.target.value)}
                    required
                  />
                  <div className="form-help">Trigger requires deadline &gt; release date.</div>
                </div>
              </div>

              <div className="grid-cols-3">
                <div className="form-group">
                  <label className="form-label">Estimated Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    className="form-input"
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Difficulty (1-5)</label>
                  <select
                    className="form-select"
                    value={difficultyLevel}
                    onChange={(e) => setDifficultyLevel(e.target.value)}
                  >
                    {[1, 2, 3, 4, 5].map(d => (
                      <option key={d} value={d}>{d} - {d === 1 ? 'Beginner' : d === 5 ? 'Mastery' : 'Intermediate'}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Cognitive (1-10)</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    className="form-input"
                    value={cognitiveLoad}
                    onChange={(e) => setCognitiveLoad(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid-cols-2" style={{ alignItems: 'center' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Assessment Weight (%)</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    className="form-input"
                    value={assessmentWeight}
                    onChange={(e) => setAssessmentWeight(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.25rem' }}>
                  <input
                    type="checkbox"
                    id="teamTaskCheck"
                    checked={isTeamTask}
                    onChange={(e) => setIsTeamTask(e.target.checked)}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <label htmlFor="teamTaskCheck" style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                    Collaborative Team Task
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.75rem' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Creating & Enrolling Cohort...' : 'Create & Auto-Assign Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

