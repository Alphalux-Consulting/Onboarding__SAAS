import StatusBadge from './StatusBadge'

export default function ClientCard({
  client,
  onViewDetails,
  onGenerateToken,
  onStatusChange,
  generatingToken = false
}) {
  const handleViewClick = () => {
    onViewDetails(client)
  }

  const handleTokenClick = () => {
    onGenerateToken()
  }

  const handleClientStatusChange = (e) => {
    onStatusChange?.(client.id, 'estado_cliente', e.target.value)
  }

  const handleAdminStatusChange = (e) => {
    onStatusChange?.(client.id, 'estado_admin', e.target.value)
  }

  const formatDate = (dateValue) => {
    if (!dateValue) return '-'
    try {
      const date = dateValue.toDate?.() || dateValue
      return new Date(date).toLocaleDateString()
    } catch {
      return '-'
    }
  }

  const getRelativeTime = (dateValue) => {
    if (!dateValue) return 'Nunca'
    try {
      const date = dateValue.toDate?.() || dateValue
      const now = new Date()
      const then = new Date(date)
      const diffMs = now - then
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMs / 3600000)
      const diffDays = Math.floor(diffMs / 86400000)

      if (diffMins < 1) return 'Ahora'
      if (diffMins < 60) return `Hace ${diffMins}m`
      if (diffHours < 24) return `Hace ${diffHours}h`
      if (diffDays < 7) return `Hace ${diffDays}d`
      return formatDate(dateValue)
    } catch {
      return 'Nunca'
    }
  }

  const countCompletedModules = () => {
    const modules = [
      'info_basica',
      'servicio_principal',
      'cliente_ideal',
      'marca',
      'meta',
      'google',
      'slack',
      'ia',
      'inspiracion',
      'agendamiento'
    ]

    let completed = 0
    modules.forEach(module => {
      if (client[module] && Object.keys(client[module]).length > 0) {
        completed++
      }
    })
    return completed
  }

  const completedModules = countCompletedModules()
  const totalModules = 10

  const companyName = client.nombre_empresa || client.nombre_comercial || 'Sin nombre'
  const progress = client.progreso || 0

  // Client needs help if ANY module flagged help needed
  const needsHelp =
    client.google?.entorno_google_help === true ||
    client.slack?.slack_needs_help === true ||
    client.slack?.slack_status === 'necesita_ayuda'

  return (
    <div className={`client-card ${needsHelp ? 'client-card--needs-help' : ''}`}>
      {needsHelp && <div className="client-card-help-badge">Necesita Ayuda</div>}

      <div className="client-card-header">
        <div className="client-card-title-group">
          <h3 className="client-card-title">{companyName}</h3>
          <p className="client-card-subtitle">{client.email || '-'}</p>
        </div>
        <div className="client-card-progress-circular">
          <div className="progress-circle" style={{ '--progress': progress }}>
            <span className="progress-percent">{progress}%</span>
          </div>
        </div>
      </div>

      <div className="client-card-body">
        <div className="client-card-modules">
          <span className="modules-label">Módulos: {completedModules}/{totalModules}</span>
          <div className="modules-dots">
            {Array.from({ length: totalModules }).map((_, i) => (
              <div
                key={i}
                className={`module-dot ${i < completedModules ? 'completed' : ''}`}
              />
            ))}
          </div>
        </div>

        <div className="client-card-statuses">
          <div className="client-status">
            <span className="client-status-label">Estado:</span>
            <StatusBadge status={client.estado_cliente} type="client" />
          </div>
          <div className="client-status">
            <span className="client-status-label">Admin:</span>
            {onStatusChange ? (
              <select
                className="client-status-select"
                value={client.estado_admin || 'pendiente'}
                onChange={handleAdminStatusChange}
              >
                <option value="pendiente">Pendiente</option>
                <option value="en_revision">En Revisión</option>
                <option value="finalizado">Finalizado</option>
              </select>
            ) : (
              <StatusBadge status={client.estado_admin} type="admin" />
            )}
          </div>
        </div>

        <div className="client-card-meta">
          <small className="client-meta-label">Actualizado:</small>
          <small className="client-meta-text">
            {getRelativeTime(client.updatedAt)}
          </small>
        </div>
      </div>

      <div className="client-card-footer">
        <button
          className="btn-small btn-info"
          onClick={handleViewClick}
          title="Ver detalles"
        >
          Ver
        </button>
        <button
          className="btn-small btn-success"
          onClick={handleTokenClick}
          disabled={generatingToken}
          title="Generar y copiar link"
        >
          {generatingToken ? 'Generando...' : 'Link'}
        </button>
      </div>
    </div>
  )
}
