import StatusBadge from './StatusBadge'
import ProgressIndicator from './ProgressIndicator'

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

  const companyName = client.nombre_empresa || client.nombre_comercial || 'Sin nombre'
  const progress = client.progreso || 0

  return (
    <div className="client-card">
      <div className="client-card-header">
        <div className="client-card-title-group">
          <h3 className="client-card-title">{companyName}</h3>
          <p className="client-card-subtitle">{client.email || '-'}</p>
        </div>
      </div>

      <div className="client-card-body">
        <div className="client-card-progress">
          <ProgressIndicator progress={progress} variant="linear" showLabel={true} />
        </div>

        <div className="client-card-statuses">
          <div className="client-status">
            <span className="client-status-label">Cliente:</span>
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
          <small className="client-meta-text">
            Última actualización: {formatDate(client.updatedAt)}
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
