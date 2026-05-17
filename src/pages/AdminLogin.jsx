import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminLogin } from '../services/adminAuth'
import './pages.css'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const logoUrl = new URL('../assets/images/logo-alphalux.png', import.meta.url).href

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Validaciones básicas
      if (!email.trim()) {
        setError('El email es requerido')
        setLoading(false)
        return
      }

      if (!password) {
        setError('La contraseña es requerida')
        setLoading(false)
        return
      }

      if (password.length < 6) {
        setError('La contraseña debe tener al menos 6 caracteres')
        setLoading(false)
        return
      }

      // Intentar login
      const user = await adminLogin(email, password)

      if (user) {
        // Login exitoso, redirigir al dashboard admin
        navigate('/admin', { replace: true })
      }
    } catch (err) {
      // Mostrar mensaje de error amigable
      setError(err.message || 'Error al iniciar sesión. Verifica tus credenciales.')
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    navigate('/')
  }

  return (
    <div className="admin-login-container">
      <div className="admin-login-form-container">
        <form className="admin-login-form" onSubmit={handleSubmit}>
          <div className="admin-login-header">
            <div className="admin-login-logo-section">
              <img src={logoUrl} alt="Alphalux" className="admin-login-logo" />
              <div className="admin-login-user-icon">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M 4 20 Q 4 14 12 14 Q 20 14 20 20" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                </svg>
              </div>
            </div>
            <h2 className="admin-login-title">Panel Administrativo</h2>
            <p>Ingresa tus credenciales para acceder al panel de administración</p>
          </div>

          {error && (
            <div className="form-error">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              placeholder="Tu contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            className="admin-login-button"
            disabled={loading}
          >
            {loading ? 'Ingresando...' : 'Acceder'}
          </button>

          <div className="admin-login-back">
          </div>
        </form>
      </div>
    </div>
  )
}
