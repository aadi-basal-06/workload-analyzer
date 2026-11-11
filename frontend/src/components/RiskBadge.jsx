// =====================================================================
// RiskBadge.jsx: Apple Status Capsule for Risk Level & Score
// =====================================================================

import React from 'react';

export default function RiskBadge({ level = 'LOW', score = null, showScore = true }) {
  const normalizedLevel = (level || 'LOW').toUpperCase();

  const dots = {
    LOW: '●',
    MEDIUM: '●',
    HIGH: '●',
    CRITICAL: '●'
  };

  return (
    <span className={`risk-badge ${normalizedLevel}`}>
      <span style={{ fontSize: '9px', lineHeight: 1 }}>{dots[normalizedLevel] || '●'}</span>
      <span>{normalizedLevel} RISK</span>
      {showScore && score !== null && (
        <span style={{ opacity: 0.85, fontWeight: 500, marginLeft: '2px' }}>
          {Number(score).toFixed(1)}%
        </span>
      )}
    </span>
  );
}
