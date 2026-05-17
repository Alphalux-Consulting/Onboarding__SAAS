export default function DashboardSummary({ clients = [] }) {
  const clientNeedsHelp = (c) =>
    c.google?.entorno_google_help === true ||
    c.slack?.slack_needs_help === true ||
    c.slack?.slack_status === 'necesita_ayuda'

  const metrics = {
    total: clients.length,
    // Active = has started (progress > 0) but not yet 100%
    active: clients.filter(c => { const p = c.progreso || 0; return p > 0 && p < 100 }).length,
    // Completed = reached 100% progress
    completed: clients.filter(c => (c.progreso || 0) === 100).length,
    needsHelp: clients.filter(clientNeedsHelp).length,
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
