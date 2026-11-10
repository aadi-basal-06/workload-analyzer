// =====================================================================
// Login.jsx: Apple Design Authentication & Quick Demo Selector
// =====================================================================

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const demoAccounts = [
    { label: 'Dr. Sarah (Faculty - CS401 DBMS)', email: 'sarah@university.edu', role: 'faculty' },
    { label: 'Prof. Raj (Faculty - CS402 OS / CS602 ML)', email: 'raj@university.edu', role: 'faculty' },
    { label: 'Alice Wong (Student - High Risk & Collisions)', email: 'alice@university.edu', role: 'student' },
    { label: 'Bob Martinez (Student - Overloaded Hours)', email: 'bob@university.edu', role: 'student' },
    { label: 'Charlie Kim (Student - Moderate Progress)', email: 'charlie@university.edu', role: 'student' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const user = await login(email, password);
      if (user.role === 'student') {
        navigate('/student/dashboard');
      } else {
        navigate('/faculty/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const selectDemoAccount = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('password123');
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Sign In</h1>
          <p>
            Student Workload & Deadline Collision Intelligence
          </p>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">University Email Address</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@university.edu"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Account Password</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', fontSize: '15px', marginTop: '8px' }}
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ margin: '28px 0 20px', borderTop: '1px solid var(--hairline)' }}></div>

        {/* Demo Fast Login Selector */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Quick Demo Accounts
            </span>
            <span style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
              Password: password123
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {demoAccounts.map((demo) => (
              <button
                key={demo.email}
                type="button"
                className="demo-account-chip"
                onClick={() => selectDemoAccount(demo.email)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 500 }}>{demo.label}</span>
                  <span className={`role-tag ${demo.role}`}>{demo.role}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px', color: 'var(--ink-secondary)' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ fontWeight: 500 }}>
            Create one here
          </Link>
        </div>
      </div>
    </div>
  );
}
