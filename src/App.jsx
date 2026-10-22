import { lazy, Suspense, Component } from 'react'

class ErrorBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) { return { error } }
  render() {
    if (this.state.error) return (
      <div role="alert" className="min-h-screen bg-canvas text-ink p-6 sm:p-8">
        <h2 className="text-lg font-bold text-danger">Error de renderizado</h2>
        <p className="mt-1 text-sm text-ink-muted">Algo ha fallado al mostrar esta pantalla. Recargar suele solucionarlo.</p>
        <button type="button" onClick={() => window.location.reload()} className="mt-4 h-10 px-4 rounded-xl bg-accent hover:bg-accent-hover text-accent-ink text-sm font-semibold">
          Recargar
        </button>
        <pre className="mt-6 whitespace-pre-wrap font-mono text-[13px] text-ink">{this.state.error?.message}</pre>
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-ink-muted">Detalles técnicos</summary>
          <pre className="mt-2 whitespace-pre-wrap font-mono text-[11px] text-ink-subtle">{this.state.error?.stack}</pre>
        </details>
      </div>
    )
    return this.props.children
  }
}
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { NotesProvider } from './context/NotesContext'
import { BibliotecaProvider } from './context/BibliotecaContext'
import { ProjectsProvider } from './context/ProjectsContext'
import { AdminProvider } from './context/AdminContext'
import AppLayout from './components/layout/AppLayout'
import Logo from './components/ui/Logo'

const LoginPage = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const ProjectsPage = lazy(() => import('./pages/ProjectsPage'))
const TasksPage = lazy(() => import('./pages/TasksPage'))
const BibliotecaPage = lazy(() => import('./pages/BibliotecaPage'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const UsersPanel = lazy(() => import('./pages/admin/UsersPanel'))
const ActivityLog = lazy(() => import('./pages/admin/ActivityLog'))

// Pantalla mientras arranca la app o se descarga una página. Es lo primero
// que ve cualquiera al abrir la web: fondo negro plano y logo lima.
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas">
      <div role="status" className="text-center">
        <Logo size="lg" className="mx-auto mb-3 animate-pulse" />
        <p className="text-ink-muted text-sm font-medium">Cargando…</p>
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
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<NotesProvider><DashboardPage /></NotesProvider>} />
        <Route path="/biblioteca" element={<BibliotecaProvider><BibliotecaPage /></BibliotecaProvider>} />
        {/* Un solo ProjectsProvider para la lista y el tablero: la barra lateral no recarga al cambiar entre ellos */}
        <Route element={<ProjectsProvider><Outlet /></ProjectsProvider>}>
          <Route path="/tasks" element={<ProjectsPage />} />
          <Route path="/tasks/:slug" element={<TasksPage />} />
        </Route>
      </Route>
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
