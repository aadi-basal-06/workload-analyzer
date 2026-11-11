// =====================================================================
// AvailabilityPage.jsx: Student Availability Planner & Weekly View
// =====================================================================

import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';

export default function AvailabilityPage() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [startDatetime, setStartDatetime] = useState('');
  const [endDatetime, setEndDatetime] = useState('');
  const [availType, setAvailType] = useState('study_block');

  const fetchSlots = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get('/student/availability');
      setSlots(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load availability');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlots();
  }, []);

  const handleOpenModal = () => {
    // Default to tomorrow 14:00 to 18:00
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startStr = `${tomorrow.toISOString().slice(0, 10)}T14:00`;
    const endStr = `${tomorrow.toISOString().slice(0, 10)}T18:00`;

    setStartDatetime(startStr);
    setEndDatetime(endStr);
    setAvailType('study_block');
    setShowModal(true);
  };

  const handleCreateSlot = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await api.post('/student/availability', {
        start_datetime: startDatetime.replace('T', ' ') + ':00',
        end_datetime: endDatetime.replace('T', ' ') + ':00',
        availability_type: availType
      });
      setShowModal(false);
      fetchSlots();
    } catch (err) {
      alert(`Could not add availability: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSlot = async (id) => {
    if (!window.confirm('Delete this availability study block?')) return;
    try {
      await api.delete(`/student/availability/${id}`);
      fetchSlots();
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const totalHours = slots.reduce((sum, s) => sum + Number(s.available_hours || 0), 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Study Availability Planner</h1>
          <p className="page-subtitle">Define dedicated study time to balance academic workload</p>
        </div>
        <button onClick={handleOpenModal} className="btn btn-primary">
          + Add Study Block
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* Summary Banner */}
      <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            Total Logged Study Availability
          </span>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)' }}>
            {totalHours.toFixed(1)} Hours
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            The workload engine contrasts these hours with required task effort to detect <strong>OVERLOAD</strong> collisions.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ textAlign: 'center', padding: '0.75rem 1.25rem', background: '#f8fafc', borderRadius: '8px' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{slots.length}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Blocks Scheduled</div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading schedule...</p>
        </div>
      ) : slots.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">📅</div>
          <h3>No study blocks logged</h3>
          <p style={{ margin: '0.5rem 0 1rem' }}>
            Logging your weekly availability helps prevent overload collisions and improves risk accuracy.
          </p>
          <button onClick={handleOpenModal} className="btn btn-primary">
            Log First Study Block
          </button>
        </div>
      ) : (
        <div className="card">
          <div className="card-title">Weekly Scheduled Study Blocks</div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time Window</th>
                  <th>Duration</th>
                  <th>Block Type</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {slots.map((s) => {
                  const start = new Date(s.start_datetime);
                  const end = new Date(s.end_datetime);
                  return (
                    <tr key={s.availability_id}>
                      <td>
                        <strong>{start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</strong>
                      </td>
                      <td>
                        {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: 'var(--primary)' }}>
                          {s.available_hours}h
                        </span>
                      </td>
                      <td>
                        <span className="role-tag student" style={{ textTransform: 'capitalize' }}>
                          {s.availability_type ? s.availability_type.replace('_', ' ') : 'Study Block'}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => handleDeleteSlot(s.availability_id)}
                          className="btn btn-danger btn-sm"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Slot Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Schedule New Study Block</h3>
              <button onClick={() => setShowModal(false)} className="modal-close">&times;</button>
            </div>

            <form onSubmit={handleCreateSlot}>
              <div className="form-group">
                <label className="form-label">Start Date & Time</label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={startDatetime}
                  onChange={(e) => setStartDatetime(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">End Date & Time</label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={endDatetime}
                  onChange={(e) => setEndDatetime(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Session Category</label>
                <select
                  className="form-select"
                  value={availType}
                  onChange={(e) => setAvailType(e.target.value)}
                >
                  <option value="study_block">Self-Study Block</option>
                  <option value="exam_prep">Exam Preparation</option>
                  <option value="lab_work">Practical Lab / Coding</option>
                  <option value="group_project">Team Project Sync</option>
                </select>
                <div className="form-help">
                  Database constraint: Start time must precede end time, and overlapping blocks will be automatically rejected.
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Validating...' : 'Confirm Study Block'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

