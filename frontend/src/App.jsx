import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { MapProvider } from './context/MapContext';
import { ThemeProvider } from './context/ThemeContext';

import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import LoadingSpinner from './components/common/LoadingSpinner';
import ProtectedRoute from './components/auth/ProtectedRoute';

const LandingPage = lazy(() => import('./pages/public/LandingPage'));
const LoginPage = lazy(() => import('./pages/public/LoginPage'));
const RegisterPage = lazy(() => import('./pages/public/RegisterPage'));
const NotFoundPage = lazy(() => import('./pages/public/NotFoundPage'));

const CitizenDashboardPage = lazy(() => import('./pages/citizen/CitizenDashboardPage'));
const ReportMissingPage = lazy(() => import('./pages/citizen/ReportMissingPage'));
const ReportSightingPage = lazy(() => import('./pages/citizen/ReportSightingPage'));
const MissingPersonDetailPage = lazy(() => import('./pages/citizen/MissingPersonDetailPage'));
const SightingDetailPage = lazy(() => import('./pages/citizen/SightingDetailPage'));
const ProfilePage = lazy(() => import('./pages/citizen/ProfilePage'));
const MyReportsPage = lazy(() => import('./pages/citizen/MyReportsPage'));
// FIX 1: CitizenMapPage is now a proper full route
const CitizenMapPage = lazy(() => import('./pages/citizen/CitizenMapPage'));

const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'));
const MatchReviewPage = lazy(() => import('./pages/admin/MatchReviewPage'));
const UserManagementPage = lazy(() => import('./pages/admin/UserManagementPage'));
const SightingReviewPage = lazy(() => import('./pages/admin/SightingReviewPage'));
const SystemHealthPage = lazy(() => import('./pages/admin/SystemHealthPage'));
const MapAdminPage = lazy(() => import('./pages/admin/MapAdminPage'));
const MissingPersonsAdminPage = lazy(() => import('./pages/admin/MissingPersonsAdminPage'));

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <MapProvider>
            <Router>
              <div className="flex flex-col min-h-screen bg-white">
                <Navbar />
                <main className="flex-grow">
                  <Suspense
                    fallback={
                      <div className="flex items-center justify-center min-h-[60vh]">
                        <LoadingSpinner size="lg" />
                      </div>
                    }
                  >
                    <Routes>
                      {/* Public Routes */}
                      <Route path="/" element={<LandingPage />} />
                      <Route path="/login" element={<LoginPage />} />
                      <Route path="/register" element={<RegisterPage />} />

                      {/* Citizen Routes */}
                      <Route
                        path="/citizen/dashboard"
                        element={
                          <ProtectedRoute allowedRoles={['citizen']}>
                            <CitizenDashboardPage />
                          </ProtectedRoute>
                        }
                      />
                      {/* FIX 1: was a broken inline comment-route, now a proper protected route */}
                      <Route
                        path="/citizen/map"
                        element={
                          <ProtectedRoute allowedRoles={['citizen']}>
                            <CitizenMapPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/citizen/report-missing"
                        element={
                          <ProtectedRoute allowedRoles={['citizen']}>
                            <ReportMissingPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/citizen/report-sighting"
                        element={
                          <ProtectedRoute allowedRoles={['citizen']}>
                            <ReportSightingPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/citizen/missing/:id"
                        element={
                          <ProtectedRoute allowedRoles={['citizen']}>
                            <MissingPersonDetailPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/citizen/sighting/:id"
                        element={
                          <ProtectedRoute allowedRoles={['citizen']}>
                            <SightingDetailPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/citizen/profile"
                        element={
                          <ProtectedRoute allowedRoles={['citizen', 'admin']}>
                            <ProfilePage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/citizen/my-reports"
                        element={
                          <ProtectedRoute allowedRoles={['citizen']}>
                            <MyReportsPage />
                          </ProtectedRoute>
                        }
                      />

                      {/* Admin Routes */}
                      <Route
                        path="/admin/dashboard"
                        element={
                          <ProtectedRoute allowedRoles={['admin']}>
                            <AdminDashboardPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/missing-persons"
                        element={
                          <ProtectedRoute allowedRoles={['admin']}>
                            <MissingPersonsAdminPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/matches"
                        element={
                          <ProtectedRoute allowedRoles={['admin']}>
                            <MatchReviewPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/users"
                        element={
                          <ProtectedRoute allowedRoles={['admin']}>
                            <UserManagementPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/sightings"
                        element={
                          <ProtectedRoute allowedRoles={['admin']}>
                            <SightingReviewPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/system-health"
                        element={
                          <ProtectedRoute allowedRoles={['admin']}>
                            <SystemHealthPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/map"
                        element={
                          <ProtectedRoute allowedRoles={['admin']}>
                            <MapAdminPage />
                          </ProtectedRoute>
                        }
                      />

                      {/* Fallback */}
                      <Route path="/404" element={<NotFoundPage />} />
                      <Route path="*" element={<Navigate to="/404" replace />} />
                    </Routes>
                  </Suspense>
                </main>
                <Footer />
              </div>
            </Router>
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#FFFFFF',
                  color: '#800000',
                  border: '1px solid #800000',
                },
              }}
            />
          </MapProvider>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
