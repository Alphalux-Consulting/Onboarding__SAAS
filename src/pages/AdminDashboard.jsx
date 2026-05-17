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

  // Auto-sync client status from progress — always truth-driven
  useEffect(() => {
    clients.forEach(client => {
      const p = client.progreso || 0
      const current = client.estado_cliente

      if (p === 0 && current !== 'no_iniciado') {
        handleUpdateClientStatus(client.id, 'no_iniciado')
      } else if (p > 0 && p < 100 && current !== 'en_proceso') {
        handleUpdateClientStatus(client.id, 'en_proceso')
      } else if (p === 100 && current !== 'completado') {
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
                  no_iniciado: clients.filter(c => (c.progreso || 0) === 0).length,
                  en_proceso: clients.filter(c => { const p = c.progreso || 0; return p > 0 && p < 100 }).length,
                  completado: clients.filter(c => (c.progreso || 0) === 100).length,
                  necesita_ayuda: clients.filter(c =>
                    c.google?.entorno_google_help === true ||
                    c.slack?.slack_needs_help === true ||
                    c.slack?.slack_status === 'necesita_ayuda'
                  ).length
                }}
              />
            </div>

            <ClientCardGrid isEmpty={clients.length === 0}>
              {clients
                .filter(client => {
                  if (statusFilter === 'all') return true
                  if (statusFilter === 'no_iniciado') return (client.progreso || 0) === 0
                  if (statusFilter === 'en_proceso') { const p = client.progreso || 0; return p > 0 && p < 100 }
                  if (statusFilter === 'completado') return (client.progreso || 0) === 100
                  if (statusFilter === 'necesita_ayuda') return (
                    client.google?.entorno_google_help === true ||
                    client.slack?.slack_needs_help === true ||
                    client.slack?.slack_status === 'necesita_ayuda'
                  )
                  return true
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
                  {clients.filter(c => (c.progreso || 0) === 100).length}
                </p>
                <p className="analytics-subtitle">
                  {clients.length > 0 ? (((clients.filter(c => (c.progreso || 0) === 100).length / clients.length) * 100).toFixed(1)) : 0}% del total
                </p>
              </div>

              <div className="analytics-card analytics-card--progress">
                <h3>En Proceso</h3>
                <p className="analytics-number">
                  {clients.filter(c => { const p = c.progreso || 0; return p > 0 && p < 100 }).length}
                </p>
                <p className="analytics-subtitle">
                  {clients.length > 0 ? (((clients.filter(c => { const p = c.progreso || 0; return p > 0 && p < 100 }).length / clients.length) * 100).toFixed(1)) : 0}% del total
                </p>
              </div>

              <div className="analytics-card analytics-card--help">
                <h3>Necesita Ayuda</h3>
                <p className="analytics-number">
                  {clients.filter(c =>
                    c.google?.entorno_google_help === true ||
                    c.slack?.slack_needs_help === true ||
                    c.slack?.slack_status === 'necesita_ayuda'
                  ).length}
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

      {/* ──────────────────────────────────────────────────────────
           Modal de Detalles del Cliente — REDESIGNED
           Wide layout · circular progress · 2-3 col grid · export
           ────────────────────────────────────────────────────────── */}
      {selectedClient && (
        <div className="modal-overlay" onClick={() => setSelectedClient(null)}>
          <div className="client-modal" onClick={(e) => e.stopPropagation()}>

            {/* ── TOP BAR ─────────────────────────────────────────── */}
            <div className="client-modal-topbar">
              <span className="client-modal-topbar-title">Perfil del Cliente</span>
              <div className="client-modal-topbar-actions">
                <button className="cmt-export-btn" onClick={handleExportCSV} disabled={exporting} title="Exportar CSV">
                  📊 {exporting ? '...' : 'CSV'}
                </button>
                <button className="cmt-export-btn" onClick={handleExportJSON} disabled={exporting} title="Exportar JSON">
                  📄 JSON
                </button>
                <button className="client-modal-close" onClick={() => setSelectedClient(null)}>×</button>
              </div>
            </div>

            {/* ── HERO CARD ───────────────────────────────────────── */}
            <div className="client-modal-hero">

              {/* Row 1: avatar + identity info | circular progress */}
              <div className="client-modal-hero-top">
                <div className="client-modal-identity">
                  <div className="client-modal-avatar">
                    {(selectedClient.nombre_empresa || selectedClient.nombre_comercial || '?')[0].toUpperCase()}
                  </div>
                  <div className="client-modal-names">
                    <h2 className="cmi-company">
                      {selectedClient.nombre_empresa || selectedClient.nombre_comercial || 'Sin nombre'}
                    </h2>
                    {selectedClient.info_basica?.nombre_comercial && selectedClient.info_basica.nombre_comercial !== selectedClient.nombre_empresa && (
                      <p className="cmi-sub">{selectedClient.info_basica.nombre_comercial}</p>
                    )}
                    <div className="cmi-chips">
                      {selectedClient.info_basica?.sector && (
                        <span className="cmi-chip">{selectedClient.info_basica.sector}</span>
                      )}
                      {(selectedClient.info_basica?.ciudad || selectedClient.info_basica?.pais) && (
                        <span className="cmi-chip">
                          📍 {[selectedClient.info_basica?.ciudad, selectedClient.info_basica?.pais].filter(Boolean).join(', ')}
                        </span>
                      )}
                      {(selectedClient.info_basica?.email || selectedClient.email) && (
                        <span className="cmi-chip">✉️ {selectedClient.info_basica?.email || selectedClient.email}</span>
                      )}
                      {selectedClient.info_basica?.telefono && (
                        <span className="cmi-chip">📞 {selectedClient.info_basica.telefono}</span>
                      )}
                    </div>
                    <div className="cmi-status-row">
                      <span className={`cmi-status-badge cmi-status-badge--${selectedClient.estado_cliente || 'no_iniciado'}`}>
                        {selectedClient.estado_cliente === 'completado' ? '✓ Completado'
                          : selectedClient.estado_cliente === 'en_proceso' ? '⟳ En Proceso'
                          : '○ No Iniciado'}
                      </span>
                      <span className={`cmi-status-badge cmi-status-badge--admin-${selectedClient.estado_admin || 'pendiente'}`}>
                        {selectedClient.estado_admin === 'finalizado' ? '✓ Finalizado'
                          : selectedClient.estado_admin === 'en_revision' ? '👁 En Revisión'
                          : '◷ Pendiente'}
                      </span>
                      {selectedClient.updatedAt && (
                        <span className="cmi-chip" style={{ fontSize: '0.6rem' }}>
                          🕐 {new Date(selectedClient.updatedAt.toDate?.() || selectedClient.updatedAt).toLocaleDateString('es-ES')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Circular progress — right side of row 1 */}
                <div className="cmp-circle">
                  <svg viewBox="0 0 120 120" className="cmp-svg">
                    <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
                    <circle
                      cx="60" cy="60" r="50" fill="none"
                      stroke={selectedClient.progreso >= 100 ? '#22c55e' : '#d4af37'}
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 50}`}
                      strokeDashoffset={`${2 * Math.PI * 50 * (1 - (selectedClient.progreso || 0) / 100)}`}
                      transform="rotate(-90 60 60)"
                      style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.34,1.56,0.64,1)' }}
                    />
                    <text x="60" y="57" textAnchor="middle" fill="#f5f5f5" fontSize="22" fontWeight="700" fontFamily="Inter,sans-serif">
                      {selectedClient.progreso || 0}%
                    </text>
                    <text x="60" y="73" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="9" fontFamily="Inter,sans-serif" letterSpacing="1">
                      PROGRESO
                    </text>
                  </svg>
                </div>
              </div>

              {/* Row 2: module pills — horizontal strip */}
              <div className="cmp-modules">
                {[
                  { key: 'info_basica',        icon: '🏢', label: 'Empresa' },
                  { key: 'servicio_principal', icon: '⭐', label: 'Servicio' },
                  { key: 'cliente_ideal',      icon: '🎯', label: 'Cliente' },
                  { key: 'marca',              icon: '🎨', label: 'Marca' },
                  { key: 'meta',               icon: '📘', label: 'Meta' },
                  { key: 'google',             icon: '🔍', label: 'Google' },
                  { key: 'slack',              icon: '💬', label: 'Slack' },
                  { key: 'ia',                 icon: '🤖', label: 'IA' },
                  { key: 'inspiracion',        icon: '✨', label: 'Inspira.' },
                  { key: 'agendamiento',       icon: '📅', label: 'Meeting' },
                ].map(mod => {
                  const done = selectedClient[mod.key] && Object.keys(selectedClient[mod.key]).length > 0
                  return (
                    <div key={mod.key} className={`cmp-pill${done ? ' cmp-pill--done' : ''}`}>
                      <span className="cmp-pill-icon">{mod.icon}</span>
                      <span className="cmp-pill-label">{mod.label}</span>
                      {done && <span className="cmp-pill-check">✓</span>}
                    </div>
                  )
                })}
              </div>

            </div>

            {/* ── SCROLLABLE BODY ─────────────────────────────────── */}
            <div className="client-modal-body">

              {/* ── Gestión de Estado ────────────────────────────── */}
              <div className="cds">
                <div className="cds-head">
                  <span className="cds-head-icon">⚙️</span>
                  <h3>Gestión de Estado</h3>
                </div>
                <div className="cds-grid cds-grid--3">
                  <div className="cds-field">
                    <label>Estado Cliente</label>
                    <select
                      className="cds-select"
                      value={selectedClient.estado_cliente || 'no_iniciado'}
                      onChange={(e) => handleStatusChange(selectedClient.id, 'estado_cliente', e.target.value)}
                    >
                      <option value="no_iniciado">No Iniciado</option>
                      <option value="en_proceso">En Proceso</option>
                      <option value="completado">Completado</option>
                    </select>
                  </div>
                  <div className="cds-field">
                    <label>Estado Admin</label>
                    <select
                      className="cds-select"
                      value={selectedClient.estado_admin || 'pendiente'}
                      onChange={(e) => handleStatusChange(selectedClient.id, 'estado_admin', e.target.value)}
                    >
                      <option value="pendiente">Pendiente</option>
                      <option value="en_revision">En Revisión</option>
                      <option value="finalizado">Finalizado</option>
                    </select>
                  </div>
                  <div className="cds-field">
                    <label>Última Actualización</label>
                    <p>{selectedClient.updatedAt
                      ? new Date(selectedClient.updatedAt.toDate?.() || selectedClient.updatedAt).toLocaleString('es-ES')
                      : '-'}</p>
                  </div>
                </div>
              </div>

              {/* ── Información Básica ───────────────────────────── */}
              <div className="cds">
                <div className="cds-head">
                  <span className="cds-head-icon">🏢</span>
                  <h3>Información Básica</h3>
                  {selectedClient.info_basica && Object.keys(selectedClient.info_basica).length > 0
                    ? <span className="cds-badge cds-badge--done">✓ Completado</span>
                    : <span className="cds-badge cds-badge--pending">⏳ Pendiente</span>}
                </div>
                <div className="cds-grid cds-grid--2">
                  <div className="cds-field">
                    <label>Razón Social</label>
                    <p>{selectedClient.info_basica?.razon_social || selectedClient.nombre_empresa || '-'}</p>
                  </div>
                  <div className="cds-field">
                    <label>Nombre Comercial</label>
                    <p>{selectedClient.info_basica?.nombre_comercial || selectedClient.nombre_comercial || '-'}</p>
                  </div>
                  <div className="cds-field">
                    <label>Sector</label>
                    <p>{selectedClient.info_basica?.sector || '-'}</p>
                  </div>
                  <div className="cds-field">
                    <label>Email</label>
                    <p>{selectedClient.info_basica?.email || selectedClient.email || '-'}</p>
                  </div>
                  <div className="cds-field">
                    <label>Teléfono</label>
                    <p>{selectedClient.info_basica?.telefono || '-'}</p>
                  </div>
                  <div className="cds-field">
                    <label>WhatsApp</label>
                    <p>{selectedClient.info_basica?.whatsapp || '-'}</p>
                  </div>
                  <div className="cds-field">
                    <label>Ciudad</label>
                    <p>{selectedClient.info_basica?.ciudad || '-'}</p>
                  </div>
                  <div className="cds-field">
                    <label>País</label>
                    <p>{selectedClient.info_basica?.pais || '-'}</p>
                  </div>
                  <div className="cds-field">
                    <label>Dirección</label>
                    <p>{selectedClient.info_basica?.direccion || '-'}</p>
                  </div>
                  <div className="cds-field">
                    <label>Sitio Web</label>
                    <p>{selectedClient.info_basica?.web
                      ? <a href={selectedClient.info_basica.web} target="_blank" rel="noopener noreferrer" className="link-gold">{selectedClient.info_basica.web}</a>
                      : '-'}</p>
                  </div>
                  <div className="cds-field">
                    <label>Instagram</label>
                    <p>{selectedClient.info_basica?.instagram
                      ? <a href={`https://instagram.com/${selectedClient.info_basica.instagram}`} target="_blank" rel="noopener noreferrer" className="link-gold">@{selectedClient.info_basica.instagram}</a>
                      : '-'}</p>
                  </div>
                  <div className="cds-field">
                    <label>Facebook</label>
                    <p>{selectedClient.info_basica?.facebook
                      ? <a href={selectedClient.info_basica.facebook} target="_blank" rel="noopener noreferrer" className="link-gold">Ver Página</a>
                      : '-'}</p>
                  </div>
                  <div className="cds-field cds-field--full">
                    <label>Horarios de Atención</label>
                    <p>{selectedClient.info_basica?.horarios || '-'}</p>
                  </div>
                  <div className="cds-field cds-field--full">
                    <label>Otros Links</label>
                    <p>{selectedClient.info_basica?.otros_links || '-'}</p>
                  </div>
                </div>
              </div>

              {/* ── Servicio Principal ───────────────────────────── */}
              {selectedClient.servicio_principal && (
                <div className="cds">
                  <div className="cds-head">
                    <span className="cds-head-icon">⭐</span>
                    <h3>Servicio Principal</h3>
                    {Object.keys(selectedClient.servicio_principal).length > 0
                      ? <span className="cds-badge cds-badge--done">✓ Completado</span>
                      : <span className="cds-badge cds-badge--pending">⏳ Pendiente</span>}
                  </div>
                  <div className="cds-grid cds-grid--2">
                    {selectedClient.servicio_principal.nombre_servicio && (
                      <div className="cds-field">
                        <label>Nombre del Servicio</label>
                        <p>{selectedClient.servicio_principal.nombre_servicio}</p>
                      </div>
                    )}
                    {selectedClient.servicio_principal.precio_rango && (
                      <div className="cds-field">
                        <label>Rango de Precio</label>
                        <p>{selectedClient.servicio_principal.precio_rango}</p>
                      </div>
                    )}
                    {selectedClient.servicio_principal.duracion && (
                      <div className="cds-field">
                        <label>Duración</label>
                        <p>{selectedClient.servicio_principal.duracion}</p>
                      </div>
                    )}
                    {selectedClient.servicio_principal.para_quien && (
                      <div className="cds-field">
                        <label>Para Quién</label>
                        <p>{selectedClient.servicio_principal.para_quien}</p>
                      </div>
                    )}
                    {selectedClient.servicio_principal.para_quien_no && (
                      <div className="cds-field">
                        <label>Para Quién NO</label>
                        <p>{selectedClient.servicio_principal.para_quien_no}</p>
                      </div>
                    )}
                    {selectedClient.servicio_principal.paquetes && (
                      <div className="cds-field">
                        <label>Paquetes / Modalidades</label>
                        <p>{selectedClient.servicio_principal.paquetes}</p>
                      </div>
                    )}
                    {selectedClient.servicio_principal.financiacion && (
                      <div className="cds-field">
                        <label>Financiación</label>
                        <p>{selectedClient.servicio_principal.financiacion}</p>
                      </div>
                    )}
                    {selectedClient.servicio_principal.por_que_prioritario && (
                      <div className="cds-field cds-field--full">
                        <label>Por Qué Es Prioritario</label>
                        <p>{selectedClient.servicio_principal.por_que_prioritario}</p>
                      </div>
                    )}
                    {selectedClient.servicio_principal.descripcion_detallada && (
                      <div className="cds-field cds-field--full">
                        <label>Descripción Detallada</label>
                        <p>{selectedClient.servicio_principal.descripcion_detallada}</p>
                      </div>
                    )}
                    {selectedClient.servicio_principal.que_incluye && (
                      <div className="cds-field cds-field--full">
                        <label>Qué Incluye</label>
                        <p>{selectedClient.servicio_principal.que_incluye}</p>
                      </div>
                    )}
                    {selectedClient.servicio_principal.que_no_incluye && (
                      <div className="cds-field cds-field--full">
                        <label>Qué NO Incluye</label>
                        <p>{selectedClient.servicio_principal.que_no_incluye}</p>
                      </div>
                    )}
                    {selectedClient.servicio_principal.diferenciales && (
                      <div className="cds-field cds-field--full">
                        <label>Diferenciales Clave</label>
                        <p>{selectedClient.servicio_principal.diferenciales}</p>
                      </div>
                    )}
                    {selectedClient.servicio_principal.objeciones_frecuentes && (
                      <div className="cds-field cds-field--full">
                        <label>Objeciones Frecuentes</label>
                        <p>{selectedClient.servicio_principal.objeciones_frecuentes}</p>
                      </div>
                    )}
                    {selectedClient.servicio_principal.casos_exito && (
                      <div className="cds-field cds-field--full">
                        <label>Casos de Éxito</label>
                        <p>{selectedClient.servicio_principal.casos_exito}</p>
                      </div>
                    )}
                    {selectedClient.servicio_principal.faqs && (
                      <div className="cds-field cds-field--full">
                        <label>FAQs</label>
                        <p>{selectedClient.servicio_principal.faqs}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Cliente Ideal ────────────────────────────────── */}
              {selectedClient.cliente_ideal && (
                <div className="cds">
                  <div className="cds-head">
                    <span className="cds-head-icon">🎯</span>
                    <h3>Cliente Ideal / Avatar</h3>
                    {Object.keys(selectedClient.cliente_ideal).length > 0
                      ? <span className="cds-badge cds-badge--done">✓ Completado</span>
                      : <span className="cds-badge cds-badge--pending">⏳ Pendiente</span>}
                  </div>
                  <div className="cds-grid cds-grid--2">
                    {selectedClient.cliente_ideal.cliente_ideal && (
                      <div className="cds-field cds-field--full">
                        <label>Descripción del Cliente Ideal</label>
                        <p>{selectedClient.cliente_ideal.cliente_ideal}</p>
                      </div>
                    )}
                    {selectedClient.cliente_ideal.problemas_principales && (
                      <div className="cds-field">
                        <label>Problemas Principales</label>
                        <p>{selectedClient.cliente_ideal.problemas_principales}</p>
                      </div>
                    )}
                    {selectedClient.cliente_ideal.deseos && (
                      <div className="cds-field">
                        <label>Deseos / Aspiraciones</label>
                        <p>{selectedClient.cliente_ideal.deseos}</p>
                      </div>
                    )}
                    {selectedClient.cliente_ideal.barreras && (
                      <div className="cds-field">
                        <label>Barreras</label>
                        <p>{selectedClient.cliente_ideal.barreras}</p>
                      </div>
                    )}
                    {selectedClient.cliente_ideal.necesita_escuchar && (
                      <div className="cds-field">
                        <label>Necesita Escuchar</label>
                        <p>{selectedClient.cliente_ideal.necesita_escuchar}</p>
                      </div>
                    )}
                    {selectedClient.cliente_ideal.senales_buen_lead && (
                      <div className="cds-field">
                        <label>Señales de Buen Lead</label>
                        <p>{selectedClient.cliente_ideal.senales_buen_lead}</p>
                      </div>
                    )}
                    {selectedClient.cliente_ideal.senales_mal_lead && (
                      <div className="cds-field">
                        <label>Señales de Mal Lead</label>
                        <p>{selectedClient.cliente_ideal.senales_mal_lead}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Marca ────────────────────────────────────────── */}
              {selectedClient.marca && (
                <div className="cds">
                  <div className="cds-head">
                    <span className="cds-head-icon">🎨</span>
                    <h3>Marca e Identidad Visual</h3>
                    {Object.keys(selectedClient.marca).length > 0
                      ? <span className="cds-badge cds-badge--done">✓ Completado</span>
                      : <span className="cds-badge cds-badge--pending">⏳ Pendiente</span>}
                  </div>
                  <div className="cds-grid cds-grid--2">
                    {selectedClient.marca.paleta_colores && (
                      <div className="cds-field">
                        <label>Paleta de Colores</label>
                        <p>{selectedClient.marca.paleta_colores}</p>
                      </div>
                    )}
                    {selectedClient.marca.tipografias && (
                      <div className="cds-field">
                        <label>Tipografías</label>
                        <p>{selectedClient.marca.tipografias}</p>
                      </div>
                    )}
                    {selectedClient.marca.estilo_visual && (
                      <div className="cds-field">
                        <label>Estilo Visual</label>
                        <p>{selectedClient.marca.estilo_visual}</p>
                      </div>
                    )}
                    {selectedClient.marca.referencias && (
                      <div className="cds-field">
                        <label>Referencias / Inspiración</label>
                        <p>{selectedClient.marca.referencias}</p>
                      </div>
                    )}
                    {selectedClient.marca.preferencias_comunicacion && (
                      <div className="cds-field cds-field--full">
                        <label>Preferencias de Comunicación</label>
                        <p>{selectedClient.marca.preferencias_comunicacion}</p>
                      </div>
                    )}
                    {selectedClient.marca.no_hacer_con_marca && (
                      <div className="cds-field cds-field--full">
                        <label>QUÉ NO Hacer con la Marca</label>
                        <p>{selectedClient.marca.no_hacer_con_marca}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Meta / Facebook Ads ──────────────────────────── */}
              {selectedClient.meta && (
                <div className="cds">
                  <div className="cds-head">
                    <span className="cds-head-icon">📘</span>
                    <h3>Entorno Meta / Facebook Ads</h3>
                    {Object.keys(selectedClient.meta).length > 0
                      ? <span className="cds-badge cds-badge--done">✓ Completado</span>
                      : <span className="cds-badge cds-badge--pending">⏳ Pendiente</span>}
                  </div>
                  <div className="cds-grid cds-grid--2">
                    <div className="cds-field">
                      <label>¿Tiene Activos Meta?</label>
                      <p>{selectedClient.meta.tiene_activos !== undefined
                        ? (selectedClient.meta.tiene_activos ? '✅ Sí' : '❌ No')
                        : '-'}</p>
                    </div>
                    {selectedClient.meta.portfolio_id && (
                      <div className="cds-field">
                        <label>Portfolio ID</label>
                        <p className="cds-mono">{selectedClient.meta.portfolio_id}</p>
                      </div>
                    )}
                    {selectedClient.meta.instagram_username && (
                      <div className="cds-field">
                        <label>Usuario Instagram</label>
                        <p>@{selectedClient.meta.instagram_username}</p>
                      </div>
                    )}
                    {selectedClient.meta.business_manager_id && (
                      <div className="cds-field">
                        <label>Business Manager ID</label>
                        <p className="cds-mono">{selectedClient.meta.business_manager_id}</p>
                      </div>
                    )}
                    {selectedClient.meta.cuenta_publicitaria_id && (
                      <div className="cds-field">
                        <label>Cuenta Publicitaria ID</label>
                        <p className="cds-mono">{selectedClient.meta.cuenta_publicitaria_id}</p>
                      </div>
                    )}
                    {selectedClient.meta.pixel_id && (
                      <div className="cds-field">
                        <label>Pixel ID</label>
                        <p className="cds-mono">{selectedClient.meta.pixel_id}</p>
                      </div>
                    )}
                    {selectedClient.meta.email_acceso && (
                      <div className="cds-field">
                        <label>Email de Acceso</label>
                        <p>{selectedClient.meta.email_acceso}</p>
                      </div>
                    )}
                    <div className="cds-field">
                      <label>Acceso Compartido</label>
                      <p>{selectedClient.meta.confirmacion_compartido !== undefined
                        ? (selectedClient.meta.confirmacion_compartido ? '✅ Confirmado' : '⏳ Pendiente')
                        : '-'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Google ───────────────────────────────────────── */}
              {selectedClient.google && (
                <div className="cds">
                  <div className="cds-head">
                    <span className="cds-head-icon">🔍</span>
                    <h3>Entorno Google</h3>
                    {Object.keys(selectedClient.google).length === 0
                      ? <span className="cds-badge cds-badge--pending">⏳ Pendiente</span>
                      : selectedClient.google.entorno_google_help === true
                        ? <span className="cds-badge cds-badge--warn">⚠️ Necesita ayuda</span>
                        : <span className="cds-badge cds-badge--done">✓ Completado</span>}
                  </div>
                  <div className="cds-grid cds-grid--2">
                    <div className="cds-field">
                      <label>Situación Actual</label>
                      <p>
                        {selectedClient.google.entorno_google_status === 'si' && '✅ Tiene Google configurado'}
                        {selectedClient.google.entorno_google_status === 'no' && '❌ Necesita configuración'}
                        {selectedClient.google.entorno_google_status === 'no_seguro' && '❓ No está seguro'}
                        {!selectedClient.google.entorno_google_status && '-'}
                      </p>
                    </div>
                    <div className="cds-field">
                      <label>Estado de Soporte</label>
                      <p>
                        {selectedClient.google.entorno_google_help === true && <span style={{color:'#ff9800',fontWeight:600}}>⚠️ Necesita asistencia</span>}
                        {selectedClient.google.entorno_google_help === false && '✓ Todo configurado'}
                        {selectedClient.google.entorno_google_help === null && '❓ Por decidir'}
                        {selectedClient.google.entorno_google_help === undefined && '-'}
                      </p>
                    </div>
                    <div className="cds-field">
                      <label>Google Business Profile</label>
                      <p>{selectedClient.google.google_maps_link
                        ? <a href={selectedClient.google.google_maps_link} target="_blank" rel="noopener noreferrer" className="link-gold">📍 Ver en Maps</a>
                        : '-'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Slack ────────────────────────────────────────── */}
              {selectedClient.slack && (
                <div className="cds">
                  <div className="cds-head">
                    <span className="cds-head-icon">💬</span>
                    <h3>Slack / Comunicación</h3>
                    {Object.keys(selectedClient.slack).length === 0
                      ? <span className="cds-badge cds-badge--pending">⏳ Pendiente</span>
                      : selectedClient.slack.slack_needs_help
                        ? <span className="cds-badge cds-badge--warn">⚠️ Necesita ayuda</span>
                        : <span className="cds-badge cds-badge--done">✓ Completado</span>}
                  </div>
                  <div className="cds-grid cds-grid--2">
                    <div className="cds-field">
                      <label>Tutorial Visto</label>
                      <p>{selectedClient.slack.tutorial_visto ? '✅ Sí' : '❌ No'}</p>
                    </div>
                    <div className="cds-field">
                      <label>Estado Slack</label>
                      <p>{selectedClient.slack.slack_status === 'completado'
                        ? '✅ Completado'
                        : selectedClient.slack.slack_status === 'necesita_ayuda'
                          ? <span style={{color:'#ff9800',fontWeight:600}}>⚠️ Necesita ayuda</span>
                          : (selectedClient.slack.slack_status || '-')}</p>
                    </div>
                    <div className="cds-field">
                      <label>Email Principal Empresa</label>
                      <p>{selectedClient.slack.email_principal_empresa || '-'}</p>
                    </div>
                    {selectedClient.slack.emails_equipo && (
                      <div className="cds-field cds-field--full">
                        <label>Emails del Equipo</label>
                        <p>{selectedClient.slack.emails_equipo}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── IA / Asistente ───────────────────────────────── */}
              {selectedClient.ia && (
                <div className="cds">
                  <div className="cds-head">
                    <span className="cds-head-icon">🤖</span>
                    <h3>IA / Asistente Virtual</h3>
                    {Object.keys(selectedClient.ia).length > 0
                      ? <span className="cds-badge cds-badge--done">✓ Completado</span>
                      : <span className="cds-badge cds-badge--pending">⏳ Pendiente</span>}
                  </div>
                  <div className="cds-grid cds-grid--2">
                    <div className="cds-field">
                      <label>¿Implementar IA?</label>
                      <p>{selectedClient.ia.implementar_ia !== undefined
                        ? (selectedClient.ia.implementar_ia ? '✅ Sí' : '❌ No')
                        : '-'}</p>
                    </div>
                    {selectedClient.ia.nombre_asistente && (
                      <div className="cds-field">
                        <label>Nombre del Asistente</label>
                        <p>{selectedClient.ia.nombre_asistente}</p>
                      </div>
                    )}
                    {selectedClient.ia.tono && (
                      <div className="cds-field">
                        <label>Tono de Comunicación</label>
                        <p>{selectedClient.ia.tono}</p>
                      </div>
                    )}
                    {selectedClient.ia.objetivo_principal && (
                      <div className="cds-field cds-field--full">
                        <label>Objetivo Principal</label>
                        <p>{selectedClient.ia.objetivo_principal}</p>
                      </div>
                    )}
                    {selectedClient.ia.que_responder && (
                      <div className="cds-field">
                        <label>Qué Debe Responder</label>
                        <p>{selectedClient.ia.que_responder}</p>
                      </div>
                    )}
                    {selectedClient.ia.que_no_responder && (
                      <div className="cds-field">
                        <label>Qué NO Debe Responder</label>
                        <p>{selectedClient.ia.que_no_responder}</p>
                      </div>
                    )}
                    {selectedClient.ia.cuando_derivar && (
                      <div className="cds-field">
                        <label>Cuándo Derivar a Humano</label>
                        <p>{selectedClient.ia.cuando_derivar}</p>
                      </div>
                    )}
                    {selectedClient.ia.datos_recoger && (
                      <div className="cds-field">
                        <label>Datos a Recopilar</label>
                        <p>{selectedClient.ia.datos_recoger}</p>
                      </div>
                    )}
                    {selectedClient.ia.base_conocimiento && (
                      <div className="cds-field">
                        <label>Tipo de Base de Conocimiento</label>
                        <p>{selectedClient.ia.base_conocimiento === 'texto' ? '📝 Texto Directo'
                          : selectedClient.ia.base_conocimiento === 'prompt' ? '🤖 Prompt ChatGPT'
                          : '📁 Archivo Cargado'}</p>
                      </div>
                    )}
                    {selectedClient.ia.base_conocimiento_texto && (
                      <div className="cds-field cds-field--full">
                        <label>Contenido de Base de Conocimiento</label>
                        <p className="cds-text-block">{selectedClient.ia.base_conocimiento_texto}</p>
                      </div>
                    )}
                    {selectedClient.ia.base_conocimiento_archivo_nombre && (
                      <div className="cds-field">
                        <label>Archivo Cargado</label>
                        <p>📎 {selectedClient.ia.base_conocimiento_archivo_nombre}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Inspiración ──────────────────────────────────── */}
              {selectedClient.inspiracion && (
                <div className="cds">
                  <div className="cds-head">
                    <span className="cds-head-icon">✨</span>
                    <h3>Inspiración y Referencias</h3>
                    {Object.keys(selectedClient.inspiracion).length > 0
                      ? <span className="cds-badge cds-badge--done">✓ Completado</span>
                      : <span className="cds-badge cds-badge--pending">⏳ Pendiente</span>}
                  </div>
                  <div className="cds-grid cds-grid--2">
                    {selectedClient.inspiracion.webs_referencia && (
                      <div className="cds-field">
                        <label>Webs de Referencia</label>
                        <p>{selectedClient.inspiracion.webs_referencia}</p>
                      </div>
                    )}
                    {selectedClient.inspiracion.marcas_gustan && (
                      <div className="cds-field">
                        <label>Marcas que Gustan</label>
                        <p>{selectedClient.inspiracion.marcas_gustan}</p>
                      </div>
                    )}
                    {selectedClient.inspiracion.marcas_no_parecer && (
                      <div className="cds-field">
                        <label>Marcas QUÉ NO Parecer</label>
                        <p>{selectedClient.inspiracion.marcas_no_parecer}</p>
                      </div>
                    )}
                    {selectedClient.inspiracion.anuncios_gustan && (
                      <div className="cds-field">
                        <label>Anuncios que Gustan</label>
                        <p>{selectedClient.inspiracion.anuncios_gustan}</p>
                      </div>
                    )}
                    {(selectedClient.inspiracion.competencia_analizar || selectedClient.inspiracion.competidores) && (
                      <div className="cds-field">
                        <label>Competidores a Analizar</label>
                        <p>{selectedClient.inspiracion.competencia_analizar || selectedClient.inspiracion.competidores}</p>
                      </div>
                    )}
                    {selectedClient.inspiracion.elementos_que_gustan && (
                      <div className="cds-field">
                        <label>Elementos que Gustan</label>
                        <p>{selectedClient.inspiracion.elementos_que_gustan}</p>
                      </div>
                    )}
                    {selectedClient.inspiracion.comentarios_adicionales && (
                      <div className="cds-field cds-field--full">
                        <label>Comentarios Adicionales</label>
                        <p>{selectedClient.inspiracion.comentarios_adicionales}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Agendamiento ─────────────────────────────────── */}
              {selectedClient.agendamiento && (
                <div className="cds">
                  <div className="cds-head">
                    <span className="cds-head-icon">📅</span>
                    <h3>Agendamiento de Meeting</h3>
                    {selectedClient.agendamiento.meeting_agendado === true
                      ? <span className="cds-badge cds-badge--done">✓ Completado</span>
                      : Object.keys(selectedClient.agendamiento).length > 0
                        ? <span className="cds-badge cds-badge--warn">⏳ En proceso</span>
                        : <span className="cds-badge cds-badge--pending">⏳ Pendiente</span>}
                  </div>
                  <div className="cds-grid cds-grid--2">
                    <div className="cds-field">
                      <label>Meeting Agendado</label>
                      <p>{selectedClient.agendamiento.meeting_agendado !== undefined
                        ? (selectedClient.agendamiento.meeting_agendado ? '✅ Sí' : '⏳ Pendiente')
                        : '-'}</p>
                    </div>
                    {selectedClient.agendamiento.fecha_agendamiento && (
                      <div className="cds-field">
                        <label>Fecha</label>
                        <p>{new Date(selectedClient.agendamiento.fecha_agendamiento).toLocaleDateString('es-ES')}</p>
                      </div>
                    )}
                    {selectedClient.agendamiento.hora_agendamiento && (
                      <div className="cds-field">
                        <label>Hora</label>
                        <p>{selectedClient.agendamiento.hora_agendamiento}</p>
                      </div>
                    )}
                    {selectedClient.agendamiento.calendario_link && (
                      <div className="cds-field">
                        <label>Link Calendario</label>
                        <p><a href={selectedClient.agendamiento.calendario_link} target="_blank" rel="noopener noreferrer" className="link-gold">📅 Agendar reunión</a></p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Acciones ─────────────────────────────────────── */}
              <div className="cds cds--actions">
                <div className="cds-head">
                  <span className="cds-head-icon">🔗</span>
                  <h3>Acciones Rápidas</h3>
                </div>
                <div className="cds-actions-row">
                  <button
                    className="btn btn-primary"
                    onClick={() => handleGenerateToken(
                      selectedClient.id,
                      selectedClient.info_basica?.email || selectedClient.email,
                      selectedClient.nombre_empresa
                    )}
                    disabled={!!generatingToken}
                  >
                    {generatingToken ? '⏳ Generando...' : '🔗 Generar Nuevo Link'}
                  </button>
                  <button className="btn btn-ghost" onClick={handleExportCSV} disabled={exporting}>
                    📊 {exporting ? 'Exportando...' : 'Exportar CSV'}
                  </button>
                  <button className="btn btn-ghost" onClick={handleExportJSON} disabled={exporting}>
                    📄 Exportar JSON
                  </button>
                </div>
              </div>

            </div>{/* end client-modal-body */}
          </div>{/* end client-modal */}
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
