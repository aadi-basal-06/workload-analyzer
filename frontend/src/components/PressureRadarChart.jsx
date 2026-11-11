// =====================================================================
// PressureRadarChart.jsx: 5-Dimensional Workload Pressure Radar (Apple Design)
// =====================================================================

import React from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import { useTheme } from '../context/ThemeContext';

export default function PressureRadarChart({ pressures }) {
  const { isDark } = useTheme();

  if (!pressures) {
    return (
      <div className="empty-state">
        <p>No workload analysis data available</p>
      </div>
    );
  }

  const data = [
    {
      dimension: 'Temporal (25%)',
      value: Number(pressures.temporal_pressure || 0),
      fullMark: 100,
      description: 'Deadline density (tasks/week)'
    },
    {
      dimension: 'Workload (30%)',
      value: Number(pressures.workload_pressure || 0),
      fullMark: 100,
      description: 'Required hours / Available study hours'
    },
    {
      dimension: 'Cognitive (15%)',
      value: Number(pressures.cognitive_pressure || 0),
      fullMark: 100,
      description: 'Avg task complexity x difficulty'
    },
    {
      dimension: 'Assessment (20%)',
      value: Number(pressures.assessment_pressure || 0),
      fullMark: 100,
      description: 'Sum of assessment weights due'
    },
    {
      dimension: 'Dependency (10%)',
      value: Number(pressures.dependency_pressure || 0),
      fullMark: 100,
      description: 'Unfinished prerequisite bottlenecks'
    }
  ];

  const primaryColor = isDark ? '#2997ff' : '#0066cc';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.15)' : '#e5e5ea';
  const textColor = isDark ? '#a1a1a6' : '#515154';
  const tooltipBg = isDark ? '#272729' : '#ffffff';
  const tooltipText = isDark ? '#f5f5f7' : '#1d1d1f';

  return (
    <div style={{ width: '100%', height: 320 }}>
      <ResponsiveContainer>
        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
          <PolarGrid stroke={gridColor} strokeDasharray="3 3" />
          <PolarAngleAxis
            dataKey="dimension"
            tick={{ fill: textColor, fontSize: 12, fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif', fontWeight: 500 }}
          />
          <PolarRadiusAxis angle={30} domain={[0, 100]} stroke={gridColor} tick={{ fill: textColor, fontSize: 10 }} />
          <Radar
            name="Workload Pressure (%)"
            dataKey="value"
            stroke={primaryColor}
            strokeWidth={2}
            fill={primaryColor}
            fillOpacity={0.25}
          />
          <Tooltip
            formatter={(val) => [`${val}%`, 'Intensity']}
            contentStyle={{
              backgroundColor: tooltipBg,
              color: tooltipText,
              borderRadius: '12px',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid #e0e0e0',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
              fontSize: '13px',
              padding: '8px 12px'
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
