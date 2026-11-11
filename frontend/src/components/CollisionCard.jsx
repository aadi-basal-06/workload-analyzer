// =====================================================================
// CollisionCard.jsx: Apple Utility Card for Deadline Conflicts
// =====================================================================

import React from 'react';

export default function CollisionCard({ collision, onResolve }) {
  const {
    collision_id,
    collision_type,
    severity,
    description,
    detected_at,
    resolved
  } = collision;

  const typeLabels = {
    DEADLINE_CLUSTER: 'Deadline Cluster',
    OVERLOAD: 'Study Hours Overload',
    ASSESSMENT_OVERLAP: 'High Assessment Overlap'
  };

  return (
    <div className={`collision-item ${severity} ${resolved ? 'resolved' : ''}`}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
          <span className={`severity-pill ${severity}`}>{severity}</span>
          <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--ink)' }}>
            {typeLabels[collision_type] || collision_type}
          </span>
          {resolved && (
            <span style={{ fontSize: '12px', color: 'var(--status-low-text)', fontWeight: 600 }}>
              ✓ Resolved
            </span>
          )}
        </div>

        <p style={{ fontSize: '14px', marginBottom: '6px', lineHeight: 1.45, color: 'var(--ink)' }}>
          {description}
        </p>

        <div style={{ fontSize: '12px', color: 'var(--ink-secondary)' }}>
          Detected: {detected_at ? new Date(detected_at).toLocaleString() : 'N/A'}
        </div>
      </div>

      <div>
        {!resolved && onResolve && (
          <button
            onClick={() => onResolve(collision_id)}
            className="btn btn-secondary btn-sm"
            title="Mark as reviewed and resolved"
          >
            Resolve
          </button>
        )}
      </div>
    </div>
  );
}
