import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { auth, setupAuthListener } from './config/firebase'
import { checkIfAdmin } from './services/adminAuth'

// Páginas
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'
import ClientOnboarding from './pages/ClientOnboarding'
import TokenValidation from './pages/TokenValidation'

// Componentes
import ProtectedRoute from './components/ProtectedRoute'
import LoadingScreen from './components/LoadingScreen'

export default function App() {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  // Setup auth listener
  useEffect(() => {
    const unsubscribe = setupAuthListener(async (currentUser) => {
      setUser(currentUser)

      if (currentUser) {
        const adminStatus = await checkIfAdmin(currentUser)
        setIsAdmin(adminStatus)
      } else {
        setIsAdmin(false)
      }

      setLoading(false)
    })

    return unsubscribe
  }, [])

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <Router>
      <Routes>
        {/* Ruta raíz: redirect a admin login */}
        <Route path="/" element={<Navigate to="/admin-login" replace />} />

        {/* Rutas públicas */}
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/onboarding" element={<TokenValidation />} />
        <Route path="/onboarding/:token" element={<TokenValidation />} />

        {/* Rutas protegidas - Admin */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute
              user={user}
              isAdmin={isAdmin}
              requiredRole="admin"
            >
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Rutas protegidas - Cliente */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute user={user}>
              <ClientOnboarding />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}
