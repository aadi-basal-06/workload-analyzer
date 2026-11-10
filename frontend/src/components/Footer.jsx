// =====================================================================
// Footer.jsx: Apple Directory Navigation Footer & Project Information
// =====================================================================

import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Footer() {
  const { isStudent, isFaculty } = useAuth();

  return (
    <footer className="footer-container">
      <div className="footer-content">
        <div className="footer-grid">
          <div className="footer-col">
            <h4>Analytical Engine</h4>
            <ul>
              <li>
                <Link to={isStudent ? '/student/workload' : isFaculty ? '/faculty/simulator' : '/login'}>
                  5D Workload Radar
                </Link>
              </li>
              <li>
                <Link to={isStudent ? '/student/collisions' : isFaculty ? '/faculty/simulator' : '/login'}>
                  Deadline Collision Detection
                </Link>
              </li>
              <li>
                <Link to={isFaculty ? '/faculty/simulator' : isStudent ? '/student/workload' : '/login'}>
                  What-If Simulation Engine
                </Link>
              </li>
              <li>
                <Link to={isFaculty ? '/faculty/simulations' : '/login'}>
                  Simulation History Log
                </Link>
              </li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Academic Portal</h4>
            <ul>
              <li>
                <Link to={isStudent ? '/student/dashboard' : isFaculty ? '/faculty/dashboard' : '/login'}>
                  Command Dashboard
                </Link>
              </li>
              <li>
                <Link to={isStudent ? '/student/tasks' : isFaculty ? '/faculty/tasks' : '/login'}>
                  Task Management
                </Link>
              </li>
              <li>
                <Link to={isStudent ? '/student/availability' : isFaculty ? '/faculty/courses' : '/login'}>
                  {isStudent ? 'Study Availability Calendar' : 'Course Cohort Management'}
                </Link>
              </li>
              <li>
                <Link to="/register">Create Academic Account</Link>
              </li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Database Architecture</h4>
            <ul>
              <li>
                <a href="#schema" onClick={(e) => { e.preventDefault(); alert("Database Schema: student_workload (11 Normalized Tables, Foreign Keys, CASCADE/SET NULL constraints)."); }}>
                  Relational Schema (11 Tables)
                </a>
              </li>
              <li>
                <a href="#procedures" onClick={(e) => { e.preventDefault(); alert("Stored Procedures: sp_calculate_workload, sp_detect_collisions, sp_simulate_deadline_change."); }}>
                  Stored Procedures & Views
                </a>
              </li>
              <li>
                <a href="#triggers" onClick={(e) => { e.preventDefault(); alert("Automated Triggers: trg_tasks_after_update, trg_student_tasks_after_insert, trg_student_tasks_after_update."); }}>
                  Automated Triggers
                </a>
              </li>
              <li>
                <a href="#transactions" onClick={(e) => { e.preventDefault(); alert("ACID Transactions: Isolation level & rollback safety for simulation and batch assignments."); }}>
                  ACID Concurrency Safety
                </a>
              </li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>System & Stack</h4>
            <ul>
              <li>
                <a href="#stack" onClick={(e) => { e.preventDefault(); alert("Tech Stack: Node.js, Express, MySQL 8.x (mysql2 promise pool), React (Vite), Recharts."); }}>
                  Full-Stack Architecture
                </a>
              </li>
              <li>
                <a href="#tests" onClick={(e) => { e.preventDefault(); alert("Backend Test Suite: 19 Integration & Stored Procedure Tests passing with Jest & Supertest."); }}>
                  Automated Test Suite
                </a>
              </li>
              <li>
                <a href="#security" onClick={(e) => { e.preventDefault(); alert("Security: JWT Token Authentication with Bcrypt Password Hashing & Express Validator."); }}>
                  JWT & Bcrypt Security
                </a>
              </li>
              <li>
                <a href="#design" onClick={(e) => { e.preventDefault(); alert("Design System: Photography-first museum interface, SF Pro Display, Action Blue #0066cc."); }}>
                  Design System Reference
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <div>
            Copyright © 2026 Student Workload & Deadline Collision Analyzer. DBMS Course Project. All rights reserved.
          </div>
          <div className="footer-links-inline">
            <a href="#terms" onClick={(e) => { e.preventDefault(); alert("Terms of Academic Use: Designed for Database Management Systems Course Project."); }}>
              Terms of Use
            </a>
            <a href="#privacy" onClick={(e) => { e.preventDefault(); alert("Privacy Policy: Student study schedules and task progress are securely stored."); }}>
              Privacy Policy
            </a>
            <a href="#viva" onClick={(e) => { e.preventDefault(); alert("DBMS Viva Ready: Stored Procedures, Triggers, Views, and Transactions fully demonstrable."); }}>
              DBMS Viva Guide
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

