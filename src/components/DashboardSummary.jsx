export default function DashboardSummary({ clients = [] }) {
  const metrics = {
    total: clients.length,
    active: clients.filter(c => c.estado_cliente !== 'no_iniciado').length,
    atRisk: clients.filter(
      c => c.estado_cliente === 'en_proceso' && (c.progreso || 0) < 50
    ).length,
    completed: clients.filter(c => c.estado_cliente === 'completado').length,
    avgProgress:
      clients.length > 0
        ? Math.round(
            clients.reduce((sum, c) => sum + (c.progreso || 0), 0) / clients.length
          )
        : 0
  }

  const summaryCards = [
    { label: 'Total de Clientes', value: metrics.total },
    { label: 'Clientes Activos', value: metrics.active },
    { label: 'En Riesgo', value: metrics.atRisk },
    { label: 'Completados', value: metrics.completed },
    { label: 'Progreso Promedio', value: `${metrics.avgProgress}%` }
  ]

  return (
    <div className="dashboard-summary">
      {summaryCards.map((card, index) => (
        <div key={index} className="summary-card">
          <p className="summary-card-label">{card.label}</p>
          <p className="summary-card-value">{card.value}</p>
        </div>
      ))}
    </div>
  )
}
