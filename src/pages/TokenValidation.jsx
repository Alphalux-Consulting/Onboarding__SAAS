import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { validateToken, getClientDataByToken } from '../services/tokenValidator'
import LoadingScreen from '../components/LoadingScreen'
import Logo from '../components/Logo'
import './pages.css'

export default function TokenValidation() {
  const navigate = useNavigate()
  const { token: paramToken } = useParams()
  const [searchParams] = useSearchParams()
  const queryToken = searchParams.get('t')

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  // Obtener el token desde parámetros o query string
  const token = paramToken || queryToken

  useEffect(() => {
    // Si hay un token en los parámetros, intentar validarlo automáticamente
    if (token) {
      validateAndProcessToken(token)
    } else {
      // Sin token en URL, mostrar error y no permitir entrada manual
      setError('No se encontró un link válido. Por favor, usa el link que te enviamos por correo.')
      setLoading(false)
    }
  }, [token])

  const validateAndProcessToken = async (tokenToValidate) => {
    try {
      setError('')
      setLoading(true)

      // Validar el token
      const validationResult = await validateToken(tokenToValidate)

      if (!validationResult.valid) {
        setError('El token no es válido o ha expirado. Por favor, solicita un nuevo link.')
        setLoading(false)
        return
      }

      // Obtener datos del cliente
      const result = await getClientDataByToken(tokenToValidate)

      if (!result || !result.clientId) {
        setError('No se pudo encontrar los datos del cliente.')
        setLoading(false)
        return
      }

      // Guardar token y cliente en sessionStorage
      sessionStorage.setItem('onboardingToken', tokenToValidate)
      sessionStorage.setItem('clientId', result.clientId)
      sessionStorage.setItem('clientEmail', result.clientData?.email || '')
      sessionStorage.setItem('clientCompany', result.clientData?.nombre_empresa || result.clientData?.empresa || '')

      // Redirigir al dashboard
      navigate('/dashboard', { replace: true })
    } catch (err) {
      console.error('Error validating token:', err)
      setError(
        err.message ||
        'Error al procesar tu link. Por favor, intenta nuevamente.'
      )
      setLoading(false)
    }
  }

  const handleBack = () => {
    navigate('/')
  }

  const handleRequestNewLink = () => {
    // Redirigir a página de soporte o mostrar modal
    alert('Por favor, solicita un nuevo link a tu administrador de Alphalux.')
  }

  // Si hay un token en parámetros y está validando, mostrar pantalla de carga
  if (loading && token) {
    return <LoadingScreen />
  }

  // Si hay error, mostrar error + opciones
  if (error) {
    return (
      <div className="token-validation-container">
        <div className="token-validation-box">
          <div className="admin-login-logo">
            <Logo />
          </div>
          <h1 className="token-validation-title">Acceso Denegado</h1>

          <p className="token-validation-message">
            {error}
          </p>

          <div className="token-error-content">
            <p>
              El acceso a tu onboarding es únicamente a través del link personalizado.
            </p>
            <p>
              Si no recibiste el link, por favor solicítalo a tu administrador de Alphalux.
            </p>
          </div>

          <div className="token-validation-buttons">
            <button
              type="button"
              className="token-validation-button"
              onClick={handleRequestNewLink}
            >
              Solicitar Nuevo Link
            </button>
            <button
              type="button"
              className="token-validation-button-secondary"
              onClick={handleBack}
            >
              ← Volver al inicio
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Si el token es válido, redirige automáticamente al dashboard
  return <LoadingScreen />
}
