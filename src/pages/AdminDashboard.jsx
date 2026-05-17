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
import StatusBadge from '../components/StatusBadge'
import ProgressIndicator from '../components/ProgressIndicator'
import ClientCard from '../components/ClientCard'
import ClientCardGrid from '../components/ClientCardGrid'
import FilterBar from '../components/FilterBar'
import DashboardSummary from '../components/DashboardSummary'
import './pages.css'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const logoUrl = new URL('../assets/images/logo-alphalux.png', import.meta.url).href
  const [user, setUser] = useState(null)
  const [clients, setClients] = useState([])
  const [tokens, setTokens] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('clients') // clients, analytics, export
  const [selectedClient, setSelectedClient] = useState(null)
  const [showNewTokenModal, setShowNewTokenModal] = useState(false)
  const [generatingToken, setGeneratingToken] = useState(null) // stores clientId being generated
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

  // Auto-update client status based on progress
  useEffect(() => {
    clients.forEach(client => {
      // Update to "en_proceso" when progress > 0 and currently "no_iniciado"
      if (client.progreso > 0 && client.estado_cliente === 'no_iniciado') {
        handleUpdateClientStatus(client.id, 'en_proceso')
      }
      // Update to "completado" when progress reaches 100% and status is "en_proceso"
      else if (client.progreso === 100 && client.estado_cliente === 'en_proceso') {
        handleUpdateClientStatus(client.id, 'completado')
      }
    })
  }, [clients])

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
      setGeneratingToken(clientId)
      const { token, slug } = await generateAccessToken(clientEmail, clientCompany)

      // Actualizar tokens locales
      const updatedTokens = { ...tokens }
      updatedTokens[clientId] = [
        ...(updatedTokens[clientId] || []),
        { token, status: 'active' }
      ]
      setTokens(updatedTokens)

      // Copiar al portapapeles
      const fullUrl = `${window.location.origin}/onboarding/${slug}`
      navigator.clipboard.writeText(fullUrl)

      setError('Token generado y copiado al portapapeles')
      setShowNewTokenModal(false)
    } catch (err) {
      console.error('Error generating token:', err)
      setError('Error al generar token')
    } finally {
      setGeneratingToken(null)
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

  const handleStatusChange = (clientId, statusType, newStatus) => {
    if (statusType === 'estado_cliente') {
      handleUpdateClientStatus(clientId, newStatus)
    } else if (statusType === 'estado_admin') {
      handleUpdateAdminStatus(clientId, newStatus)
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
        const { token, slug } = await generateAccessToken(
          newClientEmail || `${newClientEmpresa}@empresa.com`,
          newClientEmpresa
        )

        console.log('Token generado:', token, 'Slug:', slug)

        // 3. Crear la URL del enlace
        const fullUrl = `${window.location.origin}/onboarding/${slug}`
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
        <div className="admin-header-logo">
          <img src={logoUrl} alt="Alphalux" />
        </div>
        <div className="admin-header-right">
          <div className="admin-header-user">
            <span className="admin-header-user-role">Administrador</span>
            <span className="admin-header-user-email">{user?.email}</span>
          </div>
          <button
            className="btn-logout"
            onClick={handleLogout}
          >
            Salir
          </button>
        </div>
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
              <div className="clients-header-info">
                <h2>Gestión de Clientes</h2>
                <p>Visualiza el progreso de cada cliente y genera links de onboarding</p>
              </div>
              <button
                className="btn btn-primary"
                onClick={() => setShowCreateClientForm(true)}
              >
                + Nuevo Cliente
              </button>
            </div>

            {/* Modal Crear Cliente */}
            {showCreateClientForm && (
              <div
                className="modal-overlay"
                onClick={(e) => { if (e.target === e.currentTarget) setShowCreateClientForm(false) }}
              >
                <div className="modal-content create-client-modal">
                  <div className="modal-header">
                    <div className="create-client-modal-title">
                      <span className="create-client-modal-icon">+</span>
                      <h2>Nuevo Cliente</h2>
                    </div>
                    <button
                      className="modal-close"
                      onClick={() => setShowCreateClientForm(false)}
                    >
                      ×
                    </button>
                  </div>

                  <div className="create-client-modal-body">
                    <form onSubmit={handleCreateClient}>
                      <div className="create-client-fields">
                        <div className="form-group">
                          <label>Empresa <span className="field-required">*</span></label>
                          <input
                            type="text"
                            placeholder="Nombre de la empresa"
                            value={newClientEmpresa}
                            onChange={(e) => setNewClientEmpresa(e.target.value)}
                            disabled={creatingClient}
                            required
                            autoFocus
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
                            placeholder="Opcional"
                            value={newClientNombreComercial}
                            onChange={(e) => setNewClientNombreComercial(e.target.value)}
                            disabled={creatingClient}
                          />
                        </div>
                      </div>

                      <div className="create-client-modal-footer">
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => setShowCreateClientForm(false)}
                          disabled={creatingClient}
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="btn btn-primary"
                          disabled={creatingClient}
                        >
                          {creatingClient ? 'Creando...' : 'Crear Cliente'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}

            <DashboardSummary clients={clients} />

            <div className="filter-section">
              <FilterBar
                statusFilter={statusFilter}
                onFilterChange={setStatusFilter}
                statusCounts={{
                  total: clients.length,
                  no_iniciado: clients.filter(c => c.estado_cliente === 'no_iniciado').length,
                  en_proceso: clients.filter(c => c.estado_cliente === 'en_proceso').length,
                  completado: clients.filter(c => c.estado_cliente === 'completado').length,
                  necesita_ayuda: clients.filter(c => c.google?.entorno_google_help === true).length
                }}
              />
            </div>

            <ClientCardGrid isEmpty={clients.length === 0}>
              {clients
                .filter(client => {
                  if (statusFilter === 'all') return true
                  if (statusFilter === 'necesita_ayuda') return client.google?.entorno_google_help === true
                  return client.estado_cliente === statusFilter
                })
                .map(client => (
                  <ClientCard
                    key={client.id}
                    client={client}
                    onViewDetails={setSelectedClient}
                    onGenerateToken={() => handleGenerateToken(client.id, client.email, client.nombre_empresa)}
                    onStatusChange={handleStatusChange}
                    generatingToken={generatingToken === client.id}
                  />
                ))}
            </ClientCardGrid>
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
                <p className="analytics-subtitle">Todos los clientes registrados</p>
              </div>

              <div className="analytics-card analytics-card--completed">
                <h3>Completados</h3>
                <p className="analytics-number">
                  {clients.filter(c => c.estado_cliente === 'completado').length}
                </p>
                <p className="analytics-subtitle">
                  {clients.length > 0 ? (((clients.filter(c => c.estado_cliente === 'completado').length / clients.length) * 100).toFixed(1)) : 0}% del total
                </p>
              </div>

              <div className="analytics-card analytics-card--progress">
                <h3>En Proceso</h3>
                <p className="analytics-number">
                  {clients.filter(c => c.estado_cliente === 'en_proceso').length}
                </p>
                <p className="analytics-subtitle">
                  {clients.length > 0 ? (((clients.filter(c => c.estado_cliente === 'en_proceso').length / clients.length) * 100).toFixed(1)) : 0}% del total
                </p>
              </div>

              <div className="analytics-card analytics-card--help">
                <h3>Necesita Ayuda</h3>
                <p className="analytics-number">
                  {clients.filter(c => c.google?.entorno_google_help === true).length}
                </p>
                <p className="analytics-subtitle">Requieren soporte setup</p>
              </div>

              <div className="analytics-card analytics-card--progress-avg">
                <h3>Progreso Promedio</h3>
                <p className="analytics-number">
                  {clients.length > 0
                    ? Math.round(
                      clients.reduce((sum, c) => sum + (c.progreso || 0), 0) / clients.length
                    )
                    : 0}
                  %
                </p>
                <p className="analytics-subtitle">De todos los clientes</p>
              </div>
            </div>

            <div className="analytics-section">
              <h3>Distribución por Estado</h3>
              <div className="status-distribution">
                {[
                  { key: 'no_iniciado', label: 'No Iniciado', color: '#ff6b6b' },
                  { key: 'en_proceso', label: 'En Proceso', color: '#d4af37' },
                  { key: 'completado', label: 'Completado', color: '#22c55e' }
                ].map(status => {
                  const count = clients.filter(c => c.estado_cliente === status.key).length
                  const percentage = clients.length > 0 ? (count / clients.length) * 100 : 0
                  return (
                    <div key={status.key} className="distribution-item">
                      <span className="status-label">{status.label}</span>
                      <div className="distribution-bar">
                        <div
                          className="distribution-fill"
                          style={{ width: `${percentage}%`, background: status.color }}
                        ></div>
                      </div>
                      <span className="distribution-value">{count} ({percentage.toFixed(1)}%)</span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="analytics-section">
              <h3>Estado de Ayuda Requerida</h3>
              <div className="status-distribution">
                {[
                  { key: 'ayuda', label: 'Requieren Ayuda', count: clients.filter(c => c.google?.entorno_google_help === true).length },
                  { key: 'no_ayuda', label: 'Configurado', count: clients.filter(c => c.google?.entorno_google_help === false).length },
                  { key: 'indeciso', label: 'No Decidido', count: clients.filter(c => c.google?.entorno_google_help === null || c.google?.entorno_google_help === undefined).length }
                ].map(item => {
                  const percentage = clients.length > 0 ? (item.count / clients.length) * 100 : 0
                  return (
                    <div key={item.key} className="distribution-item">
                      <span className="status-label">{item.label}</span>
                      <div className="distribution-bar">
                        <div
                          className="distribution-fill"
                          style={{
                            width: `${percentage}%`,
                            background: item.key === 'ayuda' ? '#ff6b6b' : item.key === 'no_ayuda' ? '#22c55e' : '#d4af37'
                          }}
                        ></div>
                      </div>
                      <span className="distribution-value">{item.count} ({percentage.toFixed(1)}%)</span>
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

            <div className="modal-body modal-body-scrollable">
              {/* Estado del Onboarding */}
              <div className="client-detail-section">
                <h3>📊 Estado del Onboarding</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Progreso Total</label>
                    <div className="mt-0-5rem">
                      <div className="progress-bar-container">
                        <div className="progress-bar-fill-admin" style={{ width: `${selectedClient.progreso || 0}%` }}>
                          {(selectedClient.progreso || 0) > 5 && `${selectedClient.progreso || 0}%`}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="detail-item">
                    <label>Estado Cliente</label>
                    <p className="font-bold" style={{ fontSize: '1rem', color: selectedClient.estado_cliente === 'completado' ? '#d4af37' : '#f5f5f5' }}>
                      {selectedClient.estado_cliente || 'No iniciado'}
                    </p>
                  </div>
                  <div className="detail-item">
                    <label>Estado Admin</label>
                    <p>{selectedClient.estado_admin || 'Pendiente'}</p>
                  </div>
                  <div className="detail-item">
                    <label>Última Actualización</label>
                    <p className="text-sm">
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
                    <p>{selectedClient.web ? <a href={selectedClient.web} target="_blank" rel="noopener noreferrer" className="link-gold">{selectedClient.web}</a> : '-'}</p>
                  </div>
                </div>
              </div>

              {/* Redes Sociales */}
              <div className="client-detail-section">
                <h3>📱 Redes Sociales</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Instagram</label>
                    <p>{selectedClient.instagram ? <a href={`https://instagram.com/${selectedClient.instagram}`} target="_blank" rel="noopener noreferrer" className="link-gold">@{selectedClient.instagram}</a> : '-'}</p>
                  </div>
                  <div className="detail-item">
                    <label>Facebook</label>
                    <p>{selectedClient.facebook ? <a href={selectedClient.facebook} target="_blank" rel="noopener noreferrer" className="link-gold">Ver Página</a> : '-'}</p>
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
                  <div className="flex-column-gap">
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
                  <div className="flex-column-gap">
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
                  <div className="flex-column-gap">
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
                  <div className="flex-column-gap">
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
                  <div className="flex-column-gap">
                    {selectedClient.google.entorno_google_status && (
                      <div>
                        <label>Situación Actual:</label>
                        <p>
                          {selectedClient.google.entorno_google_status === 'si' && '✅ Tiene Google configurado'}
                          {selectedClient.google.entorno_google_status === 'no' && '❌ Necesita ayuda para configurar'}
                          {selectedClient.google.entorno_google_status === 'no_seguro' && '❓ No está seguro'}
                        </p>
                      </div>
                    )}
                    {selectedClient.google.entorno_google_help !== undefined && (
                      <div>
                        <label>Estado de Soporte:</label>
                        <p>
                          {selectedClient.google.entorno_google_help === true && '⚠️ Cliente necesita asistencia de setup'}
                          {selectedClient.google.entorno_google_help === false && '✓ Cliente tiene todo configurado'}
                          {selectedClient.google.entorno_google_help === null && '❓ Cliente aún indeciso'}
                        </p>
                      </div>
                    )}
                    {selectedClient.google.google_maps_link && (
                      <div>
                        <label>Google Business Profile:</label>
                        <p>
                          <a href={selectedClient.google.google_maps_link} target="_blank" rel="noopener noreferrer" className="link-gold">
                            📍 Ver en Google Maps
                          </a>
                        </p>
                      </div>
                    )}
                    {selectedClient.google.entorno_google_confirmation && (
                      <div><label>Confirmación:</label><p>✓ Confirmado</p></div>
                    )}
                  </div>
                </div>
              )}

              {/* Slack */}
              {selectedClient.slack && (
                <div className="client-detail-section">
                  <h3>💬 Slack / Comunicación Operativa</h3>
                  <div className="flex-column-gap">
                    {selectedClient.slack.tutorial_visto && (
                      <div><label>Tutorial Visto:</label><p>{selectedClient.slack.tutorial_visto ? '✓ Sí' : '✗ No'}</p></div>
                    )}
                    {selectedClient.slack.email_principal_empresa && (
                      <div><label>Email Principal Empresa:</label><p>{selectedClient.slack.email_principal_empresa}</p></div>
                    )}
                    {selectedClient.slack.emails_equipo && (
                      <div><label>Emails del Equipo:</label><p>{selectedClient.slack.emails_equipo.split('\n').join(', ')}</p></div>
                    )}
                    {selectedClient.slack.slack_status && (
                      <div><label>Estado Slack:</label><p>{selectedClient.slack.slack_status === 'completado' ? '✓ Completado' : '🆘 Necesita Ayuda'}</p></div>
                    )}
                    {selectedClient.slack.slack_needs_help && (
                      <div><label>Requiere Asistencia:</label><p style={{color: '#ff9800', fontWeight: 'bold'}}>⚠️ Sí, cliente necesita ayuda</p></div>
                    )}
                  </div>
                </div>
              )}

              {/* IA / WhatsApp Bot */}
              {selectedClient.ia && (
                <div className="client-detail-section">
                  <h3>🤖 IA / Asistente Virtual</h3>
                  <div className="flex-column-gap">
                    {selectedClient.ia.implementar_ia !== undefined && (
                      <div><label>¿Implementar IA?:</label><p>{selectedClient.ia.implementar_ia ? '✓ Sí' : '✗ No'}</p></div>
                    )}
                    {selectedClient.ia.nombre_asistente && (
                      <div><label>Nombre del Asistente:</label><p>{selectedClient.ia.nombre_asistente}</p></div>
                    )}
                    {selectedClient.ia.objetivo_principal && (
                      <div><label>Objetivo Principal:</label><p>{selectedClient.ia.objetivo_principal}</p></div>
                    )}
                    {selectedClient.ia.tono && (
                      <div><label>Tono de Comunicación:</label><p>{selectedClient.ia.tono}</p></div>
                    )}
                    {selectedClient.ia.que_responder && (
                      <div><label>Qué Debe Responder:</label><p>{selectedClient.ia.que_responder}</p></div>
                    )}
                    {selectedClient.ia.que_no_responder && (
                      <div><label>Qué NO Debe Responder:</label><p>{selectedClient.ia.que_no_responder}</p></div>
                    )}
                    {selectedClient.ia.cuando_derivar && (
                      <div><label>Cuándo Derivar a Humano:</label><p>{selectedClient.ia.cuando_derivar}</p></div>
                    )}
                    {selectedClient.ia.datos_recoger && (
                      <div><label>Datos a Recopilar:</label><p>{selectedClient.ia.datos_recoger}</p></div>
                    )}
                    {selectedClient.ia.base_conocimiento && (
                      <div><label>Tipo de Base de Conocimiento:</label><p>{selectedClient.ia.base_conocimiento === 'texto' ? '📝 Texto Directo' : selectedClient.ia.base_conocimiento === 'prompt' ? '🤖 Prompt ChatGPT' : '📁 Archivo Cargado'}</p></div>
                    )}
                    {selectedClient.ia.base_conocimiento_texto && (
                      <div><label>Contenido (Opción A - Texto):</label><p>{selectedClient.ia.base_conocimiento_texto}</p></div>
                    )}
                    {selectedClient.ia.base_conocimiento_archivo_nombre && (
                      <div><label>Archivo Cargado (Opción C):</label><p>📎 {selectedClient.ia.base_conocimiento_archivo_nombre}</p></div>
                    )}
                  </div>
                </div>
              )}

              {/* Inspiración */}
              {selectedClient.inspiracion && (
                <div className="client-detail-section">
                  <h3>✨ Inspiración y Referencias</h3>
                  <div className="flex-column-gap">
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
                  <div className="flex-column-gap">
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
                      <div><label>Link Calendario:</label><p><a href={selectedClient.agendamiento.calendario_link} target="_blank" rel="noopener noreferrer" className="link-gold">Agendar</a></p></div>
                    )}
                  </div>
                </div>
              )}

              {/* Generar Link de Acceso */}
              <div className="client-detail-section">
                <h3>🔗 Generar Link de Acceso</h3>
                <p className="mb-1rem text-xs-secondary">
                  Genera un nuevo link de invitación para este cliente. El link se copiará automáticamente al portapapeles.
                </p>
                <button
                  className="btn-primary w-100"
                  onClick={() => handleGenerateToken(
                    selectedClient.id,
                    selectedClient.email,
                    selectedClient.nombre_empresa
                  )}
                  disabled={generatingToken}
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
              <p className="text-sm-secondary">
                El link será válido por 30 días.
              </p>

              <div className="flex-row-gap-mt">
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
          <div className="modal-content modal-success-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>✓ Cliente Creado Exitosamente</h2>
              <button className="modal-close" onClick={() => setShowTokenSuccess(false)}>×</button>
            </div>

            <div className="modal-body">
              <div className="mb-1-5rem">
                <p className="mb-0-5rem">
                  <strong>Empresa:</strong> {newClientName}
                </p>
                <p className="text-sm-secondary mb-1-5rem">
                  El enlace ha sido copiado al portapapeles automáticamente.
                </p>
              </div>

              <div className="token-code-box">
                {generatedTokenUrl}
              </div>

              <div className="flex-column-gap">
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

              <p className="text-xs-secondary mt-1-5rem">
                💡 <strong>Tip:</strong> Comparte este enlace con el cliente. Es válido por 30 días.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
