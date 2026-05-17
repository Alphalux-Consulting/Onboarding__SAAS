import { useState, useRef, useEffect } from 'react'
import '../styles/user-menu.css'

export default function UserMenu({ user, onLogout }) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef(null)

  // Cerrar menú cuando se hace clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getInitials = (email) => {
    const namePart = email?.split('@')[0] || 'U'
    const initials = namePart
      .split('.')
      .map(part => part.charAt(0).toUpperCase())
      .join('')
    return initials || 'UA'
  }

  const handleLogoutClick = async () => {
    setIsOpen(false)
    await onLogout()
  }

  return (
    <div className="user-menu-container" ref={menuRef}>
      <button
        className="user-menu-trigger"
        onClick={() => setIsOpen(!isOpen)}
        title="Menú de usuario"
      >
        <div className="user-avatar">
          {getInitials(user?.email)}
        </div>
      </button>

      {isOpen && (
        <div className="user-menu-dropdown">
          <div className="user-menu-header">
            <div className="user-menu-name">{user?.email?.split('@')[0] || 'Admin'}</div>
            <div className="user-menu-email">{user?.email}</div>
            <div className="user-menu-role">ADMINISTRADOR</div>
          </div>

          <div className="user-menu-divider" />

          <button className="user-menu-item" disabled title="Funcionalidad próxima">
            <span className="user-menu-icon">🎙️</span>
            <span className="user-menu-label">Probar voz</span>
          </button>

          <button className="user-menu-item" disabled title="Funcionalidad próxima">
            <span className="user-menu-icon">🔄</span>
            <span className="user-menu-label">Repetir welcome</span>
          </button>

          <button className="user-menu-item" disabled title="Funcionalidad próxima">
            <span className="user-menu-icon">⚙️</span>
            <span className="user-menu-label">Ajustes</span>
          </button>

          <div className="user-menu-divider" />

          <button
            className="user-menu-item user-menu-logout"
            onClick={handleLogoutClick}
            title="Cerrar tu sesión"
          >
            <span className="user-menu-icon">🚪</span>
            <span className="user-menu-label">Cerrar sesión</span>
          </button>
        </div>
      )}
    </div>
  )
}
