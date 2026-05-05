import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../config/firebase'
import { signOut } from 'firebase/auth'
import { getCompanyClients, updateClientStatus, updateAdminStatus, createClient } from '../services/clientData'
import {
  generateAccessToken,
  getTokenInfo,
  revokeToken,
  getTokensByCompany
} from '../services/tokenValidator'
import {
  downloadClientsAsCSV,
  downloadAllClientsAsJSON,
  getFormattedSheetData,
  getGoogleSheetsImportInstructions
} from '../services/googleSheetsSync'
import LoadingScreen from '../components/LoadingScreen'
import './pages.css'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [clients, setClients] = useState([])
  const [tokens, setTokens] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('clients') // clients, analytics, export
  const [selectedClient, setSelectedClient] = useState(null)
  const [showNewTokenModal, setShowNewTokenModal] = useState(false)
  const [generatingToken, setGeneratingToken] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [showCreateClientForm, setShowCreateClientForm] = useState(false)
  const [newClientEmpresa, setNewClientEmpresa] = useState('')
  const [newClientEmail, setNewClientEmail] = useState('')
  const [newClientNombreComercial, setNewClientNombreComercial] = useState('')
  const [creatingClient, setCreatingClient] = useState(false)
  const [showTokenSuccess, setShowTokenSuccess] = useState(false)
  const [generatedTokenUrl, setGeneratedTokenUrl] = useState('')
  const [newClientName, setNewClientName] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // Filtro por estado del cliente

  useEffect(() => {
    initializeDashboard()
  }, [])

  const initializeDashboard = async () => {
    try {
      const currentUser = auth.currentUser
      if (!currentUser) {
        navigate('/admin-login', { replace: true })
        return
      }

      setUser(currentUser)

      // Obtener clientes (por ahora usando "default" como empresa)
      // En el futuro, esto debería obtener la empresa del usuario
      const companyClients = await getCompanyClients('default')
      setClients(companyClients)

      // Obtener tokens para cada cliente
      const tokensMap = {}
      for (const client of companyClients) {
        const clientTokens = await getTokensByCompany('default')
        tokensMap[client.id] = clientTokens
      }
      setTokens(tokensMap)

      setLoading(false)
    } catch (err) {
      console.error('Error initializing dashboard:', err)
      setError('Error al cargar el dashboard. Por favor, intenta nuevamente.')
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
      navigate('/', { replace: true })
    } catch (err) {
      console.error('Error logging out:', err)
      setError('Error al cerrar sesión')
    }
  }

  const handleGenerateToken = async (clientId, clientEmail, clientCompany) => {
    try {
      setGeneratingToken(true)
      const token = await generateAccessToken(clientEmail, clientCompany)

      // Actualizar tokens locales
      const updatedTokens = { ...tokens }
      updatedTokens[clientId] = [
        ...(updatedTokens[clientId] || []),
        { token, status: 'active' }
      ]
      setTokens(updatedTokens)

      // Copiar al portapapeles
      const fullUrl = `${window.location.origin}/onboarding/${token}`
      navigator.clipboard.writeText(fullUrl)

      setError('Token generado y copiado al portapapeles')
      setShowNewTokenModal(false)
    } catch (err) {
      console.error('Error generating token:', err)
      setError('Error al generar token')
    } finally {
      setGeneratingToken(false)
    }
  }

  const handleRevokeToken = async (token) => {
    try {
      await revokeToken(token)
      // Actualizar estado local
      const updatedTokens = { ...tokens }
      Object.keys(updatedTokens).forEach(clientId => {
        updatedTokens[clientId] = updatedTokens[clientId].filter(t => t.token !== token)
      })
      setTokens(updatedTokens)
      setError('Token revocado exitosamente')
    } catch (err) {
      console.error('Error revoking token:', err)
      setError('Error al revocar token')
    }
  }

  const handleUpdateClientStatus = async (clientId, newStatus) => {
    try {
      await updateClientStatus(clientId, newStatus)
      setClients(clients.map(c =>
        c.id === clientId ? { ...c, estado_cliente: newStatus } : c
      ))
    } catch (err) {
      console.error('Error updating client status:', err)
      setError('Error al actualizar estado del cliente')
    }
  }

  const handleUpdateAdminStatus = async (clientId, newStatus) => {
    try {
      await updateAdminStatus(clientId, newStatus)
      setClients(clients.map(c =>
        c.id === clientId ? { ...c, estado_admin: newStatus } : c
      ))
    } catch (err) {
      console.error('Error updating admin status:', err)
      setError('Error al actualizar estado del admin')
    }
  }

  const handleExportCSV = async () => {
    try {
      setExporting(true)
      await downloadClientsAsCSV('default')
      setError('CSV exportado correctamente')
    } catch (err) {
      console.error('Error exporting CSV:', err)
      setError('Error al exportar CSV')
    } finally {
      setExporting(false)
    }
  }

  const handleExportJSON = async () => {
    try {
      setExporting(true)
      await downloadAllClientsAsJSON('default')
      setError('JSON exportado correctamente')
    } catch (err) {
      console.error('Error exporting JSON:', err)
      setError('Error al exportar JSON')
    } finally {
      setExporting(false)
    }
  }

  const handleShowExportInstructions = () => {
    const instructions = getGoogleSheetsImportInstructions()
    alert(instructions)
  }

  const handleCreateClient = async (e) => {
    e.preventDefault()

    if (!newClientEmpresa.trim()) {
      setError('Por favor, ingresa el nombre de la empresa')
      return
    }

    try {
      setCreatingClient(true)
      console.log('Creando cliente:', newClientEmpresa)

      // 1. Crear el cliente
      const result = await createClient(
        newClientEmpresa,
        newClientEmail,
        newClientNombreComercial || newClientEmpresa
      )

      if (result.success) {
        console.log('Cliente creado:', result.clientId)

        // 2. Generar automáticamente el token
        const token = await generateAccessToken(
          newClientEmail || `${newClientEmpresa}@empresa.com`,
          newClientEmpresa
        )

        console.log('Token generado:', token)

        // 3. Crear la URL del enlace
        const fullUrl = `${window.location.origin}/onboarding/${token}`
        setGeneratedTokenUrl(fullUrl)
        setNewClientName(newClientEmpresa)

        // 4. Copiar al portapapeles
        await navigator.clipboard.writeText(fullUrl)

        // 5. Recargar clientes
        const updatedClients = await getCompanyClients('default')
        console.log('Clientes actualizados:', updatedClients)
        setClients(updatedClients)

        // 6. Mostrar modal de éxito
        setShowTokenSuccess(true)

        // 7. Limpiar formulario
        setNewClientEmpresa('')
        setNewClientEmail('')
        setNewClientNombreComercial('')
        setShowCreateClientForm(false)
      }
    } catch (err) {
      console.error('Error creando cliente:', err)
      setError(`Error al crear el cliente: ${err.message}`)
    } finally {
      setCreatingClient(false)
    }
  }

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <div className="admin-dashboard-container">
      {/* Header */}
      <div className="admin-dashboard-header">
        <div className="admin-header-left">
          <h1>Panel de Administración</h1>
          <p>Bienvenido, {user?.email}</p>
        </div>
        <button
          className="btn-logout"
          onClick={handleLogout}
        >
          Cerrar Sesión
        </button>
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        <button
          className={`tab ${activeTab === 'clients' ? 'active' : ''}`}
          onClick={() => setActiveTab('clients')}
        >
          Clientes ({clients.length})
        </button>
        <button
          className={`tab ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          Analítica
        </button>
        <button
          className={`tab ${activeTab === 'export' ? 'active' : ''}`}
          onClick={() => setActiveTab('export')}
        >
          Exportar
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className={`admin-alert ${error.includes('Error') ? 'error' : 'success'}`}>
          {error}
          <button onClick={() => setError('')}>×</button>
        </div>
      )}

      {/* Content */}
      <div className="admin-content">
        {activeTab === 'clients' && (
          <div className="admin-clients-section">
            <div className="clients-header">
              <h2>Gestión de Clientes</h2>
              <p>Visualiza el progreso de cada cliente y genera links de onboarding</p>
              <button
                className="btn btn-primary"
                onClick={() => setShowCreateClientForm(!showCreateClientForm)}
              >
                {showCreateClientForm ? '✕ Cancelar' : '+ Crear Cliente'}
              </button>
            </div>

            {/* Filtro por Estado */}
            <div className="clients-filter">
              <div className="filter-group">
                <span className="filter-label">Filtrar por estado:</span>
                <div className="filter-buttons">
                  <button
                    className={`filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('all')}
                  >
                    Todos ({clients.length})
                  </button>
                  <button
                    className={`filter-btn ${statusFilter === 'no_iniciado' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('no_iniciado')}
                  >
                    No Iniciado ({clients.filter(c => c.estado_cliente === 'no_iniciado').length})
                  </button>
                  <button
                    className={`filter-btn ${statusFilter === 'en_proceso' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('en_proceso')}
                  >
                    En Proceso ({clients.filter(c => c.estado_cliente === 'en_proceso').length})
                  </button>
                  <button
                    className={`filter-btn ${statusFilter === 'completado' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('completado')}
                  >
                    Completado ({clients.filter(c => c.estado_cliente === 'completado').length})
                  </button>
                </div>
              </div>
            </div>

            {showCreateClientForm && (
              <div className="create-client-form">
                <h3>Crear Nuevo Cliente</h3>
                <form onSubmit={handleCreateClient}>
                  <div className="form-group">
                    <label>Empresa *</label>
                    <input
                      type="text"
                      placeholder="Nombre de la empresa"
                      value={newClientEmpresa}
                      onChange={(e) => setNewClientEmpresa(e.target.value)}
                      disabled={creatingClient}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      placeholder="email@empresa.com"
                      value={newClientEmail}
                      onChange={(e) => setNewClientEmail(e.target.value)}
                      disabled={creatingClient}
                    />
                  </div>

                  <div className="form-group">
                    <label>Nombre Comercial</label>
                    <input
                      type="text"
                      placeholder="Nombre comercial (opcional)"
                      value={newClientNombreComercial}
                      onChange={(e) => setNewClientNombreComercial(e.target.value)}
                      disabled={creatingClient}
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={creatingClient}
                  >
                    {creatingClient ? 'Creando...' : 'Crear Cliente'}
                  </button>
                </form>
              </div>
            )}

            {clients.length === 0 ? (
              <div className="empty-state">
                <p>No hay clientes registrados aún.</p>
              </div>
            ) : (
              <div className="clients-table-wrapper">
                <table className="clients-table">
                  <thead>
                    <tr>
                      <th>Empresa</th>
                      <th>Email</th>
                      <th>Progreso</th>
                      <th>Estado Cliente</th>
                      <th>Estado Admin</th>
                      <th>Última Actualización</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients
                      .filter(client =>
                        statusFilter === 'all' || client.estado_cliente === statusFilter
                      )
                      .map(client => (
                      <tr key={client.id} className="client-row">
                        <td>
                          <strong>{client.nombre_empresa || client.nombre_comercial || 'Sin nombre'}</strong>
                        </td>
                        <td>{client.email || '-'}</td>
                        <td>
                          <div className="progress-cell">
                            <div className="progress-bar-small">
                              <div
                                className="progress-fill"
                                style={{ width: `${client.progreso || 0}%` }}
                              ></div>
                            </div>
                            <span>{client.progreso || 0}%</span>
                          </div>
                        </td>
                        <td>
                          <select
                            value={client.estado_cliente || 'no_iniciado'}
                            onChange={(e) => handleUpdateClientStatus(client.id, e.target.value)}
                            className="status-select"
                          >
                            <option value="no_iniciado">No Iniciado</option>
                            <option value="en_proceso">En Proceso</option>
                            <option value="completado">Completado</option>
                          </select>
                        </td>
                        <td>
                          <select
                            value={client.estado_admin || 'pendiente'}
                            onChange={(e) => handleUpdateAdminStatus(client.id, e.target.value)}
                            className="status-select"
                          >
                            <option value="pendiente">Pendiente</option>
                            <option value="en_revision">En Revisión</option>
                            <option value="finalizado">Finalizado</option>
                          </select>
                        </td>
                        <td>
                          <small>
                            {client.updatedAt
                              ? new Date(client.updatedAt.toDate?.() || client.updatedAt).toLocaleDateString()
                              : '-'}
                          </small>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button
                              className="btn-small btn-info"
                              onClick={() => setSelectedClient(client)}
                              title="Ver detalles"
                            >
                              👁️ Ver
                            </button>
                            <button
                              className="btn-small btn-success"
                              onClick={() => handleGenerateToken(client.id, client.email, client.nombre_empresa)}
                              disabled={generatingToken}
                              title="Generar y copiar link"
                            >
                              {generatingToken ? '⏳' : '🔗'} Link
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="admin-analytics-section">
            <div className="analytics-header">
              <h2>Analítica General</h2>
            </div>

            <div className="analytics-grid">
              <div className="analytics-card">
                <h3>Total de Clientes</h3>
                <p className="analytics-number">{clients.length}</p>
              </div>

              <div className="analytics-card">
                <h3>Clientes Completados</h3>
                <p className="analytics-number">
                  {clients.filter(c => c.estado_cliente === 'completado').length}
                </p>
              </div>

              <div className="analytics-card">
                <h3>En Proceso</h3>
                <p className="analytics-number">
                  {clients.filter(c => c.estado_cliente === 'en_proceso').length}
                </p>
              </div>

              <div className="analytics-card">
                <h3>Progreso Promedio</h3>
                <p className="analytics-number">
                  {clients.length > 0
                    ? Math.round(
                      clients.reduce((sum, c) => sum + (c.progreso || 0), 0) / clients.length
                    )
                    : 0}
                  %
                </p>
              </div>
            </div>

            <div className="analytics-section">
              <h3>Distribución por Estado (Cliente)</h3>
              <div className="status-distribution">
                {['no_iniciado', 'en_proceso', 'completado'].map(status => {
                  const count = clients.filter(c => c.estado_cliente === status).length
                  const percentage = clients.length > 0 ? (count / clients.length) * 100 : 0
                  return (
                    <div key={status} className="distribution-item">
                      <span className="status-label">{status}</span>
                      <div className="distribution-bar">
                        <div
                          className="distribution-fill"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <span className="distribution-value">{count} ({percentage.toFixed(1)}%)</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'export' && (
          <div className="admin-export-section">
            <div className="export-header">
              <h2>Exportar Datos de Clientes</h2>
              <p>Descarga los datos de todos los clientes en diferentes formatos</p>
            </div>

            <div className="export-grid">
              <div className="export-card">
                <h3>📊 Exportar a CSV</h3>
                <p>Descarga los datos en formato CSV compatible con Excel y Google Sheets</p>
                <button
                  className="btn-primary"
                  onClick={handleExportCSV}
                  disabled={exporting}
                >
                  {exporting ? 'Exportando...' : 'Descargar CSV'}
                </button>
                <p className="export-info">
                  Ideal para abrir en Excel o importar en Google Sheets
                </p>
              </div>

              <div className="export-card">
                <h3>📄 Exportar a JSON</h3>
                <p>Descarga todos los datos en formato JSON con estructura completa</p>
                <button
                  className="btn-primary"
                  onClick={handleExportJSON}
                  disabled={exporting}
                >
                  {exporting ? 'Exportando...' : 'Descargar JSON'}
                </button>
                <p className="export-info">
                  Formato completo con todos los campos y módulos
                </p>
              </div>

              <div className="export-card">
                <h3>📋 Guía Google Sheets</h3>
                <p>Obtén instrucciones para importar tus datos en Google Sheets</p>
                <button
                  className="btn-primary"
                  onClick={handleShowExportInstructions}
                >
                  Ver Instrucciones
                </button>
                <p className="export-info">
                  Paso a paso para importar en Google Sheets
                </p>
              </div>
            </div>

            <div className="export-info-section">
              <h3>ℹ️ Información sobre exportación</h3>
              <ul>
                <li><strong>CSV:</strong> Mejor para análisis en Excel, Google Sheets o Power BI</li>
                <li><strong>JSON:</strong> Datos completos con estructura, ideal para integración</li>
                <li><strong>Frecuencia:</strong> Exporta cuando necesites hacer backup o análisis</li>
                <li><strong>Datos incluidos:</strong> Todos los módulos y campos completados por los clientes</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Detalles del Cliente */}
      {selectedClient && (
        <div className="modal-overlay" onClick={() => setSelectedClient(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Detalles del Cliente</h2>
              <button className="modal-close" onClick={() => setSelectedClient(null)}>×</button>
            </div>

            <div className="modal-body" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
              {/* Estado del Onboarding */}
              <div className="client-detail-section">
                <h3>📊 Estado del Onboarding</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Progreso Total</label>
                    <div style={{ marginTop: '0.5rem' }}>
                      <div style={{ background: '#333', borderRadius: '4px', height: '24px', overflow: 'hidden' }}>
                        <div style={{
                          background: 'linear-gradient(90deg, #d4af37, #e5c158)',
                          height: '100%',
                          width: `${selectedClient.progreso || 0}%`,
                          transition: 'width 0.3s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          color: '#000',
                          fontWeight: 'bold'
                        }}>
                          {(selectedClient.progreso || 0) > 5 && `${selectedClient.progreso || 0}%`}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="detail-item">
                    <label>Estado Cliente</label>
                    <p style={{ fontSize: '1rem', fontWeight: 'bold', color: selectedClient.estado_cliente === 'completado' ? '#d4af37' : '#f5f5f5' }}>
                      {selectedClient.estado_cliente || 'No iniciado'}
                    </p>
                  </div>
                  <div className="detail-item">
                    <label>Estado Admin</label>
                    <p>{selectedClient.estado_admin || 'Pendiente'}</p>
                  </div>
                  <div className="detail-item">
                    <label>Última Actualización</label>
                    <p style={{ fontSize: '0.9rem' }}>
                      {selectedClient.updatedAt
                        ? new Date(selectedClient.updatedAt.toDate?.() || selectedClient.updatedAt).toLocaleString()
                        : '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Información Básica */}
              <div className="client-detail-section">
                <h3>🏢 Información Básica</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Empresa / Razón Social</label>
                    <p>{selectedClient.nombre_empresa || selectedClient.nombre_comercial || '-'}</p>
                  </div>
                  <div className="detail-item">
                    <label>Nombre Comercial</label>
                    <p>{selectedClient.nombre_comercial || '-'}</p>
                  </div>
                  <div className="detail-item">
                    <label>Sector</label>
                    <p>{selectedClient.sector || '-'}</p>
                  </div>
                  <div className="detail-item">
                    <label>Email Contacto</label>
                    <p>{selectedClient.email || '-'}</p>
                  </div>
                  <div className="detail-item">
                    <label>Teléfono</label>
                    <p>{selectedClient.telefono || '-'}</p>
                  </div>
                  <div className="detail-item">
                    <label>WhatsApp</label>
                    <p>{selectedClient.whatsapp || '-'}</p>
                  </div>
                  <div className="detail-item">
                    <label>Dirección</label>
                    <p>{selectedClient.direccion || '-'}</p>
                  </div>
                  <div className="detail-item">
                    <label>Ciudad</label>
                    <p>{selectedClient.ciudad || '-'}</p>
                  </div>
                  <div className="detail-item">
                    <label>País</label>
                    <p>{selectedClient.pais || '-'}</p>
                  </div>
                  <div className="detail-item">
                    <label>Sitio Web</label>
                    <p>{selectedClient.web ? <a href={selectedClient.web} target="_blank" rel="noopener noreferrer" style={{ color: '#d4af37' }}>{selectedClient.web}</a> : '-'}</p>
                  </div>
                  <div className="detail-item">
                    <label>Google Maps</label>
                    <p>{selectedClient.google_maps ? <a href={selectedClient.google_maps} target="_blank" rel="noopener noreferrer" style={{ color: '#d4af37' }}>Ver en Maps</a> : '-'}</p>
                  </div>
                </div>
              </div>

              {/* Redes Sociales */}
              <div className="client-detail-section">
                <h3>📱 Redes Sociales</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Instagram</label>
                    <p>{selectedClient.instagram ? <a href={`https://instagram.com/${selectedClient.instagram}`} target="_blank" rel="noopener noreferrer" style={{ color: '#d4af37' }}>@{selectedClient.instagram}</a> : '-'}</p>
                  </div>
                  <div className="detail-item">
                    <label>Facebook</label>
                    <p>{selectedClient.facebook ? <a href={selectedClient.facebook} target="_blank" rel="noopener noreferrer" style={{ color: '#d4af37' }}>Ver Página</a> : '-'}</p>
                  </div>
                  <div className="detail-item">
                    <label>Otros Enlaces</label>
                    <p>{selectedClient.otros_links || '-'}</p>
                  </div>
                  <div className="detail-item">
                    <label>Horarios de Atención</label>
                    <p>{selectedClient.horarios || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Servicio Principal */}
              {selectedClient.servicio_principal && (
                <div className="client-detail-section">
                  <h3>⭐ Servicio Principal</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {selectedClient.servicio_principal.nombre_servicio && (
                      <div><label>Nombre del Servicio:</label><p>{selectedClient.servicio_principal.nombre_servicio}</p></div>
                    )}
                    {selectedClient.servicio_principal.por_que_prioritario && (
                      <div><label>Por qué es prioritario:</label><p>{selectedClient.servicio_principal.por_que_prioritario}</p></div>
                    )}
                    {selectedClient.servicio_principal.descripcion_detallada && (
                      <div><label>Descripción Detallada:</label><p>{selectedClient.servicio_principal.descripcion_detallada}</p></div>
                    )}
                    {selectedClient.servicio_principal.que_incluye && (
                      <div><label>Qué Incluye:</label><p>{selectedClient.servicio_principal.que_incluye}</p></div>
                    )}
                    {selectedClient.servicio_principal.que_no_incluye && (
                      <div><label>Qué NO Incluye:</label><p>{selectedClient.servicio_principal.que_no_incluye}</p></div>
                    )}
                    {selectedClient.servicio_principal.para_quien && (
                      <div><label>Para Quién:</label><p>{selectedClient.servicio_principal.para_quien}</p></div>
                    )}
                    {selectedClient.servicio_principal.para_quien_no && (
                      <div><label>Para Quién NO:</label><p>{selectedClient.servicio_principal.para_quien_no}</p></div>
                    )}
                    {selectedClient.servicio_principal.precio_rango && (
                      <div><label>Rango de Precio:</label><p>{selectedClient.servicio_principal.precio_rango}</p></div>
                    )}
                    {selectedClient.servicio_principal.paquetes && (
                      <div><label>Paquetes/Modalidades:</label><p>{selectedClient.servicio_principal.paquetes}</p></div>
                    )}
                    {selectedClient.servicio_principal.financiacion && (
                      <div><label>Financiación:</label><p>{selectedClient.servicio_principal.financiacion}</p></div>
                    )}
                    {selectedClient.servicio_principal.duracion && (
                      <div><label>Duración:</label><p>{selectedClient.servicio_principal.duracion}</p></div>
                    )}
                    {selectedClient.servicio_principal.diferenciales && (
                      <div><label>Diferenciales:</label><p>{selectedClient.servicio_principal.diferenciales}</p></div>
                    )}
                    {selectedClient.servicio_principal.objeciones_frecuentes && (
                      <div><label>Objeciones Frecuentes:</label><p>{selectedClient.servicio_principal.objeciones_frecuentes}</p></div>
                    )}
                    {selectedClient.servicio_principal.casos_exito && (
                      <div><label>Casos de Éxito:</label><p>{selectedClient.servicio_principal.casos_exito}</p></div>
                    )}
                    {selectedClient.servicio_principal.faqs && (
                      <div><label>FAQs:</label><p>{selectedClient.servicio_principal.faqs}</p></div>
                    )}
                  </div>
                </div>
              )}

              {/* Cliente Ideal */}
              {selectedClient.cliente_ideal && (
                <div className="client-detail-section">
                  <h3>🎯 Cliente Ideal / Avatar</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {selectedClient.cliente_ideal.cliente_ideal && (
                      <div><label>Cliente Ideal:</label><p>{selectedClient.cliente_ideal.cliente_ideal}</p></div>
                    )}
                    {selectedClient.cliente_ideal.edad && (
                      <div><label>Edad:</label><p>{selectedClient.cliente_ideal.edad}</p></div>
                    )}
                    {selectedClient.cliente_ideal.genero && (
                      <div><label>Género:</label><p>{selectedClient.cliente_ideal.genero}</p></div>
                    )}
                    {selectedClient.cliente_ideal.ubicacion && (
                      <div><label>Ubicación:</label><p>{selectedClient.cliente_ideal.ubicacion}</p></div>
                    )}
                    {selectedClient.cliente_ideal.nivel_socioeconomico && (
                      <div><label>Nivel Socioeconómico:</label><p>{selectedClient.cliente_ideal.nivel_socioeconomico}</p></div>
                    )}
                    {selectedClient.cliente_ideal.profesion && (
                      <div><label>Profesión/Ocupación:</label><p>{selectedClient.cliente_ideal.profesion}</p></div>
                    )}
                    {selectedClient.cliente_ideal.problemas_principales && (
                      <div><label>Problemas Principales:</label><p>{selectedClient.cliente_ideal.problemas_principales}</p></div>
                    )}
                    {selectedClient.cliente_ideal.dolores_emocionales && (
                      <div><label>Dolores Emocionales:</label><p>{selectedClient.cliente_ideal.dolores_emocionales}</p></div>
                    )}
                    {selectedClient.cliente_ideal.miedos && (
                      <div><label>Miedos:</label><p>{selectedClient.cliente_ideal.miedos}</p></div>
                    )}
                    {selectedClient.cliente_ideal.deseos && (
                      <div><label>Deseos/Aspiraciones:</label><p>{selectedClient.cliente_ideal.deseos}</p></div>
                    )}
                    {selectedClient.cliente_ideal.motivaciones && (
                      <div><label>Motivaciones:</label><p>{selectedClient.cliente_ideal.motivaciones}</p></div>
                    )}
                    {selectedClient.cliente_ideal.senales_buen_lead && (
                      <div><label>Señales de Buen Lead:</label><p>{selectedClient.cliente_ideal.senales_buen_lead}</p></div>
                    )}
                    {selectedClient.cliente_ideal.senales_mal_lead && (
                      <div><label>Señales de Mal Lead:</label><p>{selectedClient.cliente_ideal.senales_mal_lead}</p></div>
                    )}
                  </div>
                </div>
              )}

              {/* Marca e Identidad Visual */}
              {selectedClient.marca && (
                <div className="client-detail-section">
                  <h3>🎨 Marca e Identidad Visual</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {selectedClient.marca.paleta_colores && (
                      <div><label>Paleta de Colores:</label><p>{selectedClient.marca.paleta_colores}</p></div>
                    )}
                    {selectedClient.marca.tipografias && (
                      <div><label>Tipografías:</label><p>{selectedClient.marca.tipografias}</p></div>
                    )}
                    {selectedClient.marca.estilo_visual && (
                      <div><label>Estilo Visual:</label><p>{selectedClient.marca.estilo_visual}</p></div>
                    )}
                    {selectedClient.marca.referencias && (
                      <div><label>Referencias/Inspiración:</label><p>{selectedClient.marca.referencias}</p></div>
                    )}
                    {selectedClient.marca.preferencias_comunicacion && (
                      <div><label>Preferencias de Comunicación:</label><p>{selectedClient.marca.preferencias_comunicacion}</p></div>
                    )}
                    {selectedClient.marca.no_hacer_con_marca && (
                      <div><label>QUÉ NO Hacer con la Marca:</label><p>{selectedClient.marca.no_hacer_con_marca}</p></div>
                    )}
                  </div>
                </div>
              )}

              {/* Meta/Facebook */}
              {selectedClient.meta && (
                <div className="client-detail-section">
                  <h3>📘 Entorno Meta / Facebook Ads</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {selectedClient.meta.tiene_activos !== undefined && (
                      <div><label>¿Tiene Activos?:</label><p>{selectedClient.meta.tiene_activos ? 'Sí' : 'No'}</p></div>
                    )}
                    {selectedClient.meta.portfolio_id && (
                      <div><label>Portfolio ID:</label><p>{selectedClient.meta.portfolio_id}</p></div>
                    )}
                    {selectedClient.meta.instagram_username && (
                      <div><label>Usuario Instagram:</label><p>@{selectedClient.meta.instagram_username}</p></div>
                    )}
                    {selectedClient.meta.business_manager_id && (
                      <div><label>Business Manager ID:</label><p>{selectedClient.meta.business_manager_id}</p></div>
                    )}
                    {selectedClient.meta.cuenta_publicitaria_id && (
                      <div><label>Cuenta Publicitaria ID:</label><p>{selectedClient.meta.cuenta_publicitaria_id}</p></div>
                    )}
                    {selectedClient.meta.pixel_id && (
                      <div><label>Pixel ID:</label><p>{selectedClient.meta.pixel_id}</p></div>
                    )}
                    {selectedClient.meta.email_acceso && (
                      <div><label>Email de Acceso:</label><p>{selectedClient.meta.email_acceso}</p></div>
                    )}
                    {selectedClient.meta.confirmacion_compartido !== undefined && (
                      <div><label>Confirmación Compartido:</label><p>{selectedClient.meta.confirmacion_compartido ? '✓ Sí' : '✗ No'}</p></div>
                    )}
                  </div>
                </div>
              )}

              {/* Google */}
              {selectedClient.google && (
                <div className="client-detail-section">
                  <h3>🔍 Entorno Google</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {selectedClient.google.google_ads_id && (
                      <div><label>Google Ads ID:</label><p>{selectedClient.google.google_ads_id}</p></div>
                    )}
                    {selectedClient.google.email_acceso_ads && (
                      <div><label>Email Google Ads:</label><p>{selectedClient.google.email_acceso_ads}</p></div>
                    )}
                    {selectedClient.google.confirmacion_ads !== undefined && (
                      <div><label>Confirmación Ads:</label><p>{selectedClient.google.confirmacion_ads ? '✓ Sí' : '✗ No'}</p></div>
                    )}
                    {selectedClient.google.google_maps_link && (
                      <div><label>Google Maps Link:</label><p><a href={selectedClient.google.google_maps_link} target="_blank" rel="noopener noreferrer" style={{ color: '#d4af37' }}>Ver</a></p></div>
                    )}
                    {selectedClient.google.email_acceso_maps && (
                      <div><label>Email Google Maps:</label><p>{selectedClient.google.email_acceso_maps}</p></div>
                    )}
                    {selectedClient.google.confirmacion_maps !== undefined && (
                      <div><label>Confirmación Maps:</label><p>{selectedClient.google.confirmacion_maps ? '✓ Sí' : '✗ No'}</p></div>
                    )}
                  </div>
                </div>
              )}

              {/* Slack */}
              {selectedClient.slack && (
                <div className="client-detail-section">
                  <h3>💬 Slack / Comunicación Operativa</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {selectedClient.slack.email_principal && (
                      <div><label>Email Principal:</label><p>{selectedClient.slack.email_principal}</p></div>
                    )}
                    {selectedClient.slack.emails_equipo && (
                      <div><label>Emails del Equipo:</label><p>{selectedClient.slack.emails_equipo}</p></div>
                    )}
                    {selectedClient.slack.responsable_principal && (
                      <div><label>Responsable Principal:</label><p>{selectedClient.slack.responsable_principal}</p></div>
                    )}
                    {selectedClient.slack.responsable_suplente && (
                      <div><label>Responsable Suplente:</label><p>{selectedClient.slack.responsable_suplente}</p></div>
                    )}
                    {selectedClient.slack.horario_respuesta && (
                      <div><label>Horario de Respuesta:</label><p>{selectedClient.slack.horario_respuesta}</p></div>
                    )}
                    {selectedClient.slack.tipos_notificaciones && (
                      <div><label>Tipos de Notificaciones:</label><p>{selectedClient.slack.tipos_notificaciones}</p></div>
                    )}
                  </div>
                </div>
              )}

              {/* IA / WhatsApp Bot */}
              {selectedClient.ia && (
                <div className="client-detail-section">
                  <h3>🤖 IA / Asistente Virtual</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {selectedClient.ia.implementar_ia !== undefined && (
                      <div><label>¿Implementar IA?:</label><p>{selectedClient.ia.implementar_ia ? 'Sí' : 'No'}</p></div>
                    )}
                    {selectedClient.ia.nombre_asistente && (
                      <div><label>Nombre del Asistente:</label><p>{selectedClient.ia.nombre_asistente}</p></div>
                    )}
                    {selectedClient.ia.canal_principal && (
                      <div><label>Canal Principal:</label><p>{selectedClient.ia.canal_principal}</p></div>
                    )}
                    {selectedClient.ia.linea_telefonica && (
                      <div><label>Línea Telefónica:</label><p>{selectedClient.ia.linea_telefonica}</p></div>
                    )}
                    {selectedClient.ia.linea_existe !== undefined && (
                      <div><label>Línea Existe:</label><p>{selectedClient.ia.linea_existe ? 'Sí' : 'No'}</p></div>
                    )}
                    {selectedClient.ia.linea_actual_activa !== undefined && (
                      <div><label>Línea Actual Activa:</label><p>{selectedClient.ia.linea_actual_activa ? 'Sí' : 'No'}</p></div>
                    )}
                    {selectedClient.ia.whatsapp_tipo && (
                      <div><label>Tipo de WhatsApp:</label><p>{selectedClient.ia.whatsapp_tipo}</p></div>
                    )}
                    {selectedClient.ia.tono && (
                      <div><label>Tono de Comunicación:</label><p>{selectedClient.ia.tono}</p></div>
                    )}
                    {selectedClient.ia.que_responder && (
                      <div><label>Qué Responder:</label><p>{selectedClient.ia.que_responder}</p></div>
                    )}
                    {selectedClient.ia.que_no_responder && (
                      <div><label>Qué NO Responder:</label><p>{selectedClient.ia.que_no_responder}</p></div>
                    )}
                    {selectedClient.ia.cuando_derivar && (
                      <div><label>Cuándo Derivar:</label><p>{selectedClient.ia.cuando_derivar}</p></div>
                    )}
                    {selectedClient.ia.datos_recoger && (
                      <div><label>Datos a Recoger:</label><p>{selectedClient.ia.datos_recoger}</p></div>
                    )}
                    {selectedClient.ia.objetivo_principal && (
                      <div><label>Objetivo Principal:</label><p>{selectedClient.ia.objetivo_principal}</p></div>
                    )}
                    {selectedClient.ia.base_conocimiento && (
                      <div><label>Tipo Base de Conocimiento:</label><p>{selectedClient.ia.base_conocimiento}</p></div>
                    )}
                    {selectedClient.ia.base_conocimiento_texto && (
                      <div><label>Base de Conocimiento (Texto):</label><p>{selectedClient.ia.base_conocimiento_texto}</p></div>
                    )}
                  </div>
                </div>
              )}

              {/* Inspiración */}
              {selectedClient.inspiracion && (
                <div className="client-detail-section">
                  <h3>✨ Inspiración y Referencias</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {selectedClient.inspiracion.webs_referencia && (
                      <div><label>Webs de Referencia:</label><p>{selectedClient.inspiracion.webs_referencia}</p></div>
                    )}
                    {selectedClient.inspiracion.anuncios_gustan && (
                      <div><label>Anuncios que te Gustan:</label><p>{selectedClient.inspiracion.anuncios_gustan}</p></div>
                    )}
                    {selectedClient.inspiracion.competidores && (
                      <div><label>Competidores a Analizar:</label><p>{selectedClient.inspiracion.competidores}</p></div>
                    )}
                    {selectedClient.inspiracion.marcas_gustan && (
                      <div><label>Marcas que te Gustan:</label><p>{selectedClient.inspiracion.marcas_gustan}</p></div>
                    )}
                    {selectedClient.inspiracion.marcas_no_parecer && (
                      <div><label>Marcas QUÉ NO Parecer:</label><p>{selectedClient.inspiracion.marcas_no_parecer}</p></div>
                    )}
                    {selectedClient.inspiracion.tono_ejemplos && (
                      <div><label>Tono/Ejemplos:</label><p>{selectedClient.inspiracion.tono_ejemplos}</p></div>
                    )}
                    {selectedClient.inspiracion.comentarios_adicionales && (
                      <div><label>Comentarios Adicionales:</label><p>{selectedClient.inspiracion.comentarios_adicionales}</p></div>
                    )}
                  </div>
                </div>
              )}

              {/* Agendamiento */}
              {selectedClient.agendamiento && (
                <div className="client-detail-section">
                  <h3>📅 Agendamiento de Meeting</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {selectedClient.agendamiento.meeting_agendado !== undefined && (
                      <div><label>Meeting Agendado:</label><p>{selectedClient.agendamiento.meeting_agendado ? 'Sí' : 'No'}</p></div>
                    )}
                    {selectedClient.agendamiento.fecha_agendamiento && (
                      <div><label>Fecha:</label><p>{new Date(selectedClient.agendamiento.fecha_agendamiento).toLocaleDateString()}</p></div>
                    )}
                    {selectedClient.agendamiento.hora_agendamiento && (
                      <div><label>Hora:</label><p>{selectedClient.agendamiento.hora_agendamiento}</p></div>
                    )}
                    {selectedClient.agendamiento.calendario_link && (
                      <div><label>Link Calendario:</label><p><a href={selectedClient.agendamiento.calendario_link} target="_blank" rel="noopener noreferrer" style={{ color: '#d4af37' }}>Agendar</a></p></div>
                    )}
                  </div>
                </div>
              )}

              {/* Generar Link de Acceso */}
              <div className="client-detail-section">
                <h3>🔗 Generar Link de Acceso</h3>
                <p style={{ marginBottom: '1rem', color: '#d0d0d0' }}>
                  Genera un nuevo link de invitación para este cliente. El link se copiará automáticamente al portapapeles.
                </p>
                <button
                  className="btn-primary"
                  onClick={() => handleGenerateToken(
                    selectedClient.id,
                    selectedClient.email,
                    selectedClient.nombre_empresa
                  )}
                  disabled={generatingToken}
                  style={{ width: '100%' }}
                >
                  {generatingToken ? '⏳ Generando...' : '🔗 Generar Nuevo Link'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Nuevo Token */}
      {showNewTokenModal && selectedClient && (
        <div className="modal-overlay" onClick={() => setShowNewTokenModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Generar Link de Invitación</h2>
              <button className="modal-close" onClick={() => setShowNewTokenModal(false)}>×</button>
            </div>

            <div className="modal-body">
              <p>Se generará un nuevo link para {selectedClient.nombre_empresa || selectedClient.nombre_comercial}</p>
              <p style={{ fontSize: '0.9rem', color: '#d0d0d0' }}>
                El link será válido por 30 días.
              </p>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button
                  className="btn-primary"
                  onClick={() => handleGenerateToken(
                    selectedClient.id,
                    selectedClient.email,
                    selectedClient.nombre_empresa
                  )}
                  disabled={generatingToken}
                >
                  {generatingToken ? 'Generando...' : 'Generar y Copiar'}
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => setShowNewTokenModal(false)}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Token Generado Exitosamente */}
      {showTokenSuccess && (
        <div className="modal-overlay" onClick={() => setShowTokenSuccess(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>✓ Cliente Creado Exitosamente</h2>
              <button className="modal-close" onClick={() => setShowTokenSuccess(false)}>×</button>
            </div>

            <div className="modal-body">
              <div style={{ marginBottom: '1.5rem' }}>
                <p style={{ marginBottom: '0.5rem' }}>
                  <strong>Empresa:</strong> {newClientName}
                </p>
                <p style={{ fontSize: '0.9rem', color: '#d0d0d0', marginBottom: '1.5rem' }}>
                  El enlace ha sido copiado al portapapeles automáticamente.
                </p>
              </div>

              <div style={{
                background: 'rgba(0, 0, 0, 0.5)',
                border: '1px solid #d4af37',
                borderRadius: '6px',
                padding: '1rem',
                marginBottom: '1.5rem',
                wordBreak: 'break-all',
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                color: '#d4af37'
              }}>
                {generatedTokenUrl}
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}>
                <button
                  className="btn-primary"
                  onClick={async () => {
                    await navigator.clipboard.writeText(generatedTokenUrl)
                    setError('Enlace copiado al portapapeles')
                  }}
                >
                  📋 Copiar Enlace
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => setShowTokenSuccess(false)}
                >
                  Cerrar
                </button>
              </div>

              <p style={{ fontSize: '0.8rem', color: '#a0a0a0', marginTop: '1.5rem' }}>
                💡 <strong>Tip:</strong> Comparte este enlace con el cliente. Es válido por 30 días.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
