import { Navigate } from 'react-router-dom'

/**
 * Componente que protege rutas
 * Verifica autenticación y permisos
 */
export default function ProtectedRoute({
  user,
  isAdmin = false,
  requiredRole = null,
  children
}) {
  // Si requiere admin pero no lo es
  if (requiredRole === 'admin') {
    if (!user) {
      return <Navigate to="/admin-login" replace />
    }
    if (!isAdmin) {
      return <Navigate to="/" replace />
    }
  }

  // Si requiere autenticación general (cliente)
  if (!requiredRole) {
    // Chequear si hay sesión de token o Firebase Auth
    const hasTokenSession = sessionStorage.getItem('onboardingToken')
    const hasInvitationSession = localStorage.getItem('invitationCode')

    if (!user && !hasTokenSession && !hasInvitationSession) {
      return <Navigate to="/" replace />
    }
  }

  return children
}
