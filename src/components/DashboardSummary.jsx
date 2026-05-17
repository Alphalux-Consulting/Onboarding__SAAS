export default function DashboardSummary({ clients = [] }) {
  const metrics = {
    total: clients.length,
    active: clients.filter(c => c.estado_cliente !== 'no_iniciado').length,
    completed: clients.filter(c => c.estado_cliente === 'completado').length,
    needsHelp: clients.filter(c => c.google?.entorno_google_help === true).length,
    avgProgress:
      clients.length > 0
        ? Math.round(
            clients.reduce((sum, c) => sum + (c.progreso || 0), 0) / clients.length
          )
        : 0
  }

  const summaryCards = [
    { label: 'Total Clientes', value: metrics.total, type: 'total', symbol: '◈' },
    { label: 'Clientes Activos', value: metrics.active, type: 'active', symbol: '◉' },
    { label: 'Completados', value: metrics.completed, type: 'completed', symbol: '◎' },
    { label: 'Necesita Ayuda', value: metrics.needsHelp, type: 'needs-help', symbol: '⚠' }
  ]

  return (
    <div className="dashboard-summary">
      {summaryCards.map((card, index) => (
        <div key={index} className={`summary-card summary-card--${card.type}`}>
          <span className="summary-card-symbol">{card.symbol}</span>
          <p className="summary-card-value">{card.value}</p>
          <p className="summary-card-label">{card.label}</p>
        </div>
      ))}
    </div>
  )
}
