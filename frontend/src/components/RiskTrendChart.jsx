// =====================================================================
// RiskTrendChart.jsx: Historical Workload Risk Progression (Apple Design)
// =====================================================================

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { useTheme } from '../context/ThemeContext';

export default function RiskTrendChart({ history = [] }) {
  const { isDark } = useTheme();

  if (!history || history.length === 0) {
    return (
      <div className="empty-state">
        <p>No historical workload calculations yet</p>
      </div>
    );
  }

  const chartData = history.map((item, idx) => ({
    name: item.calculated_at ? new Date(item.calculated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit' }) : `Run #${idx + 1}`,
    risk: Number(item.overall_risk_score || 0),
    hours: Number(item.total_estimated_hours || 0)
  }));

  const primaryColor = isDark ? '#2997ff' : '#0066cc';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : '#f0f0f2';
  const textColor = isDark ? '#86868b' : '#7a7a7a';
  const tooltipBg = isDark ? '#272729' : '#ffffff';
  const tooltipText = isDark ? '#f5f5f7' : '#1d1d1f';

  return (
    <div style={{ width: '100%', height: 260 }}>
      <ResponsiveContainer>
        <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="appleRiskGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={primaryColor} stopOpacity={0.4} />
              <stop offset="95%" stopColor={primaryColor} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: textColor, fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif' }}
            axisLine={{ stroke: isDark ? 'rgba(255, 255, 255, 0.12)' : '#e0e0e0' }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: textColor, fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif' }}
            unit="%"
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value, name) => [name === 'risk' ? `${value}%` : `${value}h`, name === 'risk' ? 'Overall Risk' : 'Task Hours']}
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
          <Area
            type="monotone"
            dataKey="risk"
            stroke={primaryColor}
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#appleRiskGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
