export default function StatusBadge({ status, type = 'client' }) {
  const getColorClass = () => {
    if (type === 'client') {
      switch (status) {
        case 'no_iniciado':
          return 'no-iniciado'
        case 'en_proceso':
          return 'en-proceso'
        case 'completado':
          return 'completado'
        default:
          return 'no-iniciado'
      }
    } else {
      switch (status) {
        case 'pendiente':
          return 'pendiente'
        case 'en_revision':
          return 'en-revision'
        case 'finalizado':
          return 'finalizado'
        default:
          return 'pendiente'
      }
    }
  }

  const getLabel = () => {
    const labels = {
      no_iniciado: 'No Iniciado',
      en_proceso: 'En Proceso',
      completado: 'Completado',
      pendiente: 'Pendiente',
      en_revision: 'En Revisión',
      finalizado: 'Finalizado'
    }
    return labels[status] || status
  }

  return (
    <span className={`status-badge ${getColorClass()}`}>
      {getLabel()}
    </span>
  )
}
