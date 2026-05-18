import { lazy, Suspense, Component } from 'react'

class ErrorBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) { return { error } }
  render() {
    if (this.state.error) return (
      <div style={{ padding: 32, fontFamily: 'monospace', background: '#fff' }}>
        <h2 style={{ color: 'red' }}>Error de renderizado</h2>
        <pre style={{ whiteSpace: 'pre-wrap', color: '#333', fontSize: 13 }}>{this.state.error?.message}</pre>
        <pre style={{ whiteSpace: 'pre-wrap', color: '#999', fontSize: 11 }}>{this.state.error?.stack}</pre>
      </div>
    )
    return this.props.children
  }
}
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { NotesProvider } from './context/NotesContext'
import { BibliotecaProvider } from './context/BibliotecaContext'
import { AdminProvider } from './context/AdminContext'

const LoginPage = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const ProjectsPage = lazy(() => import('./pages/ProjectsPage'))
const TasksPage = lazy(() => import('./pages/TasksPage'))
const BibliotecaPage = lazy(() => import('./pages/BibliotecaPage'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const UsersPanel = lazy(() => import('./pages/admin/UsersPanel'))
const ActivityLog = lazy(() => import('./pages/admin/ActivityLog'))

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-violet-950 to-slate-900">
      <div className="text-center">
        <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-violet-500/25 animate-pulse">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </div>
        <p className="text-violet-200/50 text-sm font-medium">Cargando...</p>
      </div>
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  return children
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (user) return <Navigate to="/dashboard" replace />
  return children
}

function SuperAdminRoute({ children }) {
  const { user, profile, profileLoaded, loading } = useAuth()
if (loading || !profileLoaded) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />

  if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
    return <Navigate to="/dashboard" replace />
  }
  return children
}

function AppRoutes() {
  return (
    <ErrorBoundary>
    <Suspense fallback={<LoadingScreen />}>
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <NotesProvider>
              <DashboardPage />
            </NotesProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/biblioteca"
        element={
          <ProtectedRoute>
            <BibliotecaProvider>
              <BibliotecaPage />
            </BibliotecaProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/tasks"
        element={<ProtectedRoute><ProjectsPage /></ProtectedRoute>}
      />
      <Route
        path="/tasks/:projectId"
        element={<ProtectedRoute><TasksPage /></ProtectedRoute>}
      />
      <Route
        path="/admin"
        element={
          <SuperAdminRoute>
            <AdminProvider>
              <AdminDashboard />
            </AdminProvider>
          </SuperAdminRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <SuperAdminRoute>
            <AdminProvider>
              <UsersPanel />
            </AdminProvider>
          </SuperAdminRoute>
        }
      />
      <Route
        path="/admin/activity"
        element={
          <SuperAdminRoute>
            <AdminProvider>
              <ActivityLog />
            </AdminProvider>
          </SuperAdminRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
    </ErrorBoundary>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
