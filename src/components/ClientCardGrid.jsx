export default function ClientCardGrid({ children, isEmpty = false, emptyMessage = 'No hay clientes que coincidan con este filtro' }) {
  if (isEmpty || !children || (Array.isArray(children) && children.length === 0)) {
    return (
      <div className="client-cards-empty">
        <p>{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="client-cards-grid">
      {children}
    </div>
  )
}
