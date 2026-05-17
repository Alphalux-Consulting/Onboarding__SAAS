export default function FilterBar({ statusFilter, onFilterChange, statusCounts = {} }) {
  const filters = [
    { key: 'all', label: 'Todos', count: statusCounts.total || 0 },
    { key: 'no_iniciado', label: 'No Iniciado', count: statusCounts.no_iniciado || 0 },
    { key: 'en_proceso', label: 'En Proceso', count: statusCounts.en_proceso || 0 },
    { key: 'completado', label: 'Completado', count: statusCounts.completado || 0 },
    { key: 'necesita_ayuda', label: 'Necesita Ayuda', count: statusCounts.necesita_ayuda || 0 }
  ]

  return (
    <div className="filter-bar">
      {filters.map(filter => (
        <button
          key={filter.key}
          className={`filter-button ${statusFilter === filter.key ? 'active' : ''}`}
          onClick={() => onFilterChange(filter.key)}
        >
          {filter.label}
          <span className="filter-count">({filter.count})</span>
        </button>
      ))}
    </div>
  )
}
