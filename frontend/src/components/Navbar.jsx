// =====================================================================
// Navbar.jsx: Apple Frosted Glass Navigation Bar with Theme Toggle
// =====================================================================

import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Navbar() {
  const { user, logout, isStudent, isFaculty } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="navbar-container">
      <div className="nav-wrapper">
        <NavLink to="/" className="nav-brand">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
            <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span>Workload Analyzer</span>
          <span className="nav-brand-tag">DBMS Platform</span>
        </NavLink>

        <nav className="nav-links">
          {isStudent && (
            <>
              <NavLink to="/student/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Dashboard
              </NavLink>
              <NavLink to="/student/tasks" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Tasks
              </NavLink>
              <NavLink to="/student/availability" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Availability
              </NavLink>
              <NavLink to="/student/workload" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Workload Radar
              </NavLink>
              <NavLink to="/student/collisions" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Collisions
              </NavLink>
            </>
          )}

          {isFaculty && (
            <>
              <NavLink to="/faculty/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Dashboard
              </NavLink>
              <NavLink to="/faculty/courses" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Courses
              </NavLink>
              <NavLink to="/faculty/tasks" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Tasks
              </NavLink>
              <NavLink to="/faculty/simulator" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Simulator
              </NavLink>
              <NavLink to="/faculty/simulations" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                History
              </NavLink>
            </>
          )}
        </nav>

        <div className="nav-actions">
          {/* Apple Style Theme Toggle Capsule */}
          <button
            type="button"
            onClick={toggleTheme}
            className="apple-theme-toggle"
            title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
            aria-label="Toggle visual theme"
          >
            {isDark ? '🌙 Dark' : '☀️ Light'}
          </button>

          {user ? (
            <>
              <span className={`role-tag ${user.role}`}>{user.role}</span>
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)' }}>
                {user.username}
              </span>
              <button onClick={handleLogout} className="btn btn-secondary btn-sm">
                Sign Out
              </button>
            </>
          ) : (
            <NavLink to="/login" className="btn btn-primary btn-sm">
              Sign In
            </NavLink>
          )}
        </div>
      </div>
    </header>
  );
}
