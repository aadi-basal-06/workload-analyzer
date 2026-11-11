// =====================================================================
// SimulationHistoryPage.jsx: Historical Audit Log of Deadline Simulations
// =====================================================================

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';

export default function SimulationHistoryPage() {
  const [simulations, setSimulations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSimulations = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get('/faculty/simulations');
      setSimulations(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load simulation history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSimulations();
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Deadline Simulation Log</h1>
          <p className="page-subtitle">Historical records of simulated date adjustments and curriculum impact scores</p>
        </div>
        <Link to="/faculty/simulator" className="btn btn-primary">
          + Run New Simulation
        </Link>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Querying SIMULATIONS table...</p>
        </div>
      ) : simulations.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">🔮</div>
          <h3>No simulations recorded yet</h3>
          <p style={{ margin: '0.5rem 0 1rem' }}>Test hypothetical deadline shifts using the Collision Simulator.</p>
          <Link to="/faculty/simulator" className="btn btn-primary">
            Launch Simulator
          </Link>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Course / Task</th>
                <th>Original Date</th>
                <th>Proposed Date</th>
                <th>Affected</th>
                <th>Risk Shift</th>
                <th>Collisions</th>
                <th>Recommendation</th>
                <th>Executed At</th>
              </tr>
            </thead>
            <tbody>
              {simulations.map((s) => {
                const impact = Number(s.impact_score);
                const isRelief = impact <= 0;
                return (
                  <tr key={s.simulation_id}>
                    <td>
                      <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.8rem' }}>
                        {s.course_code}
                      </span>
                      <div style={{ fontWeight: 600 }}>{s.task_title}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem' }}>{new Date(s.original_deadline).toLocaleDateString()}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(s.original_deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{new Date(s.proposed_deadline).toLocaleDateString()}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(s.proposed_deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td>{s.affected_students} students</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontSize: '0.85rem' }}>{Number(s.original_risk).toFixed(0)}% ➔ {Number(s.projected_risk).toFixed(0)}%</span>
                        <span className={`severity-pill ${isRelief ? 'LOW' : 'HIGH'}`}>
                          {isRelief ? '▼' : '▲'} {Math.abs(impact).toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td>
                      <span>{s.original_collisions} ➔ {s.projected_collisions}</span>
                    </td>
                    <td>
                      <span className={`risk-badge ${s.recommendation.startsWith('APPROVE') ? 'LOW' : s.recommendation.startsWith('NOT') ? 'HIGH' : 'MEDIUM'}`}>
                        {s.recommendation.split(':')[0]}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {new Date(s.created_at).toLocaleDateString()}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

