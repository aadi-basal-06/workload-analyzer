// =====================================================================
// CourseRiskChart.jsx: Faculty Course Workload & Risk (Apple Design)
// =====================================================================

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { useTheme } from '../context/ThemeContext';

export default function CourseRiskChart({ courses = [] }) {
  const { isDark } = useTheme();

  if (!courses || courses.length === 0) {
    return (
      <div className="empty-state">
        <p>No course metrics available</p>
      </div>
    );
  }

  const data = courses.map(c => ({
    name: c.course_code,
    tasks: Number(c.total_tasks || 0),
    enrolled: Number(c.total_enrolled_students || 0),
    completion: Number(c.avg_completion_percentage || 0)
  }));

  const taskColor = isDark ? '#2997ff' : '#0066cc';         // Action Blue
  const enrolledColor = isDark ? '#64d2ff' : '#0077ed';     // Light Sky
  const completionColor = isDark ? '#30d158' : '#34c759';   // iOS Green
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : '#f0f0f2';
  const textColor = isDark ? '#86868b' : '#7a7a7a';
  const tooltipBg = isDark ? '#272729' : '#ffffff';
  const tooltipText = isDark ? '#f5f5f7' : '#1d1d1f';

  return (
    <div style={{ width: '100%', height: 280 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 15, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12, fill: textColor, fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif', fontWeight: 500 }}
            axisLine={{ stroke: isDark ? 'rgba(255, 255, 255, 0.12)' : '#e0e0e0' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: textColor, fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
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
          <Legend wrapperStyle={{ fontSize: '12px', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif', paddingTop: '10px' }} />
          <Bar dataKey="tasks" name="Active Tasks" fill={taskColor} radius={[4, 4, 0, 0]} />
          <Bar dataKey="enrolled" name="Enrolled Students" fill={enrolledColor} radius={[4, 4, 0, 0]} />
          <Bar dataKey="completion" name="Avg Completion (%)" fill={completionColor} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
