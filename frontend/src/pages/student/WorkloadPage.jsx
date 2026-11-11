// =====================================================================
// WorkloadPage.jsx: 5-Dimensional Pressure Analysis & DBMS Viva Guide
// =====================================================================

import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import RiskBadge from '../../components/RiskBadge';
import PressureRadarChart from '../../components/PressureRadarChart';
import RiskTrendChart from '../../components/RiskTrendChart';

export default function WorkloadPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [error, setError] = useState(null);

  const fetchWorkloadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/student/workload/current');
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load workload data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkloadData();
  }, []);

  const handleRecalculate = async () => {
    try {
      setRecalculating(true);
      const res = await api.post('/student/workload/calculate');
      setData(res);
    } catch (err) {
      alert(`Calculation failed: ${err.message}`);
    } finally {
      setRecalculating(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p>Executing stored procedure sp_calculate_workload...</p>
      </div>
    );
  }

  const latest = data?.latest;
  const history = data?.history || [];

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="section-eyebrow">Workload Engine</div>
          <h1 className="page-title">5-Dimensional Pressure Radar</h1>
          <p className="page-subtitle">Algorithmic Workload & Cognitive Strain Computed via MySQL Stored Procedures</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {latest && <RiskBadge level={latest.risk_level} score={latest.overall_risk_score} />}
          <button
            onClick={handleRecalculate}
            className="btn btn-primary"
            disabled={recalculating}
          >
            {recalculating ? 'Recalculating...' : 'Recalculate (sp_calculate_workload)'}
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* Main Grid: Radar Chart + 5-Pressure Cards */}
      <div className="grid-cols-2" style={{ marginBottom: '24px' }}>
        {/* Radar Chart Card */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: 600 }}>Workload Radar Plot</h3>
            <span style={{ fontSize: '12px', color: 'var(--ink-secondary)' }}>0–100 Normalized Scale</span>
          </div>
          <div>
            <PressureRadarChart pressures={latest} />
            <div style={{ marginTop: '14px', textAlign: 'center', fontSize: '12px', color: 'var(--ink-secondary)' }}>
              Last Calculated: {latest?.calculated_at ? new Date(latest.calculated_at).toLocaleString() : 'N/A'}
            </div>
          </div>
        </div>

        {/* 5-Dimensional Breakdown Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="card" style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontWeight: 600, fontSize: '14px' }}>1. Temporal Pressure (25% weight)</span>
              <strong style={{ fontSize: '15px', color: 'var(--primary)' }}>{latest?.temporal_pressure || 0}%</strong>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--ink-secondary)', margin: 0 }}>
              Deadline clustering density. Measures how many assignments fall within 3-day and 7-day rolling windows.
            </p>
          </div>

          <div className="card" style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontWeight: 600, fontSize: '14px' }}>2. Workload Pressure (30% weight)</span>
              <strong style={{ fontSize: '15px', color: 'var(--primary)' }}>{latest?.workload_pressure || 0}%</strong>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--ink-secondary)', margin: 0 }}>
              Ratio of required task hours ({latest?.total_estimated_hours || 0}h) to logged available study hours ({latest?.available_hours || 0}h).
            </p>
          </div>

          <div className="card" style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontWeight: 600, fontSize: '14px' }}>3. Cognitive Pressure (15% weight)</span>
              <strong style={{ fontSize: '15px', color: 'var(--primary)' }}>{latest?.cognitive_pressure || 0}%</strong>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--ink-secondary)', margin: 0 }}>
              Bloom's taxonomy complexity and subject difficulty ratings across concurrent deliverables.
            </p>
          </div>

          <div className="card" style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontWeight: 600, fontSize: '14px' }}>4. Assessment Pressure (20% weight)</span>
              <strong style={{ fontSize: '15px', color: 'var(--primary)' }}>{latest?.assessment_pressure || 0}%</strong>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--ink-secondary)', margin: 0 }}>
              Cumulative grade weight percentage of deliverables due soon. High-stakes exams score higher.
            </p>
          </div>

          <div className="card" style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontWeight: 600, fontSize: '14px' }}>5. Dependency Pressure (10% weight)</span>
              <strong style={{ fontSize: '15px', color: 'var(--primary)' }}>{latest?.dependency_pressure || 0}%</strong>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--ink-secondary)', margin: 0 }}>
              Count of uncompleted prerequisite milestones in active courses. Blocks forward momentum when prerequisites stall.
            </p>
          </div>
        </div>
      </div>

      {/* Historical Trend Chart */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: 600 }}>Historical Workload Audit Trail</h3>
            <p style={{ fontSize: '13px', color: 'var(--ink-secondary)', marginTop: '2px' }}>
              Persisted snapshot records stored in MySQL table WORKLOAD_ANALYSIS
            </p>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--ink-secondary)' }}>
            {history.length} calculation runs
          </span>
        </div>
        <div>
          <RiskTrendChart history={history} />
        </div>
      </div>

      {/* Apple Keynote Technical Reference / DBMS Viva Guide */}
      <div className="keynote-card">
        <h3>DBMS Architecture & Viva Reference</h3>
        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px' }}>
          <div>
            <strong>Mathematical Formula:</strong>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', backgroundColor: 'var(--surface)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--hairline)', marginTop: '4px' }}>
              Overall Risk = (0.25 × Temporal) + (0.30 × Workload) + (0.15 × Cognitive) + (0.20 × Assessment) + (0.10 × Dependency)
            </div>
          </div>
          <div>
            <strong>Risk Classification Scale:</strong>
            <div style={{ color: 'var(--ink-secondary)', marginTop: '2px' }}>
              • LOW: &lt; 30.00% • MEDIUM: 30.00% – 54.99% • HIGH: 55.00% – 74.99% • CRITICAL: ≥ 75.00%
            </div>
          </div>
          <div>
            <strong>Database Automation:</strong>
            <div style={{ color: 'var(--ink-secondary)', marginTop: '2px' }}>
              Executed automatically by stored procedure <code>sp_calculate_workload</code> and recorded in table <code>WORKLOAD_ANALYSIS</code>. Automated in real-time by trigger <code>trg_student_tasks_after_insert</code> and <code>trg_student_tasks_after_update</code>.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
