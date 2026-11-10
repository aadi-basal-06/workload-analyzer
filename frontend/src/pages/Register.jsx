// =====================================================================
// Register.jsx: Apple Design User Enrollment
// =====================================================================

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'student',
    roll_no: '',
    program: 'Computer Science',
    semester: 4,
    section: 'A'
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'semester' ? Number(value) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const user = await register(formData);
      if (user.role === 'student') {
        navigate('/student/dashboard');
      } else {
        navigate('/faculty/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card" style={{ maxWidth: '540px' }}>
        <div className="auth-header">
          <h1>Create Account</h1>
          <p>
            Direct Student & Faculty Portal Access
          </p>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="grid-cols-2">
            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                type="text"
                name="username"
                className="form-input"
                value={formData.username}
                onChange={handleChange}
                placeholder="e.g. john_doe"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Account Role</label>
              <select
                name="role"
                className="form-select"
                value={formData.role}
                onChange={handleChange}
              >
                <option value="student">Student</option>
                <option value="faculty">Faculty</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">University Email Address</label>
            <input
              type="email"
              name="email"
              className="form-input"
              value={formData.email}
              onChange={handleChange}
              placeholder="e.g. john@university.edu"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Account Password</label>
            <input
              type="password"
              name="password"
              className="form-input"
              value={formData.password}
              onChange={handleChange}
              placeholder="Minimum 6 characters"
              required
              minLength={6}
            />
          </div>

          {/* Student Specific Fields */}
          {formData.role === 'student' && (
            <div style={{ marginTop: '16px', padding: '16px', backgroundColor: 'var(--canvas-parchment)', borderRadius: 'var(--radius-md)', marginBottom: '18px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', color: 'var(--ink)' }}>
                Academic Profile Details
              </div>

              <div className="grid-cols-2">
                <div className="form-group">
                  <label className="form-label">Roll Number</label>
                  <input
                    type="text"
                    name="roll_no"
                    className="form-input"
                    value={formData.roll_no}
                    onChange={handleChange}
                    placeholder="e.g. CS2024-001"
                    required={formData.role === 'student'}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Degree Program</label>
                  <input
                    type="text"
                    name="program"
                    className="form-input"
                    value={formData.program}
                    onChange={handleChange}
                    placeholder="Computer Science"
                  />
                </div>
              </div>

              <div className="grid-cols-2" style={{ marginBottom: 0 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Semester</label>
                  <select
                    name="semester"
                    className="form-select"
                    value={formData.semester}
                    onChange={handleChange}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>Semester {s}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Section</label>
                  <input
                    type="text"
                    name="section"
                    className="form-input"
                    value={formData.section}
                    onChange={handleChange}
                    placeholder="e.g. A"
                  />
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', fontSize: '15px', marginTop: '10px' }}
            disabled={loading}
          >
            {loading ? 'Registering Account...' : 'Create Account'}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px', color: 'var(--ink-secondary)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ fontWeight: 500 }}>
            Sign In here
          </Link>
        </div>
      </div>
    </div>
  );
}
