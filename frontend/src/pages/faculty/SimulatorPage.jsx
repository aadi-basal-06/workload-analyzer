// =====================================================================
// SimulatorPage.jsx: Proactive Deadline Collision Simulator (Apple Design)
// =====================================================================

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';

export default function SimulatorPage() {
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState('');
  const [proposedDeadline, setProposedDeadline] = useState('');
  const [simResult, setSimResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.get('/faculty/tasks');
        setTasks(data || []);
        if (data && data.length > 0) {
          setSelectedTask(data[0].task_id);
          const currentDue = new Date(data[0].deadline_datetime);
          currentDue.setDate(currentDue.getDate() + 3);
          setProposedDeadline(currentDue.toISOString().slice(0, 16));
        }
      } catch (err) {
        setError(err.message || 'Failed to load task inventory');
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, []);

  const handleTaskChange = (taskId) => {
    setSelectedTask(taskId);
    const t = tasks.find((item) => String(item.task_id) === String(taskId));
    if (t) {
      const currentDue = new Date(t.deadline_datetime);
      currentDue.setDate(currentDue.getDate() + 3);
      setProposedDeadline(currentDue.toISOString().slice(0, 16));
    }
  };

  const handleRunSimulation = async (e) => {
    e.preventDefault();
    if (!selectedTask || !proposedDeadline) {
      alert('Please select a task and choose a proposed deadline');
      return;
    }

    try {
      setSimulating(true);
      setError(null);
      const res = await api.post('/faculty/simulator/run', {
        task_id: Number(selectedTask),
        proposed_deadline: new Date(proposedDeadline).toISOString()
      });
      setSimResult(res);
    } catch (err) {
      setError(err.message || 'Simulation execution failed');
    } finally {
      setSimulating(false);
    }
  };

  const currentTaskObj = tasks.find(t => String(t.task_id) === String(selectedTask));

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="section-eyebrow">Simulation Engine</div>
          <h1 className="page-title">What-If Deadline Simulator</h1>
          <p className="page-subtitle">
            Simulate curriculum rescheduling and predict cohort collision risk without modifying production database records
          </p>
        </div>
        <Link to="/faculty/simulations" className="btn btn-secondary">
          Audit History
        </Link>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* Simulator Control Card */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '17px', fontWeight: 600, marginBottom: '16px' }}>
          Configure Deadline Experiment
        </h3>
        <form onSubmit={handleRunSimulation}>
          <div className="grid-cols-2" style={{ alignItems: 'flex-end' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Select Course Task to Reschedule</label>
              <select
                className="form-select"
                value={selectedTask}
                onChange={(e) => handleTaskChange(e.target.value)}
                disabled={loading}
                required
              >
                {tasks.map((t) => (
                  <option key={t.task_id} value={t.task_id}>
                    {t.course_code}: {t.title} (Currently due: {new Date(t.deadline_datetime).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Proposed New Deadline</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={proposedDeadline}
                  onChange={(e) => setProposedDeadline(e.target.value)}
                  required
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ whiteSpace: 'nowrap' }}
                  disabled={simulating || loading}
                >
                  {simulating ? 'Computing...' : 'Run Simulation'}
                </button>
              </div>
            </div>
          </div>
        </form>

        {currentTaskObj && (
          <div style={{ marginTop: '18px', paddingTop: '14px', borderTop: '1px solid var(--hairline)', display: 'flex', gap: '24px', fontSize: '13px', color: 'var(--ink-secondary)', flexWrap: 'wrap' }}>
            <span>Current Deadline: <strong style={{ color: 'var(--ink)' }}>{new Date(currentTaskObj.deadline_datetime).toLocaleString()}</strong></span>
            <span>Assessment Weight: <strong style={{ color: 'var(--ink)' }}>{currentTaskObj.assessment_weight}%</strong></span>
            <span>Estimated Hours: <strong style={{ color: 'var(--ink)' }}>{currentTaskObj.estimated_hours}h</strong></span>
            <span>Difficulty: <strong style={{ color: 'var(--ink)' }}>{currentTaskObj.difficulty_level}/5</strong></span>
          </div>
        )}
      </div>

      {/* Simulation Results Display */}
      {simResult && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 600 }}>
                Simulation Projection: Task #{simResult.task_id}
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--ink-secondary)', marginTop: '2px' }}>
                Computed via MySQL stored procedure sp_simulate_deadline_change
              </p>
            </div>
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink-secondary)', backgroundColor: 'var(--canvas-parchment)', padding: '4px 12px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--hairline)' }}>
              Affected Cohort: <strong style={{ color: 'var(--ink)' }}>{simResult.affected_students} Students</strong>
            </span>
          </div>

          {/* Side-by-Side Comparison */}
          <div className="grid-cols-2" style={{ marginBottom: '20px' }}>
            {/* Original State */}
            <div style={{ padding: '20px', backgroundColor: 'var(--canvas-parchment)', borderRadius: 'var(--radius-md)', border: '1px solid var(--hairline)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span className="role-tag student">Current Baseline</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--ink-secondary)', marginBottom: '4px' }}>
                Original Deadline
              </div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ink)', marginBottom: '16px' }}>
                {new Date(simResult.original_deadline).toLocaleString()}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                <span style={{ color: 'var(--ink-secondary)' }}>Average Student Risk:</span>
                <strong>{Number(simResult.original_risk).toFixed(1)}%</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: 'var(--ink-secondary)' }}>Total Cohort Collisions:</span>
                <strong>{simResult.original_collisions}</strong>
              </div>
            </div>

            {/* Projected State */}
            <div style={{ padding: '20px', backgroundColor: Number(simResult.impact_score) <= 0 ? 'var(--status-low-bg)' : 'var(--status-high-bg)', borderRadius: 'var(--radius-md)', border: `1px solid ${Number(simResult.impact_score) <= 0 ? 'rgba(52, 199, 89, 0.3)' : 'rgba(255, 59, 48, 0.3)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span className={`role-tag ${Number(simResult.impact_score) <= 0 ? 'faculty' : 'student'}`}>
                  Projected Status
                </span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--ink-secondary)', marginBottom: '4px' }}>
                Proposed Deadline
              </div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ink)', marginBottom: '16px' }}>
                {new Date(simResult.proposed_deadline).toLocaleString()}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                <span style={{ color: 'var(--ink-secondary)' }}>Projected Student Risk:</span>
                <strong>{Number(simResult.projected_risk).toFixed(1)}%</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: 'var(--ink-secondary)' }}>Projected Collisions:</span>
                <strong>{simResult.projected_collisions}</strong>
              </div>
            </div>
          </div>

          {/* Impact Meter & Actionable Recommendation */}
          <div style={{ padding: '20px', backgroundColor: 'var(--canvas-parchment)', borderRadius: 'var(--radius-md)', border: '1px solid var(--hairline)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
              <div>
                <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--ink-secondary)' }}>
                  Net Workload Impact Score
                </span>
                <div style={{ marginTop: '4px', fontSize: '18px', fontWeight: 600, color: Number(simResult.impact_score) <= 0 ? 'var(--status-low-text)' : 'var(--status-high-text)' }}>
                  {Number(simResult.impact_score) <= 0 ? '▼ ' : '▲ '}
                  {Math.abs(Number(simResult.impact_score)).toFixed(1)}% {Number(simResult.impact_score) <= 0 ? 'Risk Relief' : 'Risk Surge'}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--ink-secondary)' }}>
                  Recommendation
                </span>
                <div style={{ marginTop: '4px' }}>
                  <span className={`risk-badge ${simResult.recommendation.startsWith('APPROVE') ? 'LOW' : simResult.recommendation.startsWith('NOT') ? 'HIGH' : 'MEDIUM'}`}>
                    {simResult.recommendation.split(':')[0]}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ padding: '14px', backgroundColor: 'var(--surface)', borderRadius: 'var(--radius-sm)', borderLeft: `4px solid ${simResult.recommendation.startsWith('APPROVE') ? 'var(--status-low)' : simResult.recommendation.startsWith('NOT') ? 'var(--status-high)' : 'var(--status-medium)'}`, border: '1px solid var(--hairline)' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)' }}>
                {simResult.recommendation}
              </div>
              <p style={{ fontSize: '12px', marginTop: '4px', color: 'var(--ink-secondary)' }}>
                Recorded automatically in database table <code>SIMULATIONS</code> for historical faculty review.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
