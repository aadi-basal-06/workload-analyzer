// =====================================================================
// CoursesPage.jsx: Faculty Course Management & Cohort Risk Inspection
// =====================================================================

import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import RiskBadge from '../../components/RiskBadge';

export default function CoursesPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRiskCourse, setSelectedRiskCourse] = useState(null);
  const [riskData, setRiskData] = useState(null);
  const [loadingRisk, setLoadingRisk] = useState(false);

  // Form State
  const [courseCode, setCourseCode] = useState('');
  const [courseName, setCourseName] = useState('');
  const [semester, setSemester] = useState(4);
  const [credits, setCredits] = useState(4);
  const [submitting, setSubmitting] = useState(false);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get('/faculty/courses');
      setCourses(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/faculty/courses', {
        course_code: courseCode.trim().toUpperCase(),
        course_name: courseName.trim(),
        semester: Number(semester),
        credits: Number(credits)
      });
      setShowCreateModal(false);
      setCourseCode('');
      setCourseName('');
      fetchCourses();
    } catch (err) {
      alert(`Course creation failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCourse = async (id, code) => {
    if (!window.confirm(`Are you sure you want to delete course ${code}? All associated tasks and assignments will be removed.`)) {
      return;
    }
    try {
      await api.delete(`/faculty/courses/${id}`);
      fetchCourses();
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handleInspectRisk = async (course) => {
    setSelectedRiskCourse(course);
    setLoadingRisk(true);
    try {
      const data = await api.get(`/faculty/courses/${course.course_id}/risk-summary`);
      setRiskData(data);
    } catch (err) {
      alert(`Could not fetch risk summary: ${err.message}`);
    } finally {
      setLoadingRisk(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Curriculum Courses</h1>
          <p className="page-subtitle">Manage course offerings, credit weights, and monitor student cohort risk</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
          + Add New Course
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading course catalogue...</p>
        </div>
      ) : courses.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">📚</div>
          <h3>No Courses Found</h3>
          <p style={{ margin: '0.5rem 0 1rem' }}>Create a course to begin scheduling assignments and tracking deadlines.</p>
          <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
            Create First Course
          </button>
        </div>
      ) : (
        <div className="grid-cols-2">
          {courses.map((c) => (
            <div key={c.course_id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>
                    {c.course_code}
                  </span>
                  <span className="role-tag faculty">Semester {c.semester}</span>
                </div>

                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                  {c.course_name}
                </h3>

                <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                  <span>Credits: <strong>{c.credits}</strong></span>
                  <span>Tasks: <strong>{c.total_tasks}</strong></span>
                  <span>Enrolled Cohort: <strong>{c.total_enrolled_students}</strong></span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                <button
                  onClick={() => handleInspectRisk(c)}
                  className="btn btn-secondary btn-sm"
                >
                  🔍 View Student Cohort Risk
                </button>
                <button
                  onClick={() => handleDeleteCourse(c.course_id, c.course_code)}
                  className="btn btn-danger btn-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Course Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Create New Course</h3>
              <button onClick={() => setShowCreateModal(false)} className="modal-close">&times;</button>
            </div>

            <form onSubmit={handleCreateCourse}>
              <div className="form-group">
                <label className="form-label">Course Code</label>
                <input
                  type="text"
                  className="form-input"
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value)}
                  placeholder="e.g. CS501"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Course Title</label>
                <input
                  type="text"
                  className="form-input"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  placeholder="e.g. Advanced Distributed Systems"
                  required
                />
              </div>

              <div className="grid-cols-2">
                <div className="form-group">
                  <label className="form-label">Semester</label>
                  <select
                    className="form-select"
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                      <option key={s} value={s}>Semester {s}</option>
                    ))}
                  </select>
                  <div className="form-help">Students in this semester are automatically enrolled.</div>
                </div>

                <div className="form-group">
                  <label className="form-label">Credits</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    className="form-input"
                    value={credits}
                    onChange={(e) => setCredits(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cohort Risk Modal */}
      {selectedRiskCourse && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '850px' }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Cohort Risk: {selectedRiskCourse.course_code}</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {selectedRiskCourse.course_name} • Semester {selectedRiskCourse.semester}
                </p>
              </div>
              <button onClick={() => setSelectedRiskCourse(null)} className="modal-close">&times;</button>
            </div>

            {loadingRisk ? (
              <div className="loading-spinner">
                <div className="spinner"></div>
                <p>Aggregating student workload pressures from database view...</p>
              </div>
            ) : riskData?.enrolled_students?.length === 0 ? (
              <div className="empty-state">
                <p>No students enrolled in Semester {selectedRiskCourse.semester} yet.</p>
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: '1.25rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px', display: 'flex', gap: '2rem' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Students</span>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{riskData?.enrolled_students?.length}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>High/Critical Risk Count</span>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--danger)' }}>
                      {riskData?.enrolled_students?.filter(s => s.risk_level === 'HIGH' || s.risk_level === 'CRITICAL').length}
                    </div>
                  </div>
                </div>

                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Roll No</th>
                        <th>Student Name</th>
                        <th>Overall Risk</th>
                        <th>Workload</th>
                        <th>Temporal</th>
                        <th>Active Collisions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {riskData?.enrolled_students?.map((s) => (
                        <tr key={s.student_id}>
                          <td><strong>{s.roll_no}</strong></td>
                          <td>{s.student_name}</td>
                          <td>
                            <RiskBadge level={s.risk_level} score={s.overall_risk_score} />
                          </td>
                          <td>{Number(s.workload_pressure).toFixed(0)}%</td>
                          <td>{Number(s.temporal_pressure).toFixed(0)}%</td>
                          <td>
                            {s.active_collisions > 0 ? (
                              <span className="severity-pill HIGH">{s.active_collisions} active</span>
                            ) : (
                              <span style={{ color: 'var(--success)', fontWeight: 600 }}>0</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

