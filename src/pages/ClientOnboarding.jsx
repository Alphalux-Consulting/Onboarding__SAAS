import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MODULES } from '../config/constants'
import {
  getClientData,
  updateClientData,
  saveClientModule,
  calculateProgress,
  uploadClientFile
} from '../services/clientData'
import { db } from '../config/firebase'
import { doc, updateDoc, Timestamp } from 'firebase/firestore'
import {
  uploadFileToDrive,
  setupClientDriveFolder,
  linkDriveFolderToClient,
  parseDriveFolderLink,
  BRAND_CATEGORIES
} from '../services/googleDriveService'
import LoadingScreen from '../components/LoadingScreen'
import CompletionCelebration from '../components/CompletionCelebration'
import './pages.css'

// 🧪 Modo de Prueba - Permite saltar módulos sin validación
const TESTING_MODE = true

// Componente reutilizable para videos en módulos
function VideoSection({ videoUrl, title }) {
  if (!videoUrl) return null

  return (
    <div className="module-video">
      <h4>{title}</h4>
      <div className="video-container">
        <iframe
          src={videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be') ? videoUrl : `https://www.youtube.com/embed/${videoUrl}`}
          title={title}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      </div>
    </div>
  )
}

const STEP_MESSAGES = {
  1: "📍 UBICACIÓN — Comencemos con lo esencial. Los datos de tu empresa.",
  2: "⭐ IDENTIDAD — Perfecto. Ahora define tu servicio principal con precisión.",
  3: "🎯 DESTINO — Excelente. Tu cliente ideal marcará toda la estrategia.",
  4: "🎨 EXPRESIÓN — Tu identidad visual. El lenguaje de tu marca.",
  5: "📘 ALCANCE — Meta Ads: el motor de captación para tu negocio.",
  6: "🔍 VISIBILIDAD — Google: visibilidad local y búsqueda activa.",
  7: "💬 CONEXIÓN — Slack será nuestro espacio de operación diaria.",
  8: "🤖 INTELIGENCIA — IA: automatiza y escala tu atención al cliente.",
  9: "✨ INSPIRACIÓN — Inspiración y referencias para afinar la estrategia.",
  10: "📅 LANZAMIENTO — Último paso. Agendemos la reunión de inicio.",
  11: "🎉 COMPLETADO — Onboarding completado. Listo para el lanzamiento."
}

export default function ClientOnboarding() {
  const navigate = useNavigate()

  // Estado general
  const [clientId, setClientId] = useState(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [clientData, setClientData] = useState({})
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')

  // Estado de formulario
  const [formData, setFormData] = useState({})
  const [justCompleted, setJustCompleted] = useState(null)

  // Inicializar
  useEffect(() => {
    initializeOnboarding()
  }, [])

  const initializeOnboarding = async () => {
    try {
      const token = sessionStorage.getItem('onboardingToken')
      const storedClientId = sessionStorage.getItem('clientId')

      if (!token || !storedClientId) {
        navigate('/', { replace: true })
        return
      }

      setClientId(storedClientId)

      // Cargar datos del cliente
      const data = await getClientData(storedClientId)
      setClientData(data || {})

      // Inicializar forma con datos existentes
      if (data) {
        setFormData(data)
      }

      // Calcular progreso
      const currentProgress = await calculateProgress(storedClientId)
      setProgress(currentProgress)

      setLoading(false)
    } catch (err) {
      console.error('Error initializing onboarding:', err)
      setError('Error al cargar tu información. Por favor, intenta nuevamente.')
      setLoading(false)
    }
  }

  const currentModule = MODULES[currentStep]

  const handleInputChange = (fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      [currentModule.id]: {
        ...prev[currentModule.id],
        [fieldName]: value
      }
    }))
  }

  const handleModuleChange = (moduleName, moduleData) => {
    setFormData(prev => ({
      ...prev,
      [moduleName]: moduleData
    }))
  }

  // Función para validar campos obligatorios
  const validateModule = (module, data) => {
    // Campos obligatorios para este módulo
    const requiredFields = module.requiredFields || []
    const moduleData = data[module.id] || {}

    // Verificar campos obligatorios
    const missingFields = requiredFields.filter(field => {
      const value = moduleData[field]
      return !value || (typeof value === 'string' && value.trim() === '')
    })

    // Verificar campos condicionales
    if (module.conditionalFields) {
      Object.entries(module.conditionalFields).forEach(([conditionField, condition]) => {
        if (moduleData[conditionField] === condition.value) {
          // Si la condición se cumple, verificar los campos condicionales
          const missingConditional = condition.fields.filter(field => {
            const value = moduleData[field]
            return !value || (typeof value === 'string' && value.trim() === '')
          })
          missingFields.push(...missingConditional)
        }
      })
    }

    if (missingFields.length > 0) {
      const fieldLabels = missingFields
        .filter((v, i, a) => a.indexOf(v) === i) // Eliminar duplicados
        .map(field => {
          // Convertir nombre de campo a etiqueta legible
          return field
            .replace(/_/g, ' ')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
        })

      return {
        isValid: false,
        missingFields: fieldLabels
      }
    }

    return { isValid: true }
  }

  const handleSaveAndNext = async () => {
    try {
      setSaving(true)
      setError('')

      if (!clientId) return

      // Validar módulo actual (excepto welcome, confirmacion y en modo testing)
      if (!TESTING_MODE && currentModule.id !== 'welcome' && currentModule.id !== 'confirmacion') {
        const validation = validateModule(currentModule, formData)

        if (!validation.isValid) {
          const missingFieldsList = validation.missingFields.join(', ')
          setError(`⚠️ Por favor completa los siguientes campos obligatorios: ${missingFieldsList}`)
          setSaving(false)
          return
        }
      }

      // Guardar módulo actual
      if (currentModule.id !== 'confirmacion') {
        const moduleData = formData[currentModule.id] || {}
        await saveClientModule(clientId, currentModule.id, moduleData)
      }

      // Actualizar progreso
      const newProgress = await calculateProgress(clientId)
      setProgress(newProgress)

      // Ir al siguiente paso
      if (currentStep < MODULES.length - 1) {
        setJustCompleted(currentStep)
        setTimeout(() => setJustCompleted(null), 800)
        setCurrentStep(currentStep + 1)
        window.scrollTo(0, 0)
      }
    } catch (err) {
      console.error('Error saving module:', err)
      setError('Error al guardar. Por favor, intenta nuevamente.')
    } finally {
      setSaving(false)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
      window.scrollTo(0, 0)
    }
  }

  const handleStartOnboarding = () => {
    // Move from welcome step (0) to first form step (1)
    setCurrentStep(1)
    window.scrollTo(0, 0)
  }

  const handleFileUpload = async (file, folder = 'general', categoryKey = null) => {
    try {
      setSaving(true)

      // Google Drive upload for marca (brand) category
      if (folder === 'marca' && categoryKey) {
        // Setup Drive folder if not already done
        if (!clientData.drive_main_folder_id) {
          const setupResult = await setupClientDriveFolder(
            clientId,
            clientData.nombre_comercial || 'Client'
          )

          // Update client data with folder IDs
          await updateClientData(clientId, {
            drive_main_folder_id: setupResult.mainFolderId,
            drive_category_folders: setupResult.categoryFolders,
            drive_folder_url: setupResult.driveUrl
          })

          // Update local state
          setClientData(prev => ({
            ...prev,
            drive_main_folder_id: setupResult.mainFolderId,
            drive_category_folders: setupResult.categoryFolders,
            drive_folder_url: setupResult.driveUrl
          }))
        }

        // Get the category folder ID
        const categoryFolderId = clientData.drive_category_folders?.[categoryKey]
        if (!categoryFolderId) {
          throw new Error(`No folder found for category: ${categoryKey}`)
        }

        // Upload to Google Drive
        const driveResult = await uploadFileToDrive(file, categoryFolderId, clientId)

        return {
          name: driveResult.name,
          url: driveResult.downloadUrl,
          viewUrl: driveResult.viewUrl,
          fileId: driveResult.fileId,
          size: driveResult.size,
          mimeType: driveResult.mimeType,
          uploadedAt: driveResult.createdAt,
          source: 'google_drive'
        }
      }

      // Firebase Storage upload for other files (fallback)
      const fileData = await uploadClientFile(clientId, file, folder)
      return fileData
    } catch (err) {
      console.error('Error uploading file:', err)
      setError('Error al subir archivo. Por favor, intenta nuevamente.')
      return null
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <LoadingScreen />
  }

  // Welcome screen — full page, no sidebar
  if (currentStep === 0) {
    return (
      <div className="onboarding-welcome-screen">
        <ModuleRenderer
          module={currentModule}
          data={formData[currentModule.id] || {}}
          onDataChange={(data) => handleModuleChange(currentModule.id, data)}
          onInputChange={handleInputChange}
          onFileUpload={handleFileUpload}
          isSaving={saving}
          clientData={clientData}
          onStartOnboarding={handleStartOnboarding}
          progress={progress}
        />
      </div>
    )
  }

  const logoUrl = new URL('../assets/images/logo-alphalux.png', import.meta.url).href

  return (
    <div className="onboarding-layout">
      {/* Sidebar */}
      <aside className="onboarding-sidebar">
        <div className="sidebar-brand">
          <img src={logoUrl} alt="Alphalux" className="sidebar-brand-logo" />
        </div>

        <nav className="sidebar-nav">
          {MODULES.filter(m => m.id !== 'welcome').map((mod, navIdx) => {
            const stepIdx = navIdx + 1
            const hasData = formData[mod.id] && Object.keys(formData[mod.id]).length > 0
            const isDone = stepIdx < currentStep || hasData
            const isActive = stepIdx === currentStep
            const isFlash = justCompleted === stepIdx
            const stateClass = isActive
              ? 'sidebar-step--active'
              : isDone
              ? 'sidebar-step--done'
              : 'sidebar-step--pending'

            return (
              <button
                key={mod.id}
                className={`sidebar-step ${stateClass}${isFlash ? ' sidebar-step--flash' : ''}`}
                onClick={() => {
                  if (isDone || isActive) {
                    setCurrentStep(stepIdx)
                    window.scrollTo(0, 0)
                  }
                }}
                tabIndex={(isDone || isActive) ? 0 : -1}
              >
                <span className="sidebar-step-icon">
                  {isDone && !isActive ? '✓' : navIdx + 1}
                </span>
                <span className="sidebar-step-name">{mod.name}</span>
              </button>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-footer-track">
            <div className="sidebar-footer-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="sidebar-footer-pct">{progress}%</span>
        </div>
      </aside>

      {/* Main content */}
      <main className="onboarding-main">
        {STEP_MESSAGES[currentStep] && (
          <div className="onboarding-step-msg">
            <span className="step-msg-dot" />
            {STEP_MESSAGES[currentStep]}
          </div>
        )}

        <div className={`onboarding-step-wrapper${currentStep === 0 ? ' onboarding-step-wrapper--welcome' : ''}`}>
          {error && (
            <div className="form-error" style={{ marginBottom: '1.5rem' }}>
              <span>⚠️</span> <span>{error}</span>
            </div>
          )}

          {currentStep > 0 && currentStep < MODULES.length - 1 && (
            <div className="step-header">
              <div className="step-num-badge">Paso {currentStep} / {MODULES.length - 2}</div>
              <h2 className="step-title">{currentModule.name}</h2>
              <p className="step-description">{currentModule.description}</p>
            </div>
          )}

          <div className="module-form">
            <ModuleRenderer
              module={currentModule}
              data={formData[currentModule.id] || {}}
              onDataChange={(data) => handleModuleChange(currentModule.id, data)}
              onInputChange={handleInputChange}
              onFileUpload={handleFileUpload}
              isSaving={saving}
              clientData={clientData}
              onStartOnboarding={handleStartOnboarding}
              progress={progress}
              currentStep={currentStep}
              onBackToWelcome={() => setCurrentStep(0)}
              clientId={clientId}
            />
          </div>

          {currentStep > 0 && (
            <div className="step-navigation">
              <button
                className="btn btn-ghost"
                onClick={handlePrevious}
                disabled={currentStep < 1 || saving}
              >
                ← Anterior
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSaveAndNext}
                disabled={saving}
              >
                {saving ? 'Guardando...' : currentStep === MODULES.length - 1 ? 'Completar' : 'Siguiente →'}
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Completion Celebration Overlay */}
      {justCompleted !== null && (
        <CompletionCelebration
          progress={progress}
          currentStep={justCompleted}
          onDismiss={() => setJustCompleted(null)}
        />
      )}
    </div>
  )
}

// Componente para renderizar módulos específicos
function ModuleRenderer({ module, data, onDataChange, onInputChange, onFileUpload, isSaving, clientData, onStartOnboarding, progress, currentStep, onBackToWelcome, clientId }) {
  switch (module.id) {
    case 'welcome':
      return <WelcomeModule clientData={clientData} onStartOnboarding={onStartOnboarding} progress={progress} currentStep={currentStep} />
    case 'info_basica':
      return <BasicInfoModule data={data} onChange={onDataChange} onInputChange={onInputChange} />
    case 'servicio_principal':
      return <ServiceModule data={data} onChange={onDataChange} onInputChange={onInputChange} />
    case 'cliente_ideal':
      return <IdealClientModule data={data} onChange={onDataChange} onInputChange={onInputChange} />
    case 'marca':
      return <BrandModule data={data} onChange={onDataChange} onFileUpload={onFileUpload} isSaving={isSaving} />
    case 'meta':
      return <MetaModule data={data} onChange={onDataChange} onInputChange={onInputChange} />
    case 'google':
      return <GoogleModule data={data} onChange={onDataChange} onInputChange={onInputChange} />
    case 'slack':
      return <SlackModule data={data} onChange={onDataChange} onInputChange={onInputChange} />
    case 'ia':
      return <AIModule data={data} onChange={onDataChange} onInputChange={onInputChange} onFileUpload={onFileUpload} />
    case 'inspiracion':
      return <InspirationModule data={data} onChange={onDataChange} onInputChange={onInputChange} />
    case 'agendamiento':
      return <SchedulingModule data={data} onChange={onDataChange} onInputChange={onInputChange} />
    case 'confirmacion':
      return <ConfirmationModule data={data} onBackToWelcome={onBackToWelcome} clientId={clientId} onInputChange={onInputChange} />
    default:
      return <div>Módulo no encontrado</div>
  }
}

// Módulos individuales
function WelcomeModule({ clientData, onStartOnboarding, progress = 0, currentStep = 0 }) {
  const companyName = clientData?.nombre_empresa || clientData?.nombre_comercial || ''
  const videoUrl = 'https://www.youtube.com/embed/15cEtTMmvJk'
  const logoUrl = new URL('../assets/images/logo-alphalux.png', import.meta.url).href

  const roadmapStages = [
    { num: 1, icon: '🏢', name: 'Empresa',    desc: 'Datos básicos' },
    { num: 2, icon: '⭐', name: 'Servicio',   desc: 'Oferta principal' },
    { num: 3, icon: '🎯', name: 'Cliente',    desc: 'Avatar ideal' },
    { num: 4, icon: '🎨', name: 'Marca',      desc: 'Identidad visual' },
    { num: 5, icon: '📘', name: 'Meta Ads',   desc: 'Publicidad social' },
    { num: 6, icon: '🔍', name: 'Google',     desc: 'Visibilidad local' },
    { num: 7, icon: '💬', name: 'Slack',      desc: 'Comunicación' },
    { num: 8, icon: '🤖', name: 'IA',         desc: 'Asistente virtual' },
    { num: 9, icon: '✨', name: 'Inspiración',desc: 'Referencias' },
    { num: 10, icon: '📅', name: 'Meeting',   desc: 'Kickoff call' },
  ]

  return (
    <div className="welcome-screen">
      {/* Hero — full width, always centered */}
      <div className="welcome-hero">
        <img src={logoUrl} alt="Alphalux" className="welcome-logo" />
        {companyName && (
          <p className="welcome-company-name">— {companyName} —</p>
        )}
        <h1 className="welcome-heading">
          Bienvenido a tu<br />
          <em>proceso de onboarding</em>
        </h1>
        <p className="welcome-subheading">
          En los próximos pasos construiremos juntos el sistema de captación,
          conversión e inteligencia artificial de tu negocio.
        </p>
      </div>

      <div className="welcome-video-wrap">
        <p className="welcome-video-label">Mensaje del equipo Alphalux</p>
        <div className="welcome-video-container">
          <iframe
            src={videoUrl}
            title="Bienvenida Alphalux"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>

      <div className="welcome-meta-strip">
        <div className="welcome-meta-item">
          <span className="welcome-meta-icon">📋</span>
          <span className="welcome-meta-val">10</span>
          <span className="welcome-meta-lbl">etapas</span>
        </div>
        <div className="welcome-meta-sep" />
        <div className="welcome-meta-item">
          <span className="welcome-meta-icon">⏱️</span>
          <span className="welcome-meta-val">~30</span>
          <span className="welcome-meta-lbl">minutos</span>
        </div>
        <div className="welcome-meta-sep" />
        <div className="welcome-meta-item">
          <span className="welcome-meta-icon">💾</span>
          <span className="welcome-meta-val">Auto</span>
          <span className="welcome-meta-lbl">guardado</span>
        </div>
      </div>

      <div className="welcome-roadmap">
        <h3 className="welcome-roadmap-title"><span>Tu hoja de ruta</span></h3>
        <div className="welcome-stages-grid">
          {roadmapStages.map(stage => {
            const moduleData = clientData[MODULES[stage.num - 1]?.id] || {}
            const isCompleted = Object.keys(moduleData).length > 0
            const isCurrentStage = currentStep === stage.num
            const stateClass = isCurrentStage ? 'welcome-stage-card--in-progress' : isCompleted ? 'welcome-stage-card--completed' : progress > 0 && !isCompleted && currentStep < stage.num ? 'welcome-stage-card--locked' : ''

            return (
              <div key={stage.num} className={`welcome-stage-card ${stateClass}`}>
                {isCompleted && <span className="welcome-stage-overlay">✓</span>}
                {!isCompleted && progress > 0 && currentStep < stage.num && <span className="welcome-stage-overlay">🔒</span>}
                <span className="welcome-stage-num">{stage.num}</span>
                <span className="welcome-stage-icon">{stage.icon}</span>
                <span className="welcome-stage-name">{stage.name}</span>
                <span className="welcome-stage-desc">{stage.desc}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Progress bar — full width, only for returning users */}
      {progress > 0 && (
        <div className="welcome-progress-returning">
          <div className="welcome-progress-header">
            <p className="welcome-progress-message">
              {progress <= 20 && '¡Has comenzado! 🎯'}
              {progress > 20 && progress <= 40 && 'Buen progreso 💪'}
              {progress > 40 && progress <= 60 && '¡Ya por la mitad! 🚀'}
              {progress > 60 && progress <= 80 && '¡Casi listo! ✨'}
              {progress > 80 && progress < 100 && '¡Casi completado! 🎉'}
              {progress === 100 && '¡Has completado todo! 🌟'}
            </p>
            <span className="welcome-progress-percent">{progress}%</span>
          </div>
          <div className="welcome-progress-track">
            <div className="welcome-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <p className="welcome-progress-text">Módulos completados: {progress / 10} de 10</p>
        </div>
      )}

      {/* CTA — full width, centered */}
      <div className="welcome-cta-section">
        <button className="welcome-start-btn" onClick={onStartOnboarding}>
          {progress > 0 ? 'Continuar Onboarding →' : 'Comenzar Ahora →'}
        </button>
        <p className="welcome-cta-note">Tu progreso se guarda automáticamente en cada paso</p>
      </div>
    </div>
  )
}

function BasicInfoModule({ data, onInputChange }) {
  const [expandedSections, setExpandedSections] = useState({})

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  return (
    <div className="module-fields">
      <div className="module-context">
        <p className="module-context-why">
          Esta es la base de todo. Con estos datos construimos tu identidad digital, configuramos tus plataformas y personalizamos cada parte de la estrategia con el nombre, sector y presencia real de tu negocio.
        </p>
        <p className="module-context-instruction">
          Completa al menos el nombre comercial y el sector. Expande las secciones de ubicación, contacto y presencia online para un perfil completo.
        </p>
      </div>

      <div className="form-group">
        <label>Nombre Comercial *</label>
        <input
          type="text"
          value={data.nombre_comercial || ''}
          onChange={(e) => onInputChange('nombre_comercial', e.target.value)}
          placeholder="Ej: Mi Empresa SPA"
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Razón Social *</label>
          <input
            type="text"
            value={data.razon_social || ''}
            onChange={(e) => onInputChange('razon_social', e.target.value)}
            placeholder="Razón social legal"
          />
        </div>
        <div className="form-group">
          <label>Sector/Industria *</label>
          <input
            type="text"
            value={data.sector || ''}
            onChange={(e) => onInputChange('sector', e.target.value)}
            placeholder="Ej: Marketing Digital, E-commerce"
          />
        </div>
      </div>

      <div className="collapsible-section">
        <button
          type="button"
          className="collapsible-header"
          onClick={() => toggleSection('ubicacion')}
        >
          <span>📍 Ubicación (Expandir)</span>
          <span className="toggle-icon">{expandedSections.ubicacion ? '▼' : '▶'}</span>
        </button>
        {expandedSections.ubicacion && (
          <div className="collapsible-content">
            <div className="form-row">
              <div className="form-group">
                <label>Dirección</label>
                <input
                  type="text"
                  value={data.direccion || ''}
                  onChange={(e) => onInputChange('direccion', e.target.value)}
                  placeholder="Dirección física"
                />
              </div>
              <div className="form-group">
                <label>Ciudad *</label>
                <input
                  type="text"
                  value={data.ciudad || ''}
                  onChange={(e) => onInputChange('ciudad', e.target.value)}
                  placeholder="Ciudad"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>País *</label>
                <input
                  type="text"
                  value={data.pais || ''}
                  onChange={(e) => onInputChange('pais', e.target.value)}
                  placeholder="País"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="collapsible-section">
        <button
          type="button"
          className="collapsible-header"
          onClick={() => toggleSection('contacto')}
        >
          <span>📞 Contacto (Expandir)</span>
          <span className="toggle-icon">{expandedSections.contacto ? '▼' : '▶'}</span>
        </button>
        {expandedSections.contacto && (
          <div className="collapsible-content">
            <div className="form-row">
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  value={data.email || ''}
                  onChange={(e) => onInputChange('email', e.target.value)}
                  placeholder="contacto@empresa.com"
                />
              </div>
              <div className="form-group">
                <label>Teléfono *</label>
                <input
                  type="tel"
                  value={data.telefono || ''}
                  onChange={(e) => onInputChange('telefono', e.target.value)}
                  placeholder="+56912345678"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>WhatsApp</label>
                <input
                  type="tel"
                  value={data.whatsapp || ''}
                  onChange={(e) => onInputChange('whatsapp', e.target.value)}
                  placeholder="+56912345678"
                />
              </div>
              <div className="form-group">
                <label>Horario de Atención</label>
                <input
                  type="text"
                  value={data.horarios || ''}
                  onChange={(e) => onInputChange('horarios', e.target.value)}
                  placeholder="Ej: Lunes-Viernes 9:00-18:00"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="collapsible-section">
        <button
          type="button"
          className="collapsible-header"
          onClick={() => toggleSection('online')}
        >
          <span>🌐 Presencia Online (Expandir)</span>
          <span className="toggle-icon">{expandedSections.online ? '▼' : '▶'}</span>
        </button>
        {expandedSections.online && (
          <div className="collapsible-content">
            <div className="form-row">
              <div className="form-group">
                <label>Sitio Web</label>
                <input
                  type="url"
                  value={data.web || ''}
                  onChange={(e) => onInputChange('web', e.target.value)}
                  placeholder="https://tusitio.com"
                />
              </div>
              <div className="form-group">
                <label>Instagram</label>
                <input
                  type="text"
                  value={data.instagram || ''}
                  onChange={(e) => onInputChange('instagram', e.target.value)}
                  placeholder="@usuario o enlace"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Facebook</label>
                <input
                  type="url"
                  value={data.facebook || ''}
                  onChange={(e) => onInputChange('facebook', e.target.value)}
                  placeholder="https://facebook.com/..."
                />
              </div>
              <div className="form-group">
                <label>Otros Enlaces</label>
                <input
                  type="text"
                  value={data.otros_links || ''}
                  onChange={(e) => onInputChange('otros_links', e.target.value)}
                  placeholder="LinkedIn, TikTok, YouTube, etc"
                />
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}

function ServiceModule({ data, onInputChange }) {
  const [expandedSections, setExpandedSections] = useState({})

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  return (
    <div className="module-fields">
      <div className="module-context">
        <h3 className="module-context-title">🎯 Oferta Principal: La Base de tu Estrategia</h3>

        <div className="module-context-primary">
          <p className="module-context-text">
            En esta sección necesitamos que definas el <strong>servicio, tratamiento, producto u oferta principal que quieres potenciar</strong>.
          </p>

          <p className="module-context-text">
            La clave es identificar <strong>la oferta con mayor valor estratégico</strong> para tu negocio. Eso significa elegir el servicio que tiene:
          </p>

          <ul className="module-context-list">
            <li><strong>Mayor demanda</strong> en el mercado</li>
            <li><strong>Mayor rentabilidad</strong> para tu empresa</li>
            <li><strong>Mayor escalabilidad</strong> potencial</li>
            <li><strong>Mayor prioridad comercial</strong> ahora mismo</li>
          </ul>

          <p className="module-context-text">
            Si tienes varios servicios importantes, puedes indicarlos también. Pero intenta <strong>priorizar uno como principal</strong> — el que realmente quieres escalar en los próximos 6-12 meses.
          </p>
        </div>

        <div className="module-context-secondary">
          <p className="module-context-note">
            💡 <strong>Esta información es estratégica.</strong> No es simplemente un catálogo de servicios. Utilizaremos lo que defines aquí para:
          </p>
          <ul className="module-context-impact">
            <li>Diseñar tu estrategia de marketing y captación</li>
            <li>Configurar publicidad y automatizaciones</li>
            <li>Definir el foco principal del negocio</li>
            <li>Alinear mensajes y posicionamiento</li>
          </ul>
          <p className="module-context-reassurance">
            De todas formas, terminaremos de definir esto contigo en la sesión de estrategia. Por ahora, sé lo más específico y honesto que puedas.
          </p>
        </div>
      </div>

      <div className="form-section-divider"></div>

      <div className="form-group form-group-primary">
        <label className="label-primary">📌 ¿Cuál es el servicio principal que quieres potenciar? *</label>
        <input
          type="text"
          value={data.nombre_servicio || ''}
          onChange={(e) => onInputChange('nombre_servicio', e.target.value)}
          placeholder="Ej: Auditoría de Marketing Digital, Implementación de CRM, Capacitación en Ventas"
          className="input-primary"
        />
        <p className="field-description field-description-guide">
          ¿Por qué es este el servicio que quieres escalar? Elige el que tenga mayor potencial de crecimiento y rentabilidad.
        </p>
      </div>

      <div className="form-group">
        <label className="label-strategic">¿Por qué priorizas este servicio? (Motivo estratégico)</label>
        <textarea
          value={data.por_que_prioritario || ''}
          onChange={(e) => onInputChange('por_que_prioritario', e.target.value)}
          placeholder="Ej: Es el que genera mayor margen, tiene mayor demanda del mercado, es donde somos más fuertes, es donde ven más valor nuestros clientes..."
          rows="2"
          className="textarea-strategic"
        />
        <p className="field-description field-description-small">
          💭 Ayúdanos a entender qué hace que este servicio sea estratégico para tu negocio.
        </p>
      </div>

      <div className="form-group">
        <label className="label-strategic">Descripción Detallada *</label>
        <textarea
          value={data.descripcion_detallada || ''}
          onChange={(e) => onInputChange('descripcion_detallada', e.target.value)}
          placeholder="Describe en detalle: qué incluye, cómo funciona, el proceso paso a paso, resultados esperados, tiempo de implementación..."
          rows="4"
        />
        <p className="field-description field-description-small">
          Cuanto más detalle, mejor podremos diseñar tu estrategia de marketing.
        </p>
      </div>

      <div className="form-section-divider"></div>

      <div className="collapsible-section">
        <button
          type="button"
          className="collapsible-header collapsible-header-important"
          onClick={() => toggleSection('alcance')}
        >
          <span>📋 Scope & Alcance: ¿Qué Incluye y Excluye?</span>
          <span className="toggle-icon">{expandedSections.alcance ? '▼' : '▶'}</span>
        </button>
        {expandedSections.alcance && (
          <div className="collapsible-content">
            <p className="section-intro">Define claramente qué está dentro y qué está fuera de este servicio. Esto evita confusiones y expectativas mal alineadas.</p>
            <div className="form-row">
              <div className="form-group">
                <label>✅ ¿Qué incluye exactamente?</label>
                <textarea
                  value={data.que_incluye || ''}
                  onChange={(e) => onInputChange('que_incluye', e.target.value)}
                  placeholder="Ej: Auditoría completa, Reporte ejecutivo, 2 sesiones de feedback, Implementación de cambios críticos..."
                  rows="2"
                />
              </div>
              <div className="form-group">
                <label>❌ ¿Qué NO incluye?</label>
                <textarea
                  value={data.que_no_incluye || ''}
                  onChange={(e) => onInputChange('que_no_incluye', e.target.value)}
                  placeholder="Ej: Implementación completa, Capacitación continua, Soporte post-proyecto, Cambios adicionales..."
                  rows="2"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>👥 ¿Para quién es ideal?</label>
                <textarea
                  value={data.para_quien || ''}
                  onChange={(e) => onInputChange('para_quien', e.target.value)}
                  placeholder="Ej: Empresas de 10-100 empleados, Presupuesto superior a $50k, Que quieren crecer rápido, Sin experiencia previa en..., etc"
                  rows="2"
                />
              </div>
              <div className="form-group">
                <label>👎 ¿Para quién NO es?</label>
                <textarea
                  value={data.para_quien_no || ''}
                  onChange={(e) => onInputChange('para_quien_no', e.target.value)}
                  placeholder="Ej: Startups sin presupuesto, Empresas que solo quieren asesoría rápida, Quien busca soluciones 100% automatizadas, etc"
                  rows="2"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="form-section-divider"></div>

      <div className="collapsible-section">
        <button
          type="button"
          className="collapsible-header"
          onClick={() => toggleSection('precios')}
        >
          <span>💰 Estructura de Precios & Modelo de Inversión</span>
          <span className="toggle-icon">{expandedSections.precios ? '▼' : '▶'}</span>
        </button>
        {expandedSections.precios && (
          <div className="collapsible-content">
            <p className="section-intro">Define claramente cómo funciona tu modelo de precios. Esto impactará cómo posicionamos el servicio y a quién le hablamos.</p>
            <div className="form-group">
              <label>💵 Rango de Precio/Tarifa *</label>
              <input
                type="text"
                value={data.precio_rango || ''}
                onChange={(e) => onInputChange('precio_rango', e.target.value)}
                placeholder="Ej: $1,000 - $5,000 USD / Ej: $299/mes / Ej: $50k - $150k por proyecto"
              />
              <p className="field-description field-description-small">
                Sé transparente. Si es rango amplio, explica qué varia los precios (alcance, complejidad, etc).
              </p>
            </div>
            <div className="form-group">
              <label>📦 Paquetes o Niveles de Servicio</label>
              <textarea
                value={data.paquetes || ''}
                onChange={(e) => onInputChange('paquetes', e.target.value)}
                placeholder="Ej: Básico ($1k) - Auditoría + Reporte | Profesional ($3k) - Todo lo anterior + 2 sesiones | Premium ($5k+) - Implementación completa"
                rows="2"
              />
            </div>
            <div className="form-group">
              <label>⏳ Duración & Modelo de Entrega</label>
              <input
                type="text"
                value={data.duracion || ''}
                onChange={(e) => onInputChange('duracion', e.target.value)}
                placeholder="Ej: Proyecto de 3 meses / Plan anual / Soporte mensual recurrente / Pago único de una vez"
              />
            </div>
            <div className="form-group">
              <label>💳 Opciones de Pago & Financiación</label>
              <textarea
                value={data.financiacion || ''}
                onChange={(e) => onInputChange('financiacion', e.target.value)}
                placeholder="Ej: Pago único con 10% desc. | Planes de 3 o 6 cuotas sin interés | Plan mensual recurrente | Financiación disponible"
                rows="2"
              />
            </div>
          </div>
        )}
      </div>

      <div className="form-section-divider"></div>

      <div className="collapsible-section">
        <button
          type="button"
          className="collapsible-header collapsible-header-important"
          onClick={() => toggleSection('diferenciales')}
        >
          <span>✨ Diferenciación: ¿Qué te Hace Único?</span>
          <span className="toggle-icon">{expandedSections.diferenciales ? '▼' : '▶'}</span>
        </button>
        {expandedSections.diferenciales && (
          <div className="collapsible-content">
            <p className="section-intro">En un mercado competitivo, necesitamos saber qué te diferencia. Esto será el corazón de tu mensajería de marketing.</p>
            <div className="form-group">
              <label>🎯 ¿Qué te diferencia de la competencia?</label>
              <textarea
                value={data.diferenciales || ''}
                onChange={(e) => onInputChange('diferenciales', e.target.value)}
                placeholder="Ej: Modelo único de trabajo, Experiencia de 15+ años, Tecnología propietaria, Resultados garantizados, Enfoque personalizado, Velocidad de implementación, etc"
                rows="3"
              />
              <p className="field-description field-description-small">
                💡 Sé específico. No digas 'mejor calidad'. Di qué hace que tu calidad sea superior: proceso, equipo, metodología, garantías, etc.
              </p>
            </div>
            <div className="form-group">
              <label>🏆 Principales Beneficios para el Cliente</label>
              <textarea
                value={data.beneficios || ''}
                onChange={(e) => onInputChange('beneficios', e.target.value)}
                placeholder="¿Cuáles son los resultados concretos? Ej: Aumento de 40% en ventas, Reducción de costos, Mejor experiencia del cliente, Tiempo ahorrado, etc"
                rows="3"
              />
            </div>
          </div>
        )}
      </div>

      <div className="form-section-divider"></div>

      <div className="collapsible-section">
        <button
          type="button"
          className="collapsible-header"
          onClick={() => toggleSection('objeciones')}
        >
          <span>🎬 Prueba Social: Casos de Éxito, FAQs & Objeciones</span>
          <span className="toggle-icon">{expandedSections.objeciones ? '▼' : '▶'}</span>
        </button>
        {expandedSections.objeciones && (
          <div className="collapsible-content">
            <p className="section-intro">Ayúdanos a entender cómo venderás esto. ¿Qué dicen tus clientes? ¿Cuáles son sus miedos? ¿Cómo respondes a sus dudas?</p>

            <div className="form-group">
              <label>🏆 Casos de Éxito & Testimonios</label>
              <textarea
                value={data.casos_exito || ''}
                onChange={(e) => onInputChange('casos_exito', e.target.value)}
                placeholder="Describe 2-3 casos reales. Ej: Cliente X pasó de Z problema a Y resultado en 3 meses. Qué dijo el cliente."
                rows="3"
              />
              <p className="field-description field-description-small">
                💡 Sé específico: cliente tipo, industria, resultado cuantificable, qué dijeron.
              </p>
            </div>

            <div className="form-group">
              <label>❓ Preguntas Frecuentes del Cliente</label>
              <textarea
                value={data.faqs || ''}
                onChange={(e) => onInputChange('faqs', e.target.value)}
                placeholder="¿Cómo funciona exactamente? ¿Cuándo veo resultados? ¿Qué pasa después? ¿Puedo cancelar? ¿Necesito experiencia previa? (una por línea)"
                rows="3"
              />
            </div>

            <div className="form-group">
              <label>🚫 Objeciones Frecuentes & Cómo las Respondes</label>
              <textarea
                value={data.objeciones_frecuentes || ''}
                onChange={(e) => onInputChange('objeciones_frecuentes', e.target.value)}
                placeholder="Objeción 1: 'Es muy caro' → Respuesta: 'El ROI típico es...' | Objeción 2: 'No tengo tiempo' → Respuesta: 'Realizamos X en tu lugar...'"
                rows="3"
              />
              <p className="field-description field-description-small">
                💭 Anticipar objeciones = Mejores anuncios, mejores scripts de ventas, mejor conversión.
              </p>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}

function IdealClientModule({ data, onInputChange }) {
  const [expandedSections, setExpandedSections] = useState({})

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  return (
    <div className="module-fields">
      <div className="module-context">
        <p className="module-context-why">
          El avatar de cliente define a quién le hablamos, cómo lo hacemos y dónde lo encontramos. Sin este perfil, la publicidad pierde foco y los mensajes no conectan con las personas correctas.
        </p>
        <p className="module-context-instruction">
          Describe a tu cliente ideal con el mayor detalle posible. No temas ser específico — cuanto más preciso seas, mejor será el targeting y más relevantes serán los anuncios.
        </p>
      </div>

      <div className="form-group">
        <label>Cliente Ideal - Descripción General *</label>
        <textarea
          value={data.cliente_ideal || ''}
          onChange={(e) => onInputChange('cliente_ideal', e.target.value)}
          placeholder="Describe tu avatar de cliente perfecto. Incluye: edad, género, ubicación, profesión, situación actual..."
          rows="4"
        />
      </div>

      <div className="collapsible-section">
        <button
          type="button"
          className="collapsible-header"
          onClick={() => toggleSection('desafios')}
        >
          <span>🎯 Desafíos & Dolores (Expandir)</span>
          <span className="toggle-icon">{expandedSections.desafios ? '▼' : '▶'}</span>
        </button>
        {expandedSections.desafios && (
          <div className="collapsible-content">
            <div className="form-group">
              <label>Problemas Principales, Dolores & Miedos *</label>
              <textarea
                value={data.problemas_principales || ''}
                onChange={(e) => onInputChange('problemas_principales', e.target.value)}
                placeholder="¿Cuáles son sus mayores desafíos, frustraciones y miedos? Incluye: problemas de negocio, dolores emocionales, lo que lo asusta"
                rows="3"
              />
            </div>
            <div className="form-group">
              <label>Barreras para Comprar</label>
              <input
                type="text"
                value={data.barreras || ''}
                onChange={(e) => onInputChange('barreras', e.target.value)}
                placeholder="Ej: Presupuesto limitado, falta de tiempo, desconfianza, malas experiencias previas"
              />
            </div>
          </div>
        )}
      </div>

      <div className="collapsible-section">
        <button
          type="button"
          className="collapsible-header"
          onClick={() => toggleSection('deseos')}
        >
          <span>✨ Objetivos & Motivaciones (Expandir)</span>
          <span className="toggle-icon">{expandedSections.deseos ? '▼' : '▶'}</span>
        </button>
        {expandedSections.deseos && (
          <div className="collapsible-content">
            <div className="form-group">
              <label>Deseos, Objetivos & Motivaciones *</label>
              <textarea
                value={data.deseos || ''}
                onChange={(e) => onInputChange('deseos', e.target.value)}
                placeholder="¿Qué desea lograr? ¿Cuál es su visión? ¿Qué lo motiva a tomar acción?"
                rows="3"
              />
            </div>
            <div className="form-group">
              <label>¿Qué necesita escuchar para convencerse?</label>
              <input
                type="text"
                value={data.necesita_escuchar || ''}
                onChange={(e) => onInputChange('necesita_escuchar', e.target.value)}
                placeholder="Ej: Garantías, testimonios, ROI garantizado, éxito comprobado"
              />
            </div>
          </div>
        )}
      </div>

      <div className="collapsible-section">
        <button
          type="button"
          className="collapsible-header"
          onClick={() => toggleSection('signals')}
        >
          <span>🎲 Identificar Buenos vs Malos Leads (Expandir)</span>
          <span className="toggle-icon">{expandedSections.signals ? '▼' : '▶'}</span>
        </button>
        {expandedSections.signals && (
          <div className="collapsible-content">
            <div className="form-row">
              <div className="form-group">
                <label>Señales de un Buen Lead</label>
                <textarea
                  value={data.senales_buen_lead || ''}
                  onChange={(e) => onInputChange('senales_buen_lead', e.target.value)}
                  placeholder="¿Cómo identificas clientes que realmente te necesitan? (características clave)"
                  rows="2"
                />
              </div>
              <div className="form-group">
                <label>Red Flags (Evitar)</label>
                <textarea
                  value={data.senales_mal_lead || ''}
                  onChange={(e) => onInputChange('senales_mal_lead', e.target.value)}
                  placeholder="Características de clientes que mejor evitar"
                  rows="2"
                />
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}

function BrandModule({ data, onChange, onFileUpload, isSaving }) {
  const [uploadState, setUploadState] = useState({}) // { categoryKey: 'idle' | 'hovering' | 'uploading' | 'success' | 'error' }
  const [categoryFiles, setCategoryFiles] = useState(data.drive_files || {})
  const [driveFolderLink, setDriveFolderLink] = useState('')
  const [linkError, setLinkError] = useState('')
  const [showTeamShare, setShowTeamShare] = useState(false)
  const [teamEmails, setTeamEmails] = useState('')

  // Category configuration
  const CATEGORIES = {
    identidad_visual: {
      name: '🎨 Identidad Visual',
      description: 'Logos, colores, tipografías, guías de estilo',
      accept: 'image/*,.pdf',
      color: '#D4AF37'
    },
    multimedia: {
      name: '🎬 Multimedia',
      description: 'Videos, imágenes, animaciones, banners',
      accept: 'image/*,video/*,.mp4,.mov,.avi',
      color: '#FF6B35'
    },
    comercial: {
      name: '📊 Comercial',
      description: 'Presentaciones, propuestas, PDFs comerciales',
      accept: '.pdf,.pptx,.doc,.docx,.xlsx',
      color: '#0066CC'
    },
    referencias: {
      name: '📎 Referencias',
      description: 'Inspiración, referencias visuales, competencia',
      accept: 'image/*,.pdf',
      color: '#6B9BD1'
    }
  }

  const handleDragOver = (e, categoryKey) => {
    e.preventDefault()
    e.stopPropagation()
    setUploadState(prev => ({ ...prev, [categoryKey]: 'hovering' }))
  }

  const handleDragLeave = (e, categoryKey) => {
    e.preventDefault()
    e.stopPropagation()
    setUploadState(prev => ({ ...prev, [categoryKey]: 'idle' }))
  }

  const handleDrop = async (e, categoryKey) => {
    e.preventDefault()
    e.stopPropagation()
    setUploadState(prev => ({ ...prev, [categoryKey]: 'idle' }))

    const files = e.dataTransfer?.files
    if (!files || files.length === 0) return

    // Handle multiple files
    for (const file of Array.from(files)) {
      await handleFileUpload(file, categoryKey)
    }
  }

  const handleFileSelect = async (e, categoryKey) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    for (const file of Array.from(files)) {
      await handleFileUpload(file, categoryKey)
    }
  }

  const handleFileUpload = async (file, categoryKey) => {
    try {
      setUploadState(prev => ({ ...prev, [categoryKey]: 'uploading' }))

      // Call the upload function
      const fileData = await onFileUpload(file, 'marca', categoryKey)

      if (fileData) {
        setCategoryFiles(prev => ({
          ...prev,
          [categoryKey]: [...(prev[categoryKey] || []), fileData]
        }))

        // Update data
        onChange({
          ...data,
          drive_files: {
            ...categoryFiles,
            [categoryKey]: [...(categoryFiles[categoryKey] || []), fileData]
          }
        })

        setUploadState(prev => ({ ...prev, [categoryKey]: 'success' }))

        // Reset to idle after 2 seconds
        setTimeout(() => {
          setUploadState(prev => ({ ...prev, [categoryKey]: 'idle' }))
        }, 2000)
      }
    } catch (error) {
      console.error('Error uploading file:', error)
      setUploadState(prev => ({ ...prev, [categoryKey]: 'error' }))

      setTimeout(() => {
        setUploadState(prev => ({ ...prev, [categoryKey]: 'idle' }))
      }, 3000)
    }
  }

  const handleLinkDriveFolder = async () => {
    if (!driveFolderLink.trim()) {
      setLinkError('Por favor ingresa un enlace o ID de carpeta válido')
      return
    }

    try {
      setLinkError('')
      // Link folder logic will be implemented in ClientOnboarding handleFileUpload
      onChange({
        ...data,
        drive_folder_link: driveFolderLink.trim()
      })
      setDriveFolderLink('')
    } catch (error) {
      setLinkError('No pudimos conectar la carpeta. Verifica que sea compartida contigo.')
    }
  }

  const getUploadStateStyles = (categoryKey) => {
    const state = uploadState[categoryKey] || 'idle'
    const baseStyles = {
      idle: 'upload-area-idle',
      hovering: 'upload-area-hovering',
      uploading: 'upload-area-uploading',
      success: 'upload-area-success',
      error: 'upload-area-error'
    }
    return baseStyles[state] || baseStyles.idle
  }

  return (
    <div className="module-fields">
      <div className="module-context">
        <h3 className="module-context-title">🎯 Marca, Identidad y Multimedia</h3>
        <div className="module-context-primary">
          <p>Tu marca es lo primero que percibe el cliente. Necesitamos tus materiales originales para que cada pieza de contenido, anuncio y comunicación sea coherente con tu identidad y genere reconocimiento.</p>
        </div>
        <div className="module-context-secondary">
          <p><strong>Opciones disponibles:</strong></p>
          <ul className="module-context-list">
            <li>📤 <strong>Sube archivos directamente:</strong> Logos, imágenes, videos, documentos comerciales</li>
            <li>🔗 <strong>Conecta una carpeta de Google Drive:</strong> Si ya tienes todo organizado</li>
            <li>👥 <strong>Compartir con tu equipo:</strong> Acceso centralizado a todos los materiales</li>
          </ul>
        </div>
      </div>

      {/* Información de Marca - Texto */}
      <div className="form-section-divider">
        <h3>📝 Información de tu Marca</h3>
      </div>

      <div className="form-group">
        <label className="label-strategic">Paleta de Colores *</label>
        <textarea
          value={data.paleta_colores || ''}
          onChange={(e) => onChange({ ...data, paleta_colores: e.target.value })}
          placeholder="Ej: Oro #D4AF37, Negro #000000, Blanco #FFFFFF"
          rows="2"
          className="textarea-strategic"
        />
      </div>

      <div className="form-group">
        <label className="label-strategic">Tipografías Utilizadas</label>
        <input
          type="text"
          value={data.tipografias || ''}
          onChange={(e) => onChange({ ...data, tipografias: e.target.value })}
          placeholder="Ej: Montserrat, Open Sans"
          className="input-primary"
        />
      </div>

      <div className="form-group">
        <label className="label-strategic">Estilo Visual *</label>
        <textarea
          value={data.estilo_visual || ''}
          onChange={(e) => onChange({ ...data, estilo_visual: e.target.value })}
          placeholder="Describe el estilo: minimalista, corporativo, artístico, moderno, etc"
          rows="2"
          className="textarea-strategic"
        />
      </div>

      <div className="form-group">
        <label className="label-strategic">Preferencias de Comunicación</label>
        <textarea
          value={data.preferencias_comunicacion || ''}
          onChange={(e) => onChange({ ...data, preferencias_comunicacion: e.target.value })}
          placeholder="Tone of voice, mensajes clave, personalidad de marca"
          rows="2"
          className="textarea-strategic"
        />
      </div>

      <div className="form-group">
        <label className="label-strategic">¿Qué NO hacer con tu marca?</label>
        <textarea
          value={data.no_hacer || ''}
          onChange={(e) => onChange({ ...data, no_hacer: e.target.value })}
          placeholder="Especifica qué está completamente fuera de tu identidad"
          rows="2"
          className="textarea-strategic"
        />
      </div>

      {/* Google Drive Link Option */}
      <div className="form-section-divider">
        <h3>🔗 Conectar Google Drive</h3>
      </div>

      <div className="form-group">
        <label className="label-strategic">O enlaza una carpeta existente (opcional)</label>
        <div className="drive-link-input-group">
          <input
            type="text"
            value={driveFolderLink}
            onChange={(e) => {
              setDriveFolderLink(e.target.value)
              setLinkError('')
            }}
            placeholder="Pega aquí el enlace de tu carpeta en Google Drive"
            className="input-primary"
          />
          <button
            onClick={handleLinkDriveFolder}
            className="btn-secondary"
            disabled={isSaving || !driveFolderLink.trim()}
          >
            Conectar
          </button>
        </div>
        {linkError && <p className="error-message">{linkError}</p>}
        <p className="input-help">Nota: Si tienes una carpeta en Drive con tus materiales, puedes conectarla aquí. Crearemos la estructura necesaria automáticamente.</p>
      </div>

      {/* File Upload Categories */}
      <div className="form-section-divider">
        <h3>📁 Sube tus Materiales por Categoría</h3>
      </div>

      {Object.entries(CATEGORIES).map(([categoryKey, category]) => (
        <div key={categoryKey} className="form-group">
          <label className="label-strategic">{category.name}</label>
          <p className="category-description">{category.description}</p>

          <div
            className={`upload-area ${getUploadStateStyles(categoryKey)}`}
            style={{
              borderColor: uploadState[categoryKey] === 'hovering' ? category.color : undefined,
              backgroundColor: uploadState[categoryKey] === 'hovering' ? `${category.color}15` : undefined
            }}
            onDragOver={(e) => handleDragOver(e, categoryKey)}
            onDragLeave={(e) => handleDragLeave(e, categoryKey)}
            onDrop={(e) => handleDrop(e, categoryKey)}
          >
            <input
              id={`file-input-${categoryKey}`}
              type="file"
              multiple
              onChange={(e) => handleFileSelect(e, categoryKey)}
              accept={category.accept}
              disabled={isSaving || uploadState[categoryKey] === 'uploading'}
              className="file-input-hidden"
            />

            {uploadState[categoryKey] === 'uploading' && (
              <div className="upload-status">
                <div className="spinner"></div>
                <p>Subiendo...</p>
              </div>
            )}

            {uploadState[categoryKey] === 'success' && (
              <div className="upload-status success">
                <p>✓ Archivo subido correctamente</p>
              </div>
            )}

            {uploadState[categoryKey] === 'error' && (
              <div className="upload-status error">
                <p>✗ Error al subir. Intenta nuevamente</p>
              </div>
            )}

            {!uploadState[categoryKey] || uploadState[categoryKey] === 'idle' ? (
              <label htmlFor={`file-input-${categoryKey}`} className="upload-label">
                <div className="upload-icon">📤</div>
                <p className="upload-text">
                  <strong>Arrastra archivos aquí</strong> o haz click para seleccionar
                </p>
                <p className="upload-hint">Formatos soportados: {getCategoryFormats(category)}</p>
              </label>
            ) : null}
          </div>

          {/* Display uploaded files for this category */}
          {categoryFiles[categoryKey] && categoryFiles[categoryKey].length > 0 && (
            <div className="uploaded-files-list">
              <h4>Archivos en {category.name.split(' ')[1]}:</h4>
              <div className="files-grid">
                {categoryFiles[categoryKey].map((file, idx) => (
                  <div key={idx} className="file-card">
                    <div className="file-preview">
                      <FilePreview file={file} />
                    </div>
                    <div className="file-info">
                      <p className="file-name">{truncateFileName(file.name, 20)}</p>
                      <p className="file-size">{formatFileSize(file.size)}</p>
                      <a href={file.viewUrl || file.url} target="_blank" rel="noopener noreferrer" className="file-link">
                        Ver en Drive →
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Team Sharing */}
      <div className="form-section-divider">
        <h3>👥 Compartir con tu Equipo</h3>
      </div>

      <div className="form-group">
        <button
          onClick={() => setShowTeamShare(!showTeamShare)}
          className="btn-outline"
        >
          {showTeamShare ? '▼ Ocultar opciones' : '▶ Compartir con tu equipo'}
        </button>

        {showTeamShare && (
          <div className="team-share-panel">
            <label className="label-strategic">Emails de tu equipo (separados por comas)</label>
            <textarea
              value={teamEmails}
              onChange={(e) => setTeamEmails(e.target.value)}
              placeholder="ejemplo@empresa.com, otro@empresa.com"
              rows="2"
              className="textarea-strategic"
            />
            <button
              onClick={() => {
                onChange({
                  ...data,
                  team_emails: teamEmails.split(',').map(e => e.trim()).filter(Boolean)
                })
                setTeamEmails('')
                setShowTeamShare(false)
              }}
              className="btn-primary"
              disabled={isSaving || !teamEmails.trim()}
            >
              Enviar invitaciones
            </button>
          </div>
        )}
      </div>

    </div>
  )
}

// Helper components and functions
function FilePreview({ file }) {
  const mimeType = file.mimeType || ''
  const name = file.name || ''

  if (mimeType.startsWith('image/')) {
    return <img src={file.downloadUrl || file.url} alt={name} className="file-thumb" />
  } else if (mimeType.startsWith('video/')) {
    return <video className="file-thumb"><source src={file.downloadUrl || file.url} /></video>
  } else if (mimeType === 'application/pdf' || name.endsWith('.pdf')) {
    return <div className="file-thumb pdf-thumb">📄 PDF</div>
  } else {
    return <div className="file-thumb default-thumb">📎</div>
  }
}

function getCategoryFormats(category) {
  if (category.accept.includes('image')) return 'JPG, PNG, GIF, SVG'
  if (category.accept.includes('video')) return 'MP4, MOV, AVI, WebM'
  if (category.accept.includes('pdf')) return 'PDF, DOC, PPTX, XLSX'
  return 'Múltiples formatos'
}

function truncateFileName(name, length = 20) {
  if (name.length <= length) return name
  const ext = name.split('.').pop()
  const base = name.substring(0, length - ext.length - 3)
  return `${base}...${ext}`
}

function formatFileSize(bytes) {
  if (!bytes) return '0 B'
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
}

function MetaModule({ data, onInputChange }) {
  // Video de Meta Ads - URL hardcodeada
  const metaVideoUrl = 'https://www.youtube.com/embed/TMVV4wm81kA'

  const handleStatusButtonClick = (status) => {
    onInputChange('estado_meta', status)
  }

  return (
    <div className="module-fields">
      <div className="module-context">
        <p className="module-context-why">
          Meta es el principal canal de captación de clientes nuevos. Con tus datos configuramos correctamente las campañas, el píxel de seguimiento y el Business Manager para maximizar cada inversión en publicidad.
        </p>
        <p className="module-context-instruction">
          Mira primero el tutorial completo, luego indica si ya tienes activos en Meta o si lo configuraremos desde cero.
        </p>
      </div>

      {/* Video Tutorial Meta */}
      <VideoSection
        videoUrl={metaVideoUrl}
        title="📹 Tutorial: Configurar Meta/Facebook Ads"
      />

      <div className="form-group">
        <label>¿Ya tienes activos en Meta? *</label>
        <select
          value={data.tiene_activos || ''}
          onChange={(e) => onInputChange('tiene_activos', e.target.value)}
        >
          <option value="">Seleccionar...</option>
          <option value="si">Sí, ya tengo activos</option>
          <option value="no">No, es la primera vez</option>
          <option value="parcial">Parcialmente</option>
        </select>
      </div>

      {data.tiene_activos === 'si' && (
        <>
          <div className="form-group">
            <label>Portfolio ID</label>
            <input
              type="text"
              value={data.portfolio_id || ''}
              onChange={(e) => onInputChange('portfolio_id', e.target.value)}
              placeholder="ID del portfolio"
            />
          </div>
          <div className="form-group">
            <label>Instagram Username (para Assets)</label>
            <input
              type="text"
              value={data.instagram_username || ''}
              onChange={(e) => onInputChange('instagram_username', e.target.value)}
              placeholder="@tuinstagram"
            />
          </div>
          <div className="form-group">
            <label>Business Manager ID</label>
            <input
              type="text"
              value={data.business_manager_id || ''}
              onChange={(e) => onInputChange('business_manager_id', e.target.value)}
              placeholder="ID del Business Manager"
            />
          </div>
          <div className="form-group">
            <label>ID de Cuenta Publicitaria</label>
            <input
              type="text"
              value={data.cuenta_publicitaria_id || ''}
              onChange={(e) => onInputChange('cuenta_publicitaria_id', e.target.value)}
              placeholder="ID de ad account"
            />
          </div>
          <div className="form-group">
            <label>Pixel ID</label>
            <input
              type="text"
              value={data.pixel_id || ''}
              onChange={(e) => onInputChange('pixel_id', e.target.value)}
              placeholder="Facebook Pixel ID"
            />
          </div>
          <div className="form-group">
            <label>Email de Acceso a Meta</label>
            <input
              type="email"
              value={data.email_acceso || ''}
              onChange={(e) => onInputChange('email_acceso', e.target.value)}
              placeholder="Email asociado a la cuenta"
            />
          </div>
          <div className="form-group">
            <label>¿Compartirás acceso directo? (Business Assets)</label>
            <select
              value={data.confirmacion_compartido || ''}
              onChange={(e) => onInputChange('confirmacion_compartido', e.target.value)}
            >
              <option value="">Seleccionar...</option>
              <option value="si">Sí, compartir acceso</option>
              <option value="no">No, solo datos</option>
              <option value="despues">Después</option>
            </select>
          </div>
        </>
      )}

      <div className="form-group form-group-divider">
        <label>¿Estado de tu Configuración en Meta? *</label>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => handleStatusButtonClick('completado')}
            style={{
              flex: 1,
              minWidth: '140px',
              background: data.estado_meta === 'completado' ? '#d4af37' : '#2a2a2a',
              color: data.estado_meta === 'completado' ? '#000' : '#f5f5f5',
              border: `2px solid ${data.estado_meta === 'completado' ? '#d4af37' : '#333'}`,
              padding: '0.75rem',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: data.estado_meta === 'completado' ? 'bold' : 'normal'
            }}
          >
            ✓ Completado
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => handleStatusButtonClick('necesita_ayuda')}
            style={{
              flex: 1,
              minWidth: '140px',
              background: data.estado_meta === 'necesita_ayuda' ? '#d4af37' : '#2a2a2a',
              color: data.estado_meta === 'necesita_ayuda' ? '#000' : '#f5f5f5',
              border: `2px solid ${data.estado_meta === 'necesita_ayuda' ? '#d4af37' : '#333'}`,
              padding: '0.75rem',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: data.estado_meta === 'necesita_ayuda' ? 'bold' : 'normal'
            }}
          >
            🆘 Necesito Ayuda
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => handleStatusButtonClick('despues')}
            style={{
              flex: 1,
              minWidth: '140px',
              background: data.estado_meta === 'despues' ? '#d4af37' : '#2a2a2a',
              color: data.estado_meta === 'despues' ? '#000' : '#f5f5f5',
              border: `2px solid ${data.estado_meta === 'despues' ? '#d4af37' : '#333'}`,
              padding: '0.75rem',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: data.estado_meta === 'despues' ? 'bold' : 'normal'
            }}
          >
            ⏳ Lo haré después
          </button>
        </div>
      </div>

    </div>
  )
}

function GoogleModule({ data, onInputChange }) {
  // Determine video URL based on user's status selection
  const getVideoUrl = () => {
    const status = data.entorno_google_status
    if (status === 'si') {
      return 'https://www.youtube.com/embed/1jVyPxWMJow?si=integration-verification'
    } else if (status === 'no') {
      return 'https://www.youtube.com/embed/1jVyPxWMJow?si=setup-tutorial'
    } else {
      return 'https://www.youtube.com/embed/1jVyPxWMJow?si=overview'
    }
  }

  const handleStatusChange = (newStatus) => {
    onInputChange('entorno_google_status', newStatus)
    // Set help flag based on status
    if (newStatus === 'si') {
      onInputChange('entorno_google_help', false)
    } else if (newStatus === 'no') {
      onInputChange('entorno_google_help', true)
    } else if (newStatus === 'no_seguro') {
      onInputChange('entorno_google_help', null)
    }
  }

  const handleConfirmation = () => {
    onInputChange('entorno_google_confirmation', true)
  }

  const currentStatus = data.entorno_google_status || ''

  return (
    <div className="module-fields">
      {/* Unified Context Section */}
      <div className="module-context entorno-google-header">
        <p className="module-context-why">
          <strong>🌐 Tu Entorno Google es fundamental</strong> para que tus clientes potenciales te encuentren. Google Ads captura intención de compra en tiempo real, mientras que Google Maps y tu Business Profile crean confianza y visibilidad local.
        </p>
        <p className="module-context-instruction">
          Te haremos algunas preguntas simples para entender tu situación actual y ayudarte a optimizar tu presencia en Google.
        </p>
      </div>

      {/* Main Question: Three-Way Conditional */}
      <div className="form-group entorno-google-status-select">
        <label>¿Cuál es tu situación actual con Google? *</label>
        <select
          value={currentStatus}
          onChange={(e) => handleStatusChange(e.target.value)}
          style={{ marginTop: '0.5rem' }}
        >
          <option value="">Seleccionar...</option>
          <option value="si">✅ Sí, tengo Google Ads, Maps y/o Business Profile configurado</option>
          <option value="no">❌ No, necesito ayuda para configurar esto</option>
          <option value="no_seguro">❓ No estoy seguro</option>
        </select>
      </div>

      {/* BRANCH 1: User Has It Configured ("si") */}
      {currentStatus === 'si' && (
        <div className="entorno-google-branch-si branch-content-container">
          <div className="branch-message">
            <p>
              <strong>¡Excelente!</strong> Solo necesitamos tu Google Maps link (Business Profile) para integrar todo en tu dashboard de Alphalux.
            </p>
            <p style={{ fontSize: '0.9rem', color: '#888', marginTop: '0.5rem' }}>
              Si prefieres no compartir por ahora, podemos integrar otros aspectos. Lo importante es tener tu Business Profile optimizado.
            </p>
          </div>

          {/* Optional Google Maps Link Field */}
          <div className="form-group">
            <label>Link de tu Google Business Profile (opcional)</label>
            <input
              type="url"
              value={data.google_maps_link || ''}
              onChange={(e) => onInputChange('google_maps_link', e.target.value)}
              placeholder="https://maps.google.com/place/..."
            />
            <p className="field-description field-description-small">
              Puedes encontrarlo en: https://business.google.com/ o compartir el link de tu negocio en Google Maps
            </p>
          </div>

          {/* Video for "Already Configured" */}
          <VideoSection
            videoUrl="https://www.youtube.com/embed/1jVyPxWMJow"
            title="📹 Verificación: Integración de tu Google Business"
          />
        </div>
      )}

      {/* BRANCH 2: User Needs Help ("no") */}
      {currentStatus === 'no' && (
        <div className="entorno-google-branch-no branch-content-container">
          <div className="branch-message help-badge">
            <p>
              <strong>¡Perfecto!</strong> Nuestro equipo especializado puede ayudarte a configurar Google Ads, Google Maps y tu Business Profile desde cero.
            </p>
          </div>

          {/* Help Resources and Information */}
          <div className="branch-resources">
            <div style={{ background: '#f0f0f0', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
              <h4 style={{ marginTop: 0 }}>📋 Próximos Pasos:</h4>
              <ul style={{ marginBottom: 0 }}>
                <li>Te contactaremos para agendar una sesión de configuración</li>
                <li>Crearemos y optimizaremos tu Google Business Profile</li>
                <li>Configuraremos tu primera campaña de Google Ads</li>
                <li>Integraremos todo en tu dashboard de Alphalux</li>
              </ul>
            </div>

            <div style={{ background: '#fff3cd', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
              <h4 style={{ marginTop: 0 }}>💡 Información que necesitaremos:</h4>
              <ul style={{ marginBottom: 0 }}>
                <li>Tu dirección física (para Google Maps)</li>
                <li>Horarios de atención</li>
                <li>Teléfono y email de contacto</li>
                <li>Acceso a una cuenta de Gmail para Google Ads</li>
              </ul>
            </div>

            <p style={{ fontSize: '0.9rem', color: '#666' }}>
              <strong>Contacto:</strong> support@alphalux.com o llama a nuestro equipo de soporte
            </p>
          </div>

          {/* Video for "Needs Help" */}
          <VideoSection
            videoUrl="https://www.youtube.com/embed/1jVyPxWMJow"
            title="📹 Tutorial: Cómo configurar Google Ads y Google Maps desde cero"
          />
        </div>
      )}

      {/* BRANCH 3: User Unsure ("no_seguro") */}
      {currentStatus === 'no_seguro' && (
        <div className="entorno-google-branch-undecided branch-content-container">
          <div className="branch-message">
            <p>
              <strong>¡Perfecto, hagamos esto juntos!</strong> Aquí te mostramos qué necesitas saber sobre Google y cómo puede ayudarte a crecer.
            </p>
          </div>

          {/* Educational Content */}
          <div style={{ background: '#f5f5f5', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
            <h4 style={{ marginTop: 0 }}>📚 ¿Qué incluye "Entorno Google"?</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.95rem' }}>
              <div>
                <p><strong>🔍 Google Ads:</strong></p>
                <p>Publicidad dirigida a personas que buscan activamente lo que ofreces</p>
              </div>
              <div>
                <p><strong>📍 Google Maps:</strong></p>
                <p>Que tus clientes te encuentren en el mapa y vean reseñas</p>
              </div>
              <div>
                <p><strong>💼 Business Profile:</strong></p>
                <p>Tu información de negocio visible en búsquedas de Google</p>
              </div>
              <div>
                <p><strong>⭐ Reseñas & Reputación:</strong></p>
                <p>Construir confianza con tus clientes potenciales</p>
              </div>
            </div>
          </div>

          {/* Optional Google Maps Link Field */}
          <div className="form-group">
            <label>Si ya tienes Google Maps, comparte el link (opcional)</label>
            <input
              type="url"
              value={data.google_maps_link || ''}
              onChange={(e) => onInputChange('google_maps_link', e.target.value)}
              placeholder="https://maps.google.com/place/..."
            />
            <p className="field-description field-description-small">
              Si no estás seguro, déjalo en blanco. Podemos investigar juntos en la siguiente sesión.
            </p>
          </div>

          {/* Video for "Overview/Learning Path" */}
          <VideoSection
            videoUrl="https://www.youtube.com/embed/1jVyPxWMJow"
            title="📹 Vista General: Google Ads y Maps para tu negocio"
          />
        </div>
      )}

      {/* Confirmation Button - Only show if a status is selected */}
      {currentStatus && (
        <div className="form-group" style={{ marginTop: '1.5rem' }}>
          <button
            type="button"
            className="btn-primary confirmation-button-entorno"
            onClick={handleConfirmation}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: '#d4af37',
              color: '#000',
              border: 'none',
              borderRadius: '4px',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            ✓ Confirmar y Continuar
          </button>
          {data.entorno_google_confirmation && (
            <p style={{ color: '#4caf50', fontSize: '0.9rem', marginTop: '0.5rem' }}>
              ✓ Selección confirmada
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function SlackModule({ data, onInputChange }) {
  // Video de Slack - URL hardcodeada
  const slackVideoUrl = 'https://www.youtube.com/embed/0iE0pYrpkWM'

  const handleSlackStatusChange = (status) => {
    onInputChange('slack_status', status)
    if (status === 'necesita_ayuda') {
      onInputChange('slack_needs_help', true)
    } else {
      onInputChange('slack_needs_help', false)
    }
  }

  return (
    <div className="module-fields">
      <div className="module-context">
        <p className="module-context-why">
          Slack será nuestro espacio de trabajo compartido. Aquí coordinamos tareas, compartimos avances, resolvemos dudas y gestionamos toda la implementación en tiempo real — sin perder información en emails o mensajes dispersos.
        </p>
        <p className="module-context-instruction">
          Mira el tutorial, confirma que lo viste, añade el email que usarán en Slack y los emails del equipo que participará. ¡Simple y listo!
        </p>
      </div>

      {/* Video Tutorial Slack */}
      <VideoSection
        videoUrl={slackVideoUrl}
        title="📹 Tutorial: Configurar Slack y Comunicación"
      />

      <div className="form-group">
        <label>¿Has visto el tutorial? *</label>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button
            type="button"
            className={`btn-secondary ${data.tutorial_visto ? 'active' : ''}`}
            onClick={() => onInputChange('tutorial_visto', true)}
            style={{
              flex: 1,
              background: data.tutorial_visto ? '#d4af37' : '#2a2a2a',
              color: data.tutorial_visto ? '#000' : '#f5f5f5',
              border: `2px solid ${data.tutorial_visto ? '#d4af37' : '#333'}`,
              padding: '0.75rem',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: data.tutorial_visto ? 'bold' : 'normal'
            }}
          >
            ✓ Sí, ya lo vi
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => onInputChange('tutorial_visto', false)}
            style={{
              flex: 1,
              background: !data.tutorial_visto ? '#d4af37' : '#2a2a2a',
              color: !data.tutorial_visto ? '#000' : '#f5f5f5',
              border: `2px solid ${!data.tutorial_visto ? '#d4af37' : '#333'}`,
              padding: '0.75rem',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: !data.tutorial_visto ? 'bold' : 'normal'
            }}
          >
            ✗ No, aún no
          </button>
        </div>
      </div>

      <div className="form-group">
        <label>Email Principal que Usarán en Slack *</label>
        <input
          type="email"
          value={data.email_principal_empresa || ''}
          onChange={(e) => onInputChange('email_principal_empresa', e.target.value)}
          placeholder="Email de la empresa para Slack (ej: admin@empresa.com)"
        />
      </div>

      <div className="form-group">
        <label>Emails de Miembros del Equipo *</label>
        <textarea
          value={data.emails_equipo || ''}
          onChange={(e) => onInputChange('emails_equipo', e.target.value)}
          placeholder="Emails de los miembros que estarán en Slack (uno por línea)"
          rows="3"
        />
      </div>

      <div className="form-group form-group-divider">
        <label>¿Necesitas Ayuda con la Configuración de Slack? *</label>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => handleSlackStatusChange('completado')}
            style={{
              flex: 1,
              background: data.slack_status === 'completado' ? '#4caf50' : '#2a2a2a',
              color: data.slack_status === 'completado' ? '#fff' : '#f5f5f5',
              border: `2px solid ${data.slack_status === 'completado' ? '#4caf50' : '#333'}`,
              padding: '0.75rem',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: data.slack_status === 'completado' ? 'bold' : 'normal'
            }}
          >
            ✓ Completado
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => handleSlackStatusChange('necesita_ayuda')}
            style={{
              flex: 1,
              background: data.slack_status === 'necesita_ayuda' ? '#ff9800' : '#2a2a2a',
              color: data.slack_status === 'necesita_ayuda' ? '#000' : '#f5f5f5',
              border: `2px solid ${data.slack_status === 'necesita_ayuda' ? '#ff9800' : '#333'}`,
              padding: '0.75rem',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: data.slack_status === 'necesita_ayuda' ? 'bold' : 'normal'
            }}
          >
            🆘 Necesito Ayuda
          </button>
        </div>
      </div>

    </div>
  )
}

function AIModule({ data, onInputChange, onFileUpload }) {
  // Video de IA - URL hardcodeada
  const iaVideoUrl = 'https://www.youtube.com/embed/c0DZWvnM0TY'

  const handleCopyPrompt = () => {
    const structuredPrompt = `Eres un asistente de servicio al cliente inteligente y profesional.

ROL Y OBJETIVO:
${data.objetivo_principal || '[Tu objetivo principal aquí]'}

TONO Y MANERA DE COMUNICAR:
Comunícate con un tono ${data.tono ? `${data.tono}` : '[selecciona un tono]'}.

DEBES RESPONDER SOBRE:
${data.que_responder || '[Temas que debes responder]'}

NO DEBES RESPONDER SOBRE:
${data.que_no_responder || '[Temas que NO debes abordar]'}

CUÁNDO DERIVAR A UN HUMANO:
${data.cuando_derivar || '[Situaciones que requieren atención humana]'}

INFORMACIÓN QUE DEBES RECOPILAR:
${data.datos_recoger || '[Datos importantes a recopilar de los usuarios]'}

Basándote en esta información, actúa como el asistente descrito y proporciona respuestas coherentes y útiles.`

    navigator.clipboard.writeText(structuredPrompt).then(() => {
      alert('✓ Prompt copiado al portapapeles. Ya puedes pegarlo en ChatGPT o Gemini.')
    }).catch(() => {
      alert('Error al copiar el prompt. Intenta nuevamente.')
    })
  }

  return (
    <div className="module-fields">
      <div className="module-context">
        <p className="module-context-why">
          Un asistente de IA bien configurado puede responder el 70% de las consultas de forma automática, 24 horas al día. El éxito depende de la <strong>base de conocimiento</strong> — necesitamos que sea clara, completa y actualizada para que el asistente realmente entienda tu negocio.
        </p>
        <p className="module-context-instruction">
          Configura el asistente indicando su nombre, objetivo, tono y comportamiento. Luego, elige cómo construir su base de conocimiento: escribiendo contenido, usando un prompt para ChatGPT, o cargando archivos de tu empresa.
        </p>
      </div>

      {/* Video Tutorial IA */}
      <VideoSection
        videoUrl={iaVideoUrl}
        title="📹 Tutorial: Configurar Asistente IA y Base de Conocimiento"
      />

      <div className="form-group">
        <label>¿Quieres implementar IA? *</label>
        <select
          value={data.implementar_ia || ''}
          onChange={(e) => onInputChange('implementar_ia', e.target.value)}
        >
          <option value="">Seleccionar...</option>
          <option value="si">✓ Sí, quiero IA</option>
          <option value="no">✗ No, sin IA</option>
        </select>
      </div>

      {data.implementar_ia === 'si' && (
        <>
          <div className="form-group">
            <label>Nombre del Asistente *</label>
            <input
              type="text"
              value={data.nombre_asistente || ''}
              onChange={(e) => onInputChange('nombre_asistente', e.target.value)}
              placeholder="Ej: Alex, CustomerBot, etc"
            />
          </div>

          <div className="form-group">
            <label>Objetivo Principal del Asistente *</label>
            <textarea
              value={data.objetivo_principal || ''}
              onChange={(e) => onInputChange('objetivo_principal', e.target.value)}
              placeholder="¿Cuál es el principal objetivo? Ej: Responder preguntas frecuentes, captar leads, dar soporte técnico"
              rows="2"
            />
          </div>

          <div className="form-group">
            <label>Tono del Asistente *</label>
            <select
              value={data.tono || ''}
              onChange={(e) => onInputChange('tono', e.target.value)}
            >
              <option value="">Seleccionar...</option>
              <option value="formal y profesional">Formal y profesional</option>
              <option value="casual y amigable">Casual y amigable</option>
              <option value="técnico y directo">Técnico y directo</option>
              <option value="creativo y divertido">Creativo y divertido</option>
            </select>
          </div>

          <div className="form-group">
            <label>¿Qué debe responder? *</label>
            <textarea
              value={data.que_responder || ''}
              onChange={(e) => onInputChange('que_responder', e.target.value)}
              placeholder="Tipos de preguntas que el IA debe responder. Ej: Preguntas sobre servicios, horarios, precios, políticas"
              rows="2"
            />
          </div>

          <div className="form-group">
            <label>¿Qué NO debe responder?</label>
            <textarea
              value={data.que_no_responder || ''}
              onChange={(e) => onInputChange('que_no_responder', e.target.value)}
              placeholder="Temas fuera de scope o sensibles. Ej: Temas políticos, información confidencial"
              rows="2"
            />
          </div>

          <div className="form-group">
            <label>¿Cuándo derivar a humano?</label>
            <textarea
              value={data.cuando_derivar || ''}
              onChange={(e) => onInputChange('cuando_derivar', e.target.value)}
              placeholder="Situaciones complejas que necesitan atención humana. Ej: Reclamos, problemas técnicos avanzados"
              rows="2"
            />
          </div>

          <div className="form-group">
            <label>¿Qué datos debe recopilar el asistente?</label>
            <textarea
              value={data.datos_recoger || ''}
              onChange={(e) => onInputChange('datos_recoger', e.target.value)}
              placeholder="Ej: Nombre, email, tipo de consulta, teléfono, empresa, presupuesto aproximado"
              rows="2"
            />
          </div>

          {/* CONOCIMIENTO BASE - SECCIÓN PRINCIPAL */}
          <div className="form-group form-group-divider">
            <label>⭐ Base de Conocimiento del Asistente *</label>
            <p className="field-description field-description-large">
              Esta es la <strong>información clave</strong> que el asistente usará para responder. Elige cómo proporcionarla:
            </p>
          </div>

          {/* THREE OPTIONS AS VISUAL CARDS */}
          <div className="ia-knowledge-options">
            {/* OPCIÓN A: TEXTO DIRECTO */}
            <div
              className={`ia-knowledge-card ${data.base_conocimiento === 'texto' ? 'active' : ''}`}
              onClick={() => onInputChange('base_conocimiento', 'texto')}
              style={{
                cursor: 'pointer',
                padding: '1.25rem',
                border: data.base_conocimiento === 'texto' ? '2px solid #4caf50' : '2px solid #333',
                borderRadius: '8px',
                background: data.base_conocimiento === 'texto' ? '#f0f8f0' : '#1a1a1a',
                marginBottom: '1rem',
                transition: 'all 0.3s ease'
              }}
            >
              <h4 style={{ margin: '0 0 0.5rem 0', color: data.base_conocimiento === 'texto' ? '#2e7d32' : '#d4af37' }}>
                📝 Opción A: Escribir Directamente
              </h4>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#999' }}>
                Ingresa todo el contenido manualmente en un textarea cómodo
              </p>
            </div>

            {data.base_conocimiento === 'texto' && (
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label>Contenido de la Base de Conocimiento *</label>
                <p className="field-description field-description-small">
                  Ingresa aquí toda la información que el asistente necesita conocer sobre tu negocio: productos, servicios, políticas, FAQs, procedimientos, precios, etc.
                </p>
                <textarea
                  value={data.base_conocimiento_texto || ''}
                  onChange={(e) => onInputChange('base_conocimiento_texto', e.target.value)}
                  placeholder={`Ejemplo de contenido:\n\n# Servicios\nOfrecemos consultoría digital, desarrollo web, marketing digital...\n\n# Precios\nPaquete Básico: $500/mes\nPaquete Premium: $1500/mes\n\n# FAQs\nP: ¿Cuál es el tiempo de implementación?\nR: Generalmente 2-4 semanas según la complejidad...`}
                  rows="8"
                  style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
                />
              </div>
            )}

            {/* OPCIÓN B: PROMPT PARA CHATGPT */}
            <div
              className={`ia-knowledge-card ${data.base_conocimiento === 'prompt' ? 'active' : ''}`}
              onClick={() => onInputChange('base_conocimiento', 'prompt')}
              style={{
                cursor: 'pointer',
                padding: '1.25rem',
                border: data.base_conocimiento === 'prompt' ? '2px solid #d4af37' : '2px solid #333',
                borderRadius: '8px',
                background: data.base_conocimiento === 'prompt' ? '#fafaf0' : '#1a1a1a',
                marginBottom: '1rem',
                transition: 'all 0.3s ease'
              }}
            >
              <h4 style={{ margin: '0 0 0.5rem 0', color: data.base_conocimiento === 'prompt' ? '#b8860b' : '#d4af37' }}>
                🤖 Opción B: Usar Prompt Personalizado
              </h4>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#999' }}>
                Genera contenido con ChatGPT o Gemini usando un prompt estructurado. Copiar y pegar = fácil.
              </p>
            </div>

            {data.base_conocimiento === 'prompt' && (
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label>Genera tu Prompt Automatizado *</label>
                <p className="field-description field-description-small">
                  Completa los campos anteriores (Objetivo, Tono, etc.) y luego copia el prompt generado abajo. Pégalo en ChatGPT o Gemini para que genere el contenido de tu base de conocimiento.
                </p>

                <div style={{
                  background: '#2a2a2a',
                  border: '1px solid #444',
                  borderRadius: '6px',
                  padding: '1rem',
                  marginBottom: '1rem',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  color: '#e0e0e0',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  {`Eres un asistente de servicio al cliente inteligente y profesional.

ROL Y OBJETIVO:
${data.objetivo_principal || '[Tu objetivo principal aquí]'}

TONO Y MANERA DE COMUNICAR:
Comunícate con un tono ${data.tono ? `${data.tono}` : '[selecciona un tono]'}.

DEBES RESPONDER SOBRE:
${data.que_responder || '[Temas que debes responder]'}

NO DEBES RESPONDER SOBRE:
${data.que_no_responder || '[Temas que NO debes abordar]'}

CUÁNDO DERIVAR A UN HUMANO:
${data.cuando_derivar || '[Situaciones que requieren atención humana]'}

INFORMACIÓN QUE DEBES RECOPILAR:
${data.datos_recoger || '[Datos importantes a recopilar de los usuarios]'}

Basándote en esta información, actúa como el asistente descrito y proporciona respuestas coherentes y útiles.`}
                </div>

                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: '#d4af37',
                    color: '#000',
                    border: 'none',
                    borderRadius: '4px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '0.95rem',
                    transition: 'background 0.3s ease'
                  }}
                  onMouseOver={(e) => e.target.style.background = '#e0bb42'}
                  onMouseOut={(e) => e.target.style.background = '#d4af37'}
                >
                  📋 Copiar Prompt al Portapapeles
                </button>

                <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#999', fontStyle: 'italic' }}>
                  Después de copiar, ve a <strong>ChatGPT.com</strong> o <strong>Gemini.google.com</strong>, pega el prompt en un nuevo chat, y deja que la IA genere la base de conocimiento completa para tu asistente.
                </p>
              </div>
            )}

            {/* OPCIÓN C: CARGAR ARCHIVO */}
            <div
              className={`ia-knowledge-card ${data.base_conocimiento === 'archivo' ? 'active' : ''}`}
              onClick={() => document.querySelector('input[type="file"]')?.click()}
              style={{
                cursor: 'pointer',
                padding: '1.25rem',
                border: data.base_conocimiento === 'archivo' ? '2px solid #ff9800' : '2px solid #333',
                borderRadius: '8px',
                background: data.base_conocimiento === 'archivo' ? '#fff8f0' : '#1a1a1a',
                marginBottom: '1rem',
                transition: 'all 0.3s ease'
              }}
            >
              <h4 style={{ margin: '0 0 0.5rem 0', color: data.base_conocimiento === 'archivo' ? '#e65100' : '#d4af37' }}>
                📁 Opción C: Cargar Archivo
              </h4>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#999' }}>
                Sube PDFs, documentos, FAQs, manuales o transcripciones de tu empresa
              </p>
            </div>

            {data.base_conocimiento === 'archivo' && (
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label>Archivo de Base de Conocimiento *</label>
                <p className="field-description field-description-small">
                  Carga documentos que contengan toda la información del negocio. Soportamos: PDF, Word (.docx), Excel (.xlsx), TXT
                </p>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.xls,.xlsx"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      const file = e.target.files[0]
                      const fileName = file.name
                      onInputChange('base_conocimiento_archivo_nombre', fileName)
                      onInputChange('base_conocimiento_archivo_url', `archivo-cargado: ${fileName}`)
                      onInputChange('base_conocimiento', 'archivo')
                    }
                  }}
                  style={{ display: 'none' }}
                />
                <div style={{
                  border: '2px dashed #666',
                  borderRadius: '6px',
                  padding: '2rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: '#0d0d0d',
                  transition: 'all 0.3s ease'
                }}
                  onClick={() => document.querySelector('input[type="file"]')?.click()}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = '#d4af37'
                    e.currentTarget.style.background = '#1a1a1a'
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = '#666'
                    e.currentTarget.style.background = '#0d0d0d'
                  }}
                >
                  <p style={{ margin: 0, color: '#999' }}>
                    📎 Haz clic o arrastra un archivo aquí
                  </p>
                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: '#666' }}>
                    PDF, Word, Excel, TXT
                  </p>
                </div>
                {data.base_conocimiento_archivo_nombre && (
                  <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#4caf50', fontWeight: 'bold' }}>
                    ✓ Archivo cargado: {data.base_conocimiento_archivo_nombre}
                  </p>
                )}
              </div>
            )}
          </div>
        </>
      )}

    </div>
  )
}

function InspirationModule({ data, onInputChange }) {
  return (
    <div className="module-fields">
      <div className="module-context">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <span className="optional-badge">Opcional</span>
        </div>
        <p className="module-context-why">
          Esta sección es opcional, pero puede ayudarnos a entender mejor las referencias visuales, estilo de comunicación y dirección estratégica que te gustaría transmitir.
        </p>
        <p className="module-context-instruction">
          Comparte lo que tengas en mente — webs, competidores, marcas, anuncios o estilos que te inspiren. No necesitas completar todos los campos.
        </p>
      </div>

      <div className="form-group">
        <label>Webs de Referencia</label>
        <textarea
          value={data.webs_referencia || ''}
          onChange={(e) => onInputChange('webs_referencia', e.target.value)}
          placeholder="URLs de sitios web que te inspiran (uno por línea)"
          rows="3"
        />
        <p className="field-description field-description-small">
          💡 Comparte webs que te gusten por su diseño, contenido o user experience
        </p>
      </div>

      <div className="form-group">
        <label>Anuncios que te Gustan</label>
        <textarea
          value={data.anuncios_gustan || ''}
          onChange={(e) => onInputChange('anuncios_gustan', e.target.value)}
          placeholder="Describe anuncios o campañas que te inspiran"
          rows="3"
        />
        <p className="field-description field-description-small">
          💡 Pueden ser de Facebook, Instagram, Google Ads o cualquier plataforma
        </p>
      </div>

      <div className="form-group">
        <label>Competidores o Empresas a Analizar</label>
        <textarea
          value={data.competencia_analizar || ''}
          onChange={(e) => onInputChange('competencia_analizar', e.target.value)}
          placeholder="Competidores o empresas similares a analizar (uno por línea)"
          rows="3"
        />
        <p className="field-description field-description-small">
          💡 Incluye nombre de empresa y qué hacen bien en tu opinión
        </p>
      </div>

      <div className="form-group">
        <label>Marcas que te Gustan</label>
        <textarea
          value={data.marcas_gustan || ''}
          onChange={(e) => onInputChange('marcas_gustan', e.target.value)}
          placeholder="Marcas cuyo branding o estrategia te gusta"
          rows="2"
        />
      </div>

      <div className="form-group">
        <label>Marcas que NO quieres Parecer</label>
        <textarea
          value={data.marcas_no_parecer || ''}
          onChange={(e) => onInputChange('marcas_no_parecer', e.target.value)}
          placeholder="Marcas cuyo estilo quieres evitar"
          rows="2"
        />
      </div>

      <div className="form-group">
        <label>Elementos que te Gustan (Diseño, Comunicación, etc)</label>
        <textarea
          value={data.elementos_que_gustan || ''}
          onChange={(e) => onInputChange('elementos_que_gustan', e.target.value)}
          placeholder="Describe elementos visuales o de comunicación que te atraen: ¿diseño minimalista? ¿colores vibrantes? ¿tipografía grande?"
          rows="2"
        />
        <p className="field-description field-description-small">
          💡 Esto nos ayudará a afinar el tono de voz y estilo de tu marca
        </p>
      </div>

      <div className="form-group">
        <label>Comentarios Adicionales o Ideas</label>
        <textarea
          value={data.comentarios_adicionales || ''}
          onChange={(e) => onInputChange('comentarios_adicionales', e.target.value)}
          placeholder="Cualquier otra idea, observación o referencia que quieras compartir"
          rows="2"
        />
        <p className="field-description field-description-small">
          💡 Comparte libremente lo que tengas en mente — nada es demasiado pequeño
        </p>
      </div>

    </div>
  )
}

function SchedulingModule({ data, onInputChange }) {
  const ghlCalendarLink = 'https://api.leadconnectorhq.com/widget/booking/MbiVA67dwhXqM0NVREpf'

  const handleWhatsAppContact = () => {
    const phoneNumber = '+51987654321'
    const message = encodeURIComponent('Hola Alphalux, acabo de completar mi onboarding y quiero agendar la sesión de estrategia. ¿Cuándo podemos hablar?')
    window.open(`https://wa.me/${phoneNumber.replace(/\D/g, '')}?text=${message}`, '_blank')
  }

  return (
    <div className="module-fields">
      <div className="module-context">
        <p className="module-context-why">
          Tu sesión de embarque es el punto de partida de toda la implementación. En ella conocemos tu negocio en profundidad, resolvemos dudas y alineamos la estrategia para sacar el máximo valor de Alphalux.
        </p>
        <p className="module-context-instruction">
          Elige el formato que prefieras para reservar tu sesión con nuestro equipo.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
        {/* Opción 1: Calendario */}
        <div className="scheduling-card" style={{
          padding: '1.5rem',
          background: '#1a1a1a',
          border: '1px solid #333',
          borderRadius: '8px',
          textAlign: 'center',
          transition: 'all 0.3s ease'
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📅</div>
          <h4 style={{ marginBottom: '0.5rem' }}>Calendario</h4>
          <p style={{ fontSize: '0.9rem', color: '#999', marginBottom: '1.25rem' }}>
            Elige fecha y hora disponible en nuestro calendario
          </p>
          <a
            href={ghlCalendarLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
            style={{ display: 'block', width: '100%' }}
          >
            Agendar Ahora
          </a>
        </div>

        {/* Opción 2: WhatsApp */}
        <div className="scheduling-card" style={{
          padding: '1.5rem',
          background: '#1a1a1a',
          border: '1px solid #333',
          borderRadius: '8px',
          textAlign: 'center',
          transition: 'all 0.3s ease'
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>💬</div>
          <h4 style={{ marginBottom: '0.5rem' }}>WhatsApp</h4>
          <p style={{ fontSize: '0.9rem', color: '#999', marginBottom: '1.25rem' }}>
            Contacta directamente a nuestro equipo por mensaje
          </p>
          <button
            type="button"
            className="btn-primary"
            onClick={handleWhatsAppContact}
            style={{ display: 'block', width: '100%' }}
          >
            Enviar Mensaje
          </button>
        </div>
      </div>

      <input
        type="hidden"
        value={data.calendario_link || ghlCalendarLink}
        onChange={(e) => onInputChange('calendario_link', e.target.value)}
      />
    </div>
  )
}

function ConfirmationModule({ data, onBackToWelcome, clientId, onInputChange }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const completedModules = MODULES.filter(m => m.id !== 'welcome' && m.id !== 'confirmacion' && data[m.id] && Object.keys(data[m.id]).length > 0)
  const progress = Math.round((completedModules.length / (MODULES.length - 2)) * 100)

  const handleFinalSubmission = async () => {
    try {
      setIsSubmitting(true)
      setError('')

      if (!clientId) {
        setError('Error: No se encontró ID del cliente')
        return
      }

      // Update client status to "completado"
      const docRef = doc(db, 'clientes', clientId)
      await updateDoc(docRef, {
        estado_cliente: 'completado',
        estado_admin: 'en_revision',
        progreso: 100,
        onboarding_completado_en: Timestamp.now(),
        updatedAt: new Date()
      })

      setSubmitted(true)
      onInputChange('confirmacion_fecha', new Date().toISOString())

      // Auto-redirect after 3 seconds
      setTimeout(() => {
        window.location.href = '/'
      }, 3000)
    } catch (err) {
      console.error('Error submitting onboarding:', err)
      setError('Hubo un error al enviar tu onboarding. Por favor intenta de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // PHASE 1: Pre-submission state
  if (!submitted) {
    return (
      <div className="module-confirmation">
        <div className="confirmation-header" style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>¡Listo para despegar! 🚀</h2>
          <p style={{ color: '#999', fontSize: '1.1rem' }}>
            Hemos recopilado toda la información necesaria para tu implementación
          </p>
        </div>

        {/* Progress Summary */}
        <div className="confirmation-progress" style={{ marginTop: '2.5rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <p style={{ fontSize: '0.95rem', color: '#999' }}>Completitud del onboarding</p>
            <p style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#d4af37' }}>{progress}%</p>
          </div>
          <div className="progress-bar" style={{ height: '6px', background: '#333', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, #d4af37, #e5c158)', transition: 'width 0.3s ease' }}></div>
          </div>
        </div>

        {/* Module Checklist */}
        <div className="confirmation-checklist" style={{ background: '#1a1a1a', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
          <h4 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: '0.5rem' }}>✓</span> Módulos Completados
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {MODULES.filter(m => m.id !== 'welcome' && m.id !== 'confirmacion').map(module => (
              <div key={module.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '24px',
                  height: '24px',
                  background: (data[module.id] && Object.keys(data[module.id]).length > 0) ? '#d4af37' : '#333',
                  borderRadius: '50%',
                  fontSize: '0.8rem',
                  color: (data[module.id] && Object.keys(data[module.id]).length > 0) ? '#000' : '#666',
                  fontWeight: 'bold'
                }}>
                  {(data[module.id] && Object.keys(data[module.id]).length > 0) ? '✓' : '○'}
                </span>
                <span style={{ fontSize: '0.9rem' }}>{module.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Information summary */}
        <div className="confirmation-message" style={{ marginBottom: '2rem', padding: '1.5rem', background: 'rgba(212, 175, 55, 0.1)', border: '1px solid rgba(212, 175, 55, 0.3)', borderRadius: '8px' }}>
          <p style={{ marginBottom: '1rem', color: '#d4af37' }}>
            <strong>📌 Lo que sucede a continuación:</strong>
          </p>
          <ol style={{ marginLeft: '1.5rem', lineHeight: '1.8', color: '#ccc' }}>
            <li>Presiona el botón para enviar tu onboarding</li>
            <li>Nuestro equipo recibirá toda tu información de forma segura</li>
            <li>Realizaremos una revisión detallada en 24-48 horas</li>
            <li>Te contactaremos para confirmar próximos pasos</li>
            <li>Comenzaremos con tu implementación y estrategia</li>
          </ol>
        </div>

        {/* Error message if any */}
        {error && (
          <div style={{ padding: '1rem', background: '#ff6b6b', borderRadius: '6px', marginBottom: '1.5rem', color: '#fff' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Final CTA Button */}
        <button
          onClick={handleFinalSubmission}
          disabled={isSubmitting}
          className="btn-primary"
          style={{
            display: 'block',
            width: '100%',
            padding: '1rem',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            opacity: isSubmitting ? 0.7 : 1,
            cursor: isSubmitting ? 'not-allowed' : 'pointer'
          }}
        >
          {isSubmitting ? '⏳ Enviando...' : '✓ Completar y Enviar Onboarding'}
        </button>
      </div>
    )
  }

  // PHASE 2: Post-submission success state
  return (
    <div className="module-confirmation" style={{ textAlign: 'center' }}>
      <div style={{ padding: '3rem 2rem' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1.5rem', animation: 'pulse 1s ease-in-out' }}>
          ✨
        </div>

        <h2 style={{ fontSize: '2.2rem', marginBottom: '1rem', color: '#d4af37' }}>
          ¡Onboarding Completado!
        </h2>

        <p style={{ fontSize: '1.1rem', color: '#999', marginBottom: '2rem', maxWidth: '500px', margin: '0 auto 2rem' }}>
          Tu información ha sido enviada exitosamente. Nuestro equipo de Alphalux ya está analizando tu perfil para preparar la estrategia perfecta.
        </p>

        <div className="confirmation-message" style={{ padding: '1.5rem', background: '#1a1a1a', border: '1px solid #d4af37', borderRadius: '8px', textAlign: 'left', maxWidth: '500px', margin: '0 auto 2rem' }}>
          <p style={{ marginBottom: '1rem', color: '#d4af37' }}>
            <strong>🎯 Próximos Pasos:</strong>
          </p>
          <ul style={{ marginLeft: '1.5rem', lineHeight: '2' }}>
            <li>✓ Revisión del onboarding (24-48 horas)</li>
            <li>✓ Seguimiento personalizado via email o WhatsApp</li>
            <li>✓ Confirmación de fecha para tu sesión de estrategia</li>
            <li>✓ Inicio de la implementación</li>
          </ul>
        </div>

        <p style={{ color: '#999', fontSize: '0.9rem', marginBottom: '2rem' }}>
          Serás redirigido en unos momentos...
        </p>
      </div>
    </div>
  )
}
