// =====================================================================
// Dashboard.jsx: Faculty Command Center (Apple Design)
// =====================================================================

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import CourseRiskChart from '../../components/CourseRiskChart';

export default function FacultyDashboard() {
  const [courses, setCourses] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [simulations, setSimulations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchFacultyData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [coursesRes, tasksRes, simsRes] = await Promise.all([
        api.get('/faculty/courses'),
        api.get('/faculty/tasks'),
        api.get('/faculty/simulator/history')
      ]);

      setCourses(coursesRes || []);
      setTasks(tasksRes || []);
      setSimulations(simsRes || []);
    } catch (err) {
      setError(err.message || 'Failed to load faculty dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFacultyData();
  }, []);

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p>Loading curriculum & cohort data...</p>
      </div>
    );
  }

  const totalEnrolled = courses.reduce((sum, c) => sum + Number(c.total_enrolled_students || 0), 0);
  const recentSims = simulations.slice(0, 3);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="section-eyebrow">Faculty Overview</div>
          <h1 className="page-title">Curriculum Scheduling & Risk Control</h1>
          <p className="page-subtitle">Proactive collision avoidance, cognitive workload balancing, and simulation modeling</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link to="/faculty/simulator" className="btn btn-primary">
            What-If Simulator
          </Link>
          <Link to="/faculty/tasks" className="btn btn-secondary">
            + New Task
          </Link>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* Keynote Hero Panel */}
      <div className="keynote-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h3>Proactively simulate deadline adjustments before announcing dates.</h3>
            <p>
              Before rescheduling assignments or announcing exam dates, run our What-If Collision Simulator.
              It tests your proposed dates against all concurrent semester courses to guarantee that your students
              are never hit with overlapping deadlines or study hour spikes.
            </p>
          </div>
          <Link to="/faculty/simulator" className="btn btn-primary btn-sm">
            Launch Simulator
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid-cols-4" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-icon">🎓</div>
          <div>
            <div className="stat-label">Active Courses</div>
            <div className="stat-value">{courses.length}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div>
            <div className="stat-label">Managed Tasks</div>
            <div className="stat-value">{tasks.length}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div>
            <div className="stat-label">Enrolled Students</div>
            <div className="stat-value">{totalEnrolled}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🔮</div>
          <div>
            <div className="stat-label">Simulations Run</div>
            <div className="stat-value">{simulations.length}</div>
          </div>
        </div>
      </div>

      {/* Chart & Simulator Pitch Grid */}
      <div className="grid-cols-2" style={{ marginBottom: '24px' }}>
        {/* Course Risk Chart Card */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: 600 }}>Course Metrics Comparison</h3>
            <Link to="/faculty/courses" style={{ fontSize: '13px', fontWeight: 500 }}>
              Manage Courses →
            </Link>
          </div>
          <div>
            <CourseRiskChart courses={courses} />
          </div>
        </div>

        {/* Proactive Simulator Callout Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 600 }}>What-If Deadline Shift Engine</h3>
              <span className="role-tag faculty">Proactive</span>
            </div>
            <p style={{ fontWeight: 500, fontSize: '14px', marginBottom: '8px', color: 'var(--ink)' }}>
              Avoid Accidental Exam Collisions Across Concurrent Courses.
            </p>
            <p style={{ fontSize: '14px', color: 'var(--ink-secondary)', lineHeight: 1.5, marginBottom: '16px' }}>
              Stored procedure <code>sp_simulate_deadline_change</code> scans all assigned tasks in the semester cohort, evaluates impact on student risk, and produces a definitive recommendation: <strong>APPROVE</strong>, <strong>NOT RECOMMENDED</strong>, or <strong>SUGGEST ALTERNATE DATE</strong>.
            </p>
          </div>
          <div>
            <Link to="/faculty/simulator" className="btn btn-primary" style={{ width: '100%' }}>
              Open What-If Simulator →
            </Link>
          </div>
        </div>
      </div>

      {/* Courses Table Card */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '17px', fontWeight: 600 }}>Active Curriculum Courses</h3>
          <Link to="/faculty/courses" style={{ fontSize: '13px', fontWeight: 500 }}>
            Cohort Details →
          </Link>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Course Name</th>
                <th>Semester</th>
                <th>Credits</th>
                <th>Tasks</th>
                <th>Enrolled</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => (
                <tr key={c.course_id}>
                  <td>
                    <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{c.course_code}</span>
                  </td>
                  <td style={{ fontWeight: 500 }}>{c.course_name}</td>
                  <td>Semester {c.semester}</td>
                  <td>{c.credits} Credits</td>
                  <td>{c.total_tasks || 0} tasks</td>
                  <td>{c.total_enrolled_students || 0} students</td>
                  <td>
                    <Link to="/faculty/tasks" className="btn btn-secondary btn-sm">
                      View Tasks
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Simulations Audit Table Card */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '17px', fontWeight: 600 }}>Recent What-If Simulations (Audit Trail)</h3>
          <Link to="/faculty/simulations" style={{ fontSize: '13px', fontWeight: 500 }}>
            Full History →
          </Link>
        </div>
        {recentSims.length === 0 ? (
          <div className="empty-state" style={{ padding: '24px' }}>
            <p>No simulations run yet. Use the simulator to test deadline changes safely.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Original Deadline</th>
                  <th>Proposed Deadline</th>
                  <th>Delta Risk</th>
                  <th>Recommendation</th>
                  <th>Simulated At</th>
                </tr>
              </thead>
              <tbody>
                {recentSims.map((s) => (
                  <tr key={s.simulation_id}>
                    <td style={{ fontWeight: 500 }}>{s.task_title || `Task #${s.task_id}`}</td>
                    <td>{new Date(s.original_deadline).toLocaleDateString()}</td>
                    <td>{new Date(s.proposed_deadline).toLocaleDateString()}</td>
                    <td>
                      <span style={{ fontWeight: 600, color: Number(s.predicted_risk_change) > 0 ? 'var(--status-high-text)' : 'var(--status-low-text)' }}>
                        {Number(s.predicted_risk_change) > 0 ? `+${s.predicted_risk_change}%` : `${s.predicted_risk_change}%`}
                      </span>
                    </td>
                    <td>
                      <span className={`severity-pill ${s.recommendation === 'APPROVE' ? 'LOW' : 'HIGH'}`}>
                        {s.recommendation}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--ink-secondary)' }}>
                      {new Date(s.simulated_at).toLocaleDateString()}
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
