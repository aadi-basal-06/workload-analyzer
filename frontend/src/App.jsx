// =====================================================================
// App.jsx: React Router Configuration & Apple Layout Shell
// =====================================================================

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';

// Public Pages
import Login from './pages/Login';
import Register from './pages/Register';
import NotFound from './pages/NotFound';

// Student Pages
import StudentDashboard from './pages/student/Dashboard';
import StudentTasksPage from './pages/student/TasksPage';
import AvailabilityPage from './pages/student/AvailabilityPage';
import WorkloadPage from './pages/student/WorkloadPage';
import CollisionsPage from './pages/student/CollisionsPage';

// Faculty Pages
import FacultyDashboard from './pages/faculty/Dashboard';
import FacultyCoursesPage from './pages/faculty/CoursesPage';
import FacultyTasksPage from './pages/faculty/TasksPage';
import TaskDetailPage from './pages/faculty/TaskDetailPage';
import SimulatorPage from './pages/faculty/SimulatorPage';
import SimulationHistoryPage from './pages/faculty/SimulationHistoryPage';

function RootRedirect() {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p>Loading Workload Analyzer...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role === 'student') {
    return <Navigate to="/student/dashboard" replace />;
  }

  return <Navigate to="/faculty/dashboard" replace />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <div className="app-layout">
            <Navbar />
            <main className="main-content">
              <Routes>
                {/* Root redirect */}
                <Route path="/" element={<RootRedirect />} />

                {/* Public Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Student Routes */}
                <Route element={<ProtectedRoute allowedRoles={['student']} />}>
                  <Route path="/student/dashboard" element={<StudentDashboard />} />
                  <Route path="/student/tasks" element={<StudentTasksPage />} />
                  <Route path="/student/availability" element={<AvailabilityPage />} />
                  <Route path="/student/workload" element={<WorkloadPage />} />
                  <Route path="/student/collisions" element={<CollisionsPage />} />
                </Route>

                {/* Faculty Routes */}
                <Route element={<ProtectedRoute allowedRoles={['faculty', 'admin']} />}>
                  <Route path="/faculty/dashboard" element={<FacultyDashboard />} />
                  <Route path="/faculty/courses" element={<FacultyCoursesPage />} />
                  <Route path="/faculty/tasks" element={<FacultyTasksPage />} />
                  <Route path="/faculty/tasks/:id" element={<TaskDetailPage />} />
                  <Route path="/faculty/simulator" element={<SimulatorPage />} />
                  <Route path="/faculty/simulations" element={<SimulationHistoryPage />} />
                </Route>

                {/* 404 Catch-All */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
