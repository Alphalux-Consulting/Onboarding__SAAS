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
import LoadingScreen from '../components/LoadingScreen'
import Logo from '../components/Logo'
import './pages.css'

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
  1: "Comencemos con lo esencial. Los datos de tu empresa.",
  2: "Perfecto. Ahora define tu servicio principal con precisión.",
  3: "Excelente. Tu cliente ideal marcará toda la estrategia.",
  4: "Tu identidad visual. El lenguaje de tu marca.",
  5: "Meta Ads: el motor de captación para tu negocio.",
  6: "Google: visibilidad local y búsqueda activa.",
  7: "Slack será nuestro espacio de operación diaria.",
  8: "IA: automatiza y escala tu atención al cliente.",
  9: "Inspiración y referencias para afinar la estrategia.",
  10: "Último paso. Agendemos la reunión de inicio.",
  11: "Onboarding completado. Listo para el lanzamiento."
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

      // Validar módulo actual (excepto welcome y confirmacion)
      if (currentModule.id !== 'welcome' && currentModule.id !== 'confirmacion') {
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

  const handleFileUpload = async (file, folder = 'general') => {
    try {
      setSaving(true)
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

  return (
    <div className="onboarding-layout">
      {/* Sidebar */}
      <aside className="onboarding-sidebar">
        <div className="sidebar-brand">
          <Logo variant="mark" />
          <span className="sidebar-brand-name">Alphalux</span>
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
                onClick={() => (isDone || isActive) && setCurrentStep(stepIdx)}
                tabIndex={isDone || isActive ? 0 : -1}
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

        <div className="onboarding-step-wrapper">
          {error && (
            <div className="form-error" style={{ marginBottom: '1.5rem' }}>
              <span>⚠️</span> <span>{error}</span>
            </div>
          )}

          {currentStep < MODULES.length - 1 && (
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
              onBackToWelcome={() => setCurrentStep(0)}
            />
          </div>

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
        </div>
      </main>
    </div>
  )
}

// Componente para renderizar módulos específicos
function ModuleRenderer({ module, data, onDataChange, onInputChange, onFileUpload, isSaving, clientData, onStartOnboarding, progress, onBackToWelcome }) {
  switch (module.id) {
    case 'welcome':
      return <WelcomeModule clientData={clientData} onStartOnboarding={onStartOnboarding} progress={progress} />
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
      return <ConfirmationModule data={data} onBackToWelcome={onBackToWelcome} />
    default:
      return <div>Módulo no encontrado</div>
  }
}

// Módulos individuales
function WelcomeModule({ clientData, onStartOnboarding, progress = 0 }) {
  const companyName = clientData?.nombre_empresa || clientData?.nombre_comercial || ''
  const videoUrl = 'https://www.youtube.com/embed/15cEtTMmvJk'

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
      <div className="welcome-hero">
        <Logo />
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
        <div className="video-container">
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
          <span className="welcome-meta-val">10</span>
          <span className="welcome-meta-lbl">etapas</span>
        </div>
        <div className="welcome-meta-sep" />
        <div className="welcome-meta-item">
          <span className="welcome-meta-val">~30</span>
          <span className="welcome-meta-lbl">minutos</span>
        </div>
        <div className="welcome-meta-sep" />
        <div className="welcome-meta-item">
          <span className="welcome-meta-val">Auto</span>
          <span className="welcome-meta-lbl">guardado</span>
        </div>
      </div>

      <div className="welcome-roadmap">
        <h3 className="welcome-roadmap-title">Tu hoja de ruta</h3>
        <div className="welcome-stages-grid">
          {roadmapStages.map(stage => (
            <div key={stage.num} className="welcome-stage-card">
              <span className="welcome-stage-num">{stage.num}</span>
              <span className="welcome-stage-icon">{stage.icon}</span>
              <span className="welcome-stage-name">{stage.name}</span>
              <span className="welcome-stage-desc">{stage.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {progress > 0 && (
        <div className="welcome-progress-returning">
          <div className="welcome-progress-track">
            <div className="welcome-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <p className="welcome-progress-text">Progreso guardado: <strong>{progress}%</strong></p>
        </div>
      )}

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
              <div className="form-group">
                <label>Google Maps</label>
                <input
                  type="url"
                  value={data.google_maps || ''}
                  onChange={(e) => onInputChange('google_maps', e.target.value)}
                  placeholder="https://maps.google.com/..."
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
        <p className="module-context-why">
          Tu servicio principal es el núcleo de toda la estrategia de captación. Cuanto más claro lo definamos, más precisos serán tus anuncios, tus mensajes y tu posicionamiento en el mercado.
        </p>
        <p className="module-context-instruction">
          Enfócate en UN solo servicio — el que quieres escalar ahora. Sé específico en la descripción, precios y diferenciales. Más detalle = mejor resultado.
        </p>
      </div>

      <div className="form-group">
        <label>Nombre del Servicio Principal *</label>
        <input
          type="text"
          value={data.nombre_servicio || ''}
          onChange={(e) => onInputChange('nombre_servicio', e.target.value)}
          placeholder="Ej: Consultoría de Marketing"
        />
        <p className="field-description" style={{ fontSize: '0.85rem', color: '#999', marginTop: '0.25rem' }}>
          💡 Enfócate en UN SOLO servicio, tu oferta estrella. No hagas una lista genérica.
        </p>
      </div>

      <div className="form-group">
        <label>Descripción Detallada *</label>
        <textarea
          value={data.descripcion_detallada || ''}
          onChange={(e) => onInputChange('descripcion_detallada', e.target.value)}
          placeholder="Describe en detalle qué incluye, cómo funciona, proceso, resultados esperados..."
          rows="4"
        />
      </div>

      <div className="collapsible-section">
        <button
          type="button"
          className="collapsible-header"
          onClick={() => toggleSection('alcance')}
        >
          <span>📋 ¿Qué Incluye? (Expandir)</span>
          <span className="toggle-icon">{expandedSections.alcance ? '▼' : '▶'}</span>
        </button>
        {expandedSections.alcance && (
          <div className="collapsible-content">
            <div className="form-row">
              <div className="form-group">
                <label>¿Qué incluye?</label>
                <textarea
                  value={data.que_incluye || ''}
                  onChange={(e) => onInputChange('que_incluye', e.target.value)}
                  placeholder="Características, entregas, beneficios incluidos (uno por línea)"
                  rows="2"
                />
              </div>
              <div className="form-group">
                <label>¿Qué NO incluye?</label>
                <textarea
                  value={data.que_no_incluye || ''}
                  onChange={(e) => onInputChange('que_no_incluye', e.target.value)}
                  placeholder="Limitaciones, exclusiones, lo que está fuera de este servicio"
                  rows="2"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>¿Para quién es ideal?</label>
                <textarea
                  value={data.para_quien || ''}
                  onChange={(e) => onInputChange('para_quien', e.target.value)}
                  placeholder="Describe el tipo de cliente ideal para este servicio"
                  rows="2"
                />
              </div>
              <div className="form-group">
                <label>¿Para quién NO es?</label>
                <textarea
                  value={data.para_quien_no || ''}
                  onChange={(e) => onInputChange('para_quien_no', e.target.value)}
                  placeholder="Qué tipo de cliente NO encaja con este servicio"
                  rows="2"
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
          onClick={() => toggleSection('precios')}
        >
          <span>💰 Precios & Paquetes (Expandir)</span>
          <span className="toggle-icon">{expandedSections.precios ? '▼' : '▶'}</span>
        </button>
        {expandedSections.precios && (
          <div className="collapsible-content">
            <div className="form-group">
              <label>Rango de Precio/Tarifa *</label>
              <input
                type="text"
                value={data.precio_rango || ''}
                onChange={(e) => onInputChange('precio_rango', e.target.value)}
                placeholder="Ej: $500 - $2000 USD / Ej: desde $99/mes"
              />
            </div>
            <div className="form-group">
              <label>Paquetes o Opciones</label>
              <textarea
                value={data.paquetes || ''}
                onChange={(e) => onInputChange('paquetes', e.target.value)}
                placeholder="Básico, Profesional, Premium - describe las diferencias (uno por línea)"
                rows="2"
              />
            </div>
            <div className="form-group">
              <label>¿Hay opciones de financiación/pagos?</label>
              <textarea
                value={data.financiacion || ''}
                onChange={(e) => onInputChange('financiacion', e.target.value)}
                placeholder="Ej: Pago único, 3 cuotas, plan mensual, etc"
                rows="2"
              />
            </div>
            <div className="form-group">
              <label>Duración del Servicio</label>
              <input
                type="text"
                value={data.duracion || ''}
                onChange={(e) => onInputChange('duracion', e.target.value)}
                placeholder="Ej: 3 meses, 1 año, proyecto puntual, etc"
              />
            </div>
          </div>
        )}
      </div>

      <div className="collapsible-section">
        <button
          type="button"
          className="collapsible-header"
          onClick={() => toggleSection('diferenciales')}
        >
          <span>✨ Beneficios & Diferenciales (Expandir)</span>
          <span className="toggle-icon">{expandedSections.diferenciales ? '▼' : '▶'}</span>
        </button>
        {expandedSections.diferenciales && (
          <div className="collapsible-content">
            <div className="form-group">
              <label>¿Por qué es prioritario potenciarlo?</label>
              <textarea
                value={data.por_que_prioritario || ''}
                onChange={(e) => onInputChange('por_que_prioritario', e.target.value)}
                placeholder="Cuéntanos por qué este servicio es prioritario para ti y para tu negocio..."
                rows="2"
              />
            </div>
            <div className="form-group">
              <label>¿Qué te diferencia? (Diferenciales)</label>
              <textarea
                value={data.diferenciales || ''}
                onChange={(e) => onInputChange('diferenciales', e.target.value)}
                placeholder="Qué te hace diferente de la competencia en este servicio (uno por línea)"
                rows="2"
              />
            </div>
          </div>
        )}
      </div>

      <div className="collapsible-section">
        <button
          type="button"
          className="collapsible-header"
          onClick={() => toggleSection('objeciones')}
        >
          <span>🚫 Objeciones & Respuestas (Expandir)</span>
          <span className="toggle-icon">{expandedSections.objeciones ? '▼' : '▶'}</span>
        </button>
        {expandedSections.objeciones && (
          <div className="collapsible-content">
            <div className="form-group">
              <label>Objeciones Frecuentes</label>
              <textarea
                value={data.objeciones_frecuentes || ''}
                onChange={(e) => onInputChange('objeciones_frecuentes', e.target.value)}
                placeholder="'Es muy caro', 'No tengo tiempo', etc - y tus respuestas (una por línea)"
                rows="2"
              />
            </div>
            <div className="form-group">
              <label>Casos de Éxito / Testimonios</label>
              <textarea
                value={data.casos_exito || ''}
                onChange={(e) => onInputChange('casos_exito', e.target.value)}
                placeholder="Ejemplos de clientes satisfechos, resultados logrados, cambios generados"
                rows="2"
              />
            </div>
            <div className="form-group">
              <label>Preguntas Frecuentes (FAQs)</label>
              <textarea
                value={data.faqs || ''}
                onChange={(e) => onInputChange('faqs', e.target.value)}
                placeholder="¿Cómo funciona?, ¿Cuándo veo resultados?, etc (una por línea)"
                rows="2"
              />
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
  const [uploadedFiles, setUploadedFiles] = useState(data.archivos || [])

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const fileData = await onFileUpload(file, 'marca')
    if (fileData) {
      const newFiles = [...uploadedFiles, fileData]
      setUploadedFiles(newFiles)
      onChange({ ...data, archivos: newFiles })
    }
  }

  return (
    <div className="module-fields">
      <div className="module-context">
        <p className="module-context-why">
          Tu marca es lo primero que percibe el cliente. Necesitamos conocer tu lenguaje visual para que cada pieza de contenido, anuncio y comunicación sea coherente con tu identidad y genere reconocimiento.
        </p>
        <p className="module-context-instruction">
          Comparte colores, tipografías y estilo visual. Sube tus archivos de marca — logos, imágenes, videos — para que trabajemos siempre con los materiales originales.
        </p>
      </div>

      <div className="form-group">
        <label>Paleta de Colores *</label>
        <textarea
          value={data.paleta_colores || ''}
          onChange={(e) => onChange({ ...data, paleta_colores: e.target.value })}
          placeholder="Ej: Oro #D4AF37, Negro #000000, Blanco #FFFFFF"
          rows="2"
        />
      </div>

      <div className="form-group">
        <label>Tipografías Utilizadas</label>
        <input
          type="text"
          value={data.tipografias || ''}
          onChange={(e) => onChange({ ...data, tipografias: e.target.value })}
          placeholder="Ej: Montserrat, Open Sans"
        />
      </div>

      <div className="form-group">
        <label>Estilo Visual *</label>
        <textarea
          value={data.estilo_visual || ''}
          onChange={(e) => onChange({ ...data, estilo_visual: e.target.value })}
          placeholder="Describe el estilo: minimalista, corporativo, artístico, etc"
          rows="2"
        />
      </div>

      <div className="form-group">
        <label>Referencias/Inspiración</label>
        <textarea
          value={data.referencias || ''}
          onChange={(e) => onChange({ ...data, referencias: e.target.value })}
          placeholder="URLs de sitios con estilo similar"
          rows="2"
        />
      </div>

      <div className="form-group">
        <label>Preferencias de Comunicación</label>
        <textarea
          value={data.preferencias_comunicacion || ''}
          onChange={(e) => onChange({ ...data, preferencias_comunicacion: e.target.value })}
          placeholder="Tone of voice, mensajes clave, etc"
          rows="2"
        />
      </div>

      <div className="form-group">
        <label>¿Qué NO hacer con tu marca?</label>
        <textarea
          value={data.no_hacer || ''}
          onChange={(e) => onChange({ ...data, no_hacer: e.target.value })}
          placeholder="Especifica qué está fuera de tu marca"
          rows="2"
        />
      </div>

      <div className="form-group">
        <label>Material Multimedia (Logos, Imágenes, Videos) *</label>
        <div className="file-upload">
          <input
            type="file"
            onChange={handleFileSelect}
            disabled={isSaving}
            accept="image/*,video/*,.pdf"
          />
          <p className="upload-help">Sube logos, imágenes de marca, videos, etc.</p>
        </div>

        {uploadedFiles.length > 0 && (
          <div className="uploaded-files">
            <h4>Archivos subidos:</h4>
            <ul>
              {uploadedFiles.map((file, idx) => (
                <li key={idx}>
                  <a href={file.url} target="_blank" rel="noopener noreferrer">
                    {file.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

    </div>
  )
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

      <div className="form-group" style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #333' }}>
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
  // Video de Google Ads - URL hardcodeada
  const googleVideoUrl = 'https://www.youtube.com/embed/1jVyPxWMJow'

  const handleStatusButtonClick = (status) => {
    onInputChange('estado_google', status)
  }

  return (
    <div className="module-fields">
      <div className="module-context">
        <p className="module-context-why">
          Google captura clientes que ya están buscando activamente lo que ofreces — es intención de compra en tiempo real. Google Maps, por su parte, aumenta tu visibilidad local y genera confianza en quienes te encuentran por primera vez.
        </p>
        <p className="module-context-instruction">
          Si ya tienes cuenta de Google Ads o perfil en Google Maps, comparte los datos de acceso. Si no tienes, lo configuraremos juntos desde el inicio.
        </p>
      </div>

      {/* Video Tutorial Google */}
      <VideoSection
        videoUrl={googleVideoUrl}
        title="📹 Tutorial: Configurar Google Ads y Google Maps"
      />

      <div style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid #333' }}>
        <h4 style={{ marginBottom: '1rem', color: '#d4af37' }}>📌 Google Ads</h4>

        <div className="form-group">
          <label>¿Ya tienes Google Ads configurado?</label>
          <select
            value={data.tiene_google_ads || ''}
            onChange={(e) => onInputChange('tiene_google_ads', e.target.value)}
          >
            <option value="">Seleccionar...</option>
            <option value="si">Sí, ya tengo cuenta</option>
            <option value="no">No, es la primera vez</option>
            <option value="parcial">Parcialmente</option>
          </select>
        </div>

        {data.tiene_google_ads === 'si' && (
          <>
            <div className="form-group">
              <label>Google Ads Customer ID</label>
              <input
                type="text"
                value={data.google_ads_id || ''}
                onChange={(e) => onInputChange('google_ads_id', e.target.value)}
                placeholder="ID de tu cuenta Google Ads (10-16 dígitos)"
              />
            </div>
            <div className="form-group">
              <label>Email de Acceso a Google Ads</label>
              <input
                type="email"
                value={data.email_acceso_ads || ''}
                onChange={(e) => onInputChange('email_acceso_ads', e.target.value)}
                placeholder="Email asociado a la cuenta de Google Ads"
              />
            </div>
            <div className="form-group">
              <label>¿Compartirás acceso a la cuenta?</label>
              <select
                value={data.confirmacion_ads || ''}
                onChange={(e) => onInputChange('confirmacion_ads', e.target.value)}
              >
                <option value="">Seleccionar...</option>
                <option value="si">Sí, compartir acceso</option>
                <option value="no">No, solo datos</option>
                <option value="despues">Después</option>
              </select>
            </div>
          </>
        )}
      </div>

      <div style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid #333' }}>
        <h4 style={{ marginBottom: '1rem', color: '#d4af37' }}>📍 Google Maps</h4>

        <div className="form-group">
          <label>Link de tu Negocio en Google Maps</label>
          <input
            type="url"
            value={data.google_maps_link || ''}
            onChange={(e) => onInputChange('google_maps_link', e.target.value)}
            placeholder="https://maps.google.com/..."
          />
          <p className="field-description" style={{ fontSize: '0.85rem', color: '#999', marginTop: '0.25rem' }}>
            💡 Si no tienes, podemos crearla. Necesitamos tu dirección física.
          </p>
        </div>

        <div className="form-group">
          <label>Email de Propietario de Negocio en Google</label>
          <input
            type="email"
            value={data.email_acceso_maps || ''}
            onChange={(e) => onInputChange('email_acceso_maps', e.target.value)}
            placeholder="Email con el que está registrado el negocio"
          />
        </div>

        <div className="form-group">
          <label>¿Compartirás acceso a Google Maps?</label>
          <select
            value={data.confirmacion_maps || ''}
            onChange={(e) => onInputChange('confirmacion_maps', e.target.value)}
          >
            <option value="">Seleccionar...</option>
            <option value="si">Sí, compartir acceso</option>
            <option value="no">No, solo datos</option>
            <option value="despues">Después</option>
          </select>
        </div>
      </div>

      <div className="form-group">
        <label>¿Estado de tu Configuración en Google? *</label>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => handleStatusButtonClick('completado')}
            style={{
              flex: 1,
              minWidth: '140px',
              background: data.estado_google === 'completado' ? '#d4af37' : '#2a2a2a',
              color: data.estado_google === 'completado' ? '#000' : '#f5f5f5',
              border: `2px solid ${data.estado_google === 'completado' ? '#d4af37' : '#333'}`,
              padding: '0.75rem',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: data.estado_google === 'completado' ? 'bold' : 'normal'
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
              background: data.estado_google === 'necesita_ayuda' ? '#d4af37' : '#2a2a2a',
              color: data.estado_google === 'necesita_ayuda' ? '#000' : '#f5f5f5',
              border: `2px solid ${data.estado_google === 'necesita_ayuda' ? '#d4af37' : '#333'}`,
              padding: '0.75rem',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: data.estado_google === 'necesita_ayuda' ? 'bold' : 'normal'
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
              background: data.estado_google === 'despues' ? '#d4af37' : '#2a2a2a',
              color: data.estado_google === 'despues' ? '#000' : '#f5f5f5',
              border: `2px solid ${data.estado_google === 'despues' ? '#d4af37' : '#333'}`,
              padding: '0.75rem',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: data.estado_google === 'despues' ? 'bold' : 'normal'
            }}
          >
            ⏳ Lo haré después
          </button>
        </div>
      </div>

    </div>
  )
}

function SlackModule({ data, onInputChange }) {
  // Video de Slack - URL hardcodeada
  const slackVideoUrl = 'https://www.youtube.com/embed/0iE0pYrpkWM'

  const handleStatusButtonClick = (status) => {
    onInputChange('estado_slack', status)
    if (status === 'completado') {
      onInputChange('tutorial_visto', true)
    }
  }

  return (
    <div className="module-fields">
      <div className="module-context">
        <p className="module-context-why">
          Slack será nuestro espacio de trabajo compartido. Aquí coordinamos tareas, compartimos avances, resolvemos dudas y gestionamos toda la implementación en tiempo real — sin perder información en emails o mensajes dispersos.
        </p>
        <p className="module-context-instruction">
          Mira el tutorial de configuración, luego añade el email principal del workspace y los emails del equipo que participará.
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
        <label>Email Principal del Workspace *</label>
        <input
          type="email"
          value={data.email_principal || ''}
          onChange={(e) => onInputChange('email_principal', e.target.value)}
          placeholder="Email del admin del workspace"
        />
      </div>

      <div className="form-group">
        <label>Emails del Equipo (que usarán Slack)</label>
        <textarea
          value={data.emails_equipo || ''}
          onChange={(e) => onInputChange('emails_equipo', e.target.value)}
          placeholder="Emails de los miembros que estarán en Slack (uno por línea)"
          rows="3"
        />
      </div>

      <div className="form-group">
        <label>Responsable Principal del Workspace</label>
        <input
          type="text"
          value={data.responsable_principal || ''}
          onChange={(e) => onInputChange('responsable_principal', e.target.value)}
          placeholder="Nombre del contacto principal"
        />
      </div>

      <div className="form-group">
        <label>Responsable Suplente</label>
        <input
          type="text"
          value={data.responsable_suplente || ''}
          onChange={(e) => onInputChange('responsable_suplente', e.target.value)}
          placeholder="Nombre del contacto de respaldo"
        />
      </div>

      <div className="form-group">
        <label>Horario de Respuesta en Slack</label>
        <input
          type="text"
          value={data.horario_respuesta || ''}
          onChange={(e) => onInputChange('horario_respuesta', e.target.value)}
          placeholder="Ej: Lunes a Viernes 9:00-18:00"
        />
      </div>

      <div className="form-group">
        <label>Tipos de Notificaciones Deseadas</label>
        <textarea
          value={data.tipos_notificaciones || ''}
          onChange={(e) => onInputChange('tipos_notificaciones', e.target.value)}
          placeholder="Ej: Actualizaciones diarias, Cambios urgentes, Reportes semanales (uno por línea)"
          rows="2"
        />
      </div>

      <div className="form-group" style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #333' }}>
        <label>¿Necesitas Ayuda con la Configuración de Slack? *</label>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => handleStatusButtonClick('completado')}
            style={{
              flex: 1,
              minWidth: '140px',
              background: data.estado_slack === 'completado' ? '#d4af37' : '#2a2a2a',
              color: data.estado_slack === 'completado' ? '#000' : '#f5f5f5',
              border: `2px solid ${data.estado_slack === 'completado' ? '#d4af37' : '#333'}`,
              padding: '0.75rem',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: data.estado_slack === 'completado' ? 'bold' : 'normal'
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
              background: data.estado_slack === 'necesita_ayuda' ? '#d4af37' : '#2a2a2a',
              color: data.estado_slack === 'necesita_ayuda' ? '#000' : '#f5f5f5',
              border: `2px solid ${data.estado_slack === 'necesita_ayuda' ? '#d4af37' : '#333'}`,
              padding: '0.75rem',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: data.estado_slack === 'necesita_ayuda' ? 'bold' : 'normal'
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
              background: data.estado_slack === 'despues' ? '#d4af37' : '#2a2a2a',
              color: data.estado_slack === 'despues' ? '#000' : '#f5f5f5',
              border: `2px solid ${data.estado_slack === 'despues' ? '#d4af37' : '#333'}`,
              padding: '0.75rem',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: data.estado_slack === 'despues' ? 'bold' : 'normal'
            }}
          >
            ⏳ Lo haré después
          </button>
        </div>
      </div>

    </div>
  )
}

function AIModule({ data, onInputChange, onFileUpload }) {
  // Video de IA - URL hardcodeada
  const iaVideoUrl = 'https://www.youtube.com/embed/c0DZWvnM0TY'

  return (
    <div className="module-fields">
      <div className="module-context">
        <p className="module-context-why">
          Un asistente de IA bien configurado puede responder el 70% de las consultas de forma automática, 24 horas al día. Libera tiempo de tu equipo y garantiza que ningún lead quede sin atención, incluso fuera de horario.
        </p>
        <p className="module-context-instruction">
          Indica si quieres implementar IA ahora o después. Si decides avanzar, configura nombre, tono, canal principal y la base de conocimiento que usará el asistente.
        </p>
      </div>

      {/* Video Tutorial IA */}
      <VideoSection
        videoUrl={iaVideoUrl}
        title="📹 Tutorial: Configurar Asistente IA y WhatsApp Bot"
      />

      <div className="form-group">
        <label>¿Quieres implementar IA? *</label>
        <select
          value={data.implementar_ia || ''}
          onChange={(e) => onInputChange('implementar_ia', e.target.value)}
        >
          <option value="">Seleccionar...</option>
          <option value="si">Sí, quiero IA</option>
          <option value="no">No, sin IA</option>
          <option value="después">Después, por ahora no</option>
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
            <label>Canal Principal *</label>
            <select
              value={data.canal_principal || ''}
              onChange={(e) => onInputChange('canal_principal', e.target.value)}
            >
              <option value="">Seleccionar...</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="web">Chat Web</option>
              <option value="email">Email</option>
              <option value="mixto">Múltiples canales</option>
            </select>
          </div>

          {data.canal_principal === 'whatsapp' && (
            <>
              <div className="form-group">
                <label>¿Tienes línea telefónica? *</label>
                <select
                  value={data.linea_existe || ''}
                  onChange={(e) => onInputChange('linea_existe', e.target.value)}
                >
                  <option value="">Seleccionar...</option>
                  <option value="si">Sí, ya tengo</option>
                  <option value="no">No, necesito una</option>
                </select>
              </div>

              {data.linea_existe === 'si' && (
                <div className="form-group">
                  <label>¿La línea actual está activa?</label>
                  <select
                    value={data.linea_actual_activa || ''}
                    onChange={(e) => onInputChange('linea_actual_activa', e.target.value)}
                  >
                    <option value="">Seleccionar...</option>
                    <option value="si">Sí, está activa</option>
                    <option value="no">No, necesito reactivarla</option>
                  </select>
                </div>
              )}

              <div className="form-group">
                <label>Tipo de WhatsApp *</label>
                <select
                  value={data.whatsapp_tipo || ''}
                  onChange={(e) => onInputChange('whatsapp_tipo', e.target.value)}
                >
                  <option value="">Seleccionar...</option>
                  <option value="normal">WhatsApp Personal</option>
                  <option value="business">WhatsApp Business</option>
                  <option value="api">WhatsApp API</option>
                </select>
              </div>
            </>
          )}

          <div className="form-group">
            <label>Tono del Asistente *</label>
            <select
              value={data.tono || ''}
              onChange={(e) => onInputChange('tono', e.target.value)}
            >
              <option value="">Seleccionar...</option>
              <option value="formal">Formal y profesional</option>
              <option value="casual">Casual y amigable</option>
              <option value="tecnico">Técnico y directo</option>
              <option value="creativo">Creativo y divertido</option>
            </select>
          </div>

          <div className="form-group">
            <label>¿Qué debe responder? *</label>
            <textarea
              value={data.que_responder || ''}
              onChange={(e) => onInputChange('que_responder', e.target.value)}
              placeholder="Tipos de preguntas que el IA debe responder"
              rows="2"
            />
          </div>

          <div className="form-group">
            <label>¿Qué NO debe responder?</label>
            <textarea
              value={data.que_no_responder || ''}
              onChange={(e) => onInputChange('que_no_responder', e.target.value)}
              placeholder="Límites o restricciones"
              rows="2"
            />
          </div>

          <div className="form-group">
            <label>¿Cuándo derivar a humano?</label>
            <textarea
              value={data.cuando_derivar || ''}
              onChange={(e) => onInputChange('cuando_derivar', e.target.value)}
              placeholder="Situaciones que requieren intervención humana"
              rows="2"
            />
          </div>

          <div className="form-group">
            <label>¿Qué datos debe recopilar el asistente?</label>
            <textarea
              value={data.datos_recoger || ''}
              onChange={(e) => onInputChange('datos_recoger', e.target.value)}
              placeholder="Ej: Nombre, email, tipo de consulta, teléfono, etc."
              rows="2"
            />
          </div>

          <div className="form-group" style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #333' }}>
            <label>Base de Conocimiento *</label>
            <p className="field-description" style={{ fontSize: '0.85rem', color: '#999', marginBottom: '0.75rem' }}>
              💡 Elige cómo proporcionarás el contenido que el asistente debe conocer
            </p>
            <select
              value={data.base_conocimiento || ''}
              onChange={(e) => onInputChange('base_conocimiento', e.target.value)}
            >
              <option value="">Seleccionar...</option>
              <option value="texto">Opción A: Escribir el contenido directamente</option>
              <option value="prompt">Opción B: Usar un prompt personalizado para ChatGPT</option>
              <option value="archivo">Opción C: Cargar un archivo (PDF, Word, etc)</option>
            </select>
          </div>

          {data.base_conocimiento === 'texto' && (
            <div className="form-group">
              <label>Contenido de la Base de Conocimiento *</label>
              <p className="field-description" style={{ fontSize: '0.85rem', color: '#999', marginBottom: '0.5rem' }}>
                Ingresa aquí toda la información que el asistente debe conocer sobre tu negocio
              </p>
              <textarea
                value={data.base_conocimiento_texto || ''}
                onChange={(e) => onInputChange('base_conocimiento_texto', e.target.value)}
                placeholder="Ej: Información sobre productos/servicios, políticas, procedimientos, FAQs, etc."
                rows="6"
              />
            </div>
          )}

          {data.base_conocimiento === 'prompt' && (
            <div className="form-group">
              <label>Prompt Personalizado para ChatGPT *</label>
              <p className="field-description" style={{ fontSize: '0.85rem', color: '#999', marginBottom: '0.5rem' }}>
                Describe detalladamente cómo quieres que se comporte ChatGPT como asistente de tu negocio
              </p>
              <textarea
                value={data.base_conocimiento_prompt || ''}
                onChange={(e) => onInputChange('base_conocimiento_prompt', e.target.value)}
                placeholder="Ej: Eres un asistente de servicio al cliente para una agencia de viajes. Debes responder preguntas sobre destinos, precios, política de cancelación..."
                rows="6"
              />
            </div>
          )}

          {data.base_conocimiento === 'archivo' && (
            <div className="form-group">
              <label>Archivo de Base de Conocimiento *</label>
              <p className="field-description" style={{ fontSize: '0.85rem', color: '#999', marginBottom: '0.5rem' }}>
                Carga un PDF, Word, Excel o TXT con toda la información del asistente
              </p>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt,.xls,.xlsx"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    const file = e.target.files[0]
                    const fileName = file.name
                    onInputChange('base_conocimiento_archivo_nombre', fileName)
                    // En una aplicación real, aquí subiríamos el archivo a un storage
                    onInputChange('base_conocimiento_archivo_url', `archivo-cargado: ${fileName}`)
                  }
                }}
              />
              {data.base_conocimiento_archivo_nombre && (
                <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#d4af37' }}>
                  ✓ Archivo cargado: {data.base_conocimiento_archivo_nombre}
                </p>
              )}
            </div>
          )}
        </>
      )}

    </div>
  )
}

function InspirationModule({ data, onInputChange }) {
  return (
    <div className="module-fields">
      <div className="module-context">
        <p className="module-context-why">
          Las referencias son la brújula creativa del proyecto. Nos ayudan a entender tu visión estética, el tono que buscas proyectar y el posicionamiento que quieres alcanzar — sin tener que adivinar.
        </p>
        <p className="module-context-instruction">
          Comparte webs, anuncios, marcas y competidores que te sirvan de referencia. No necesitas tenerlos todos — comparte lo que tengas en mente.
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
        <p className="field-description" style={{ fontSize: '0.85rem', color: '#999', marginTop: '0.25rem' }}>
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
        <p className="field-description" style={{ fontSize: '0.85rem', color: '#999', marginTop: '0.25rem' }}>
          💡 Pueden ser de Facebook, Instagram, Google Ads o cualquier plataforma
        </p>
      </div>

      <div className="form-group">
        <label>Competidores a Monitorear</label>
        <textarea
          value={data.competidores || ''}
          onChange={(e) => onInputChange('competidores', e.target.value)}
          placeholder="Competidores o empresas similares a analizar (uno por línea)"
          rows="3"
        />
        <p className="field-description" style={{ fontSize: '0.85rem', color: '#999', marginTop: '0.25rem' }}>
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
        <label>Tono y Estilo de Ejemplos que te Gustan</label>
        <textarea
          value={data.tono_ejemplos || ''}
          onChange={(e) => onInputChange('tono_ejemplos', e.target.value)}
          placeholder="Describe el tono/estilo que te atrae: ¿creativo? ¿corporativo? ¿desenfadado? ¿técnico?"
          rows="2"
        />
        <p className="field-description" style={{ fontSize: '0.85rem', color: '#999', marginTop: '0.25rem' }}>
          💡 Esto nos ayudará a definir el tono de voz y estilo de tu marca
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
        <p className="field-description" style={{ fontSize: '0.85rem', color: '#999', marginTop: '0.25rem' }}>
          💡 Comparte libremente lo que tengas en mente
        </p>
      </div>

    </div>
  )
}

function SchedulingModule({ data, onInputChange }) {
  const ghlCalendarLink = 'https://api.leadconnectorhq.com/widget/booking/MbiVA67dwhXqM0NVREpf'

  const handleWhatsAppContact = () => {
    const phoneNumber = sessionStorage.getItem('clientWhatsapp') || '+1234567890'
    const message = encodeURIComponent('Hola Alphalux, acabo de completar mi onboarding y quiero agendar una reunión. ¿Cuándo puedo hablar con ustedes?')
    window.open(`https://wa.me/${phoneNumber.replace(/\D/g, '')}?text=${message}`, '_blank')
  }

  return (
    <div className="module-fields">
      <div className="module-context">
        <p className="module-context-why">
          El meeting de kickoff es el punto de partida de toda la implementación. En esta sesión conocemos tu negocio en profundidad, resolvemos las últimas dudas y alineamos la estrategia antes de lanzar.
        </p>
        <p className="module-context-instruction">
          Elige la opción que te resulte más cómoda — calendario o WhatsApp — para reservar tu sesión de inicio con el equipo.
        </p>
      </div>

      <div className="form-group">
        <label>Opción 1: Agendar por Calendario</label>
        <p className="field-description">Haz clic en el botón para reservar tu meeting de kickoff con nuestro equipo:</p>
        <a
          href={ghlCalendarLink}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary"
          style={{ display: 'inline-block', marginTop: '0.5rem' }}
        >
          📅 Agendar Meeting en Calendario
        </a>
        <input
          type="hidden"
          value={data.calendario_link || ghlCalendarLink}
          onChange={(e) => onInputChange('calendario_link', e.target.value)}
        />
      </div>

      <div className="form-group" style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #333' }}>
        <label>Opción 2: Contactar por WhatsApp</label>
        <p className="field-description">O si prefieres, contacta directamente a nuestro equipo por WhatsApp:</p>
        <button
          type="button"
          className="btn-secondary"
          onClick={handleWhatsAppContact}
          style={{ marginTop: '0.5rem' }}
        >
          💬 Contactar por WhatsApp
        </button>
      </div>

      <div className="form-group" style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #333' }}>
        <label>Preferencia de Contacto *</label>
        <select
          value={data.meeting_agendado || ''}
          onChange={(e) => onInputChange('meeting_agendado', e.target.value)}
        >
          <option value="">Seleccionar tu preferencia...</option>
          <option value="calendario">Prefiero agendar por calendario</option>
          <option value="whatsapp">Prefiero contactar por WhatsApp</option>
          <option value="despues">Lo haré después</option>
        </select>
      </div>

    </div>
  )
}

function ConfirmationModule({ data, onBackToWelcome }) {
  const completedModules = MODULES.filter(m => data[m.id] && Object.keys(data[m.id]).length > 0)
  const progress = Math.round((completedModules.length / (MODULES.length - 1)) * 100)

  return (
    <div className="module-confirmation">
      <div className="confirmation-header">
        <h3>¡Onboarding Completado! 🎉</h3>
        <p>Gracias por proporcionar toda la información necesaria para tu implementación en Alphalux.</p>
      </div>

      <div className="confirmation-progress" style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
        <p style={{ marginBottom: '0.5rem' }}>Progreso General: <strong>{progress}%</strong></p>
        <div className="progress-bar" style={{ height: '8px', background: '#333', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, #d4af37, #e5c158)', transition: 'width 0.3s ease' }}></div>
        </div>
      </div>

      <div className="confirmation-checklist">
        <h4>✓ Estado de tus Módulos:</h4>
        {MODULES.filter(m => m.id !== 'welcome' && m.id !== 'confirmacion').map(module => (
          <div key={module.id} className="checklist-item" style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center' }}>
            <span className="checklist-icon" style={{ marginRight: '0.75rem', fontSize: '1.2rem', color: data[module.id] && Object.keys(data[module.id]).length > 0 ? '#d4af37' : '#666' }}>
              {data[module.id] && Object.keys(data[module.id]).length > 0 ? '✓' : '○'}
            </span>
            <span className="checklist-label" style={{ flex: 1 }}>
              {module.name}
            </span>
            {data[module.id] && Object.keys(data[module.id]).length > 0 && (
              <span style={{ fontSize: '0.85rem', color: '#999' }}>Completado</span>
            )}
          </div>
        ))}
      </div>

      <div className="confirmation-message" style={{ marginTop: '2rem', padding: '1.5rem', background: '#1a1a1a', borderRadius: '8px', borderLeft: '4px solid #d4af37' }}>
        <p style={{ marginBottom: '0.75rem' }}>
          <strong>📋 Próximos pasos:</strong>
        </p>
        <ul style={{ marginLeft: '1.5rem', lineHeight: '1.8' }}>
          <li>Nuestro equipo revisará toda la información que proporcionaste</li>
          <li>Si falta algún dato importante, nos pondremos en contacto contigo en los próximos 2 días hábiles</li>
          <li>Procederemos con la implementación según tu cronograma acordado</li>
        </ul>
        <p style={{ marginTop: '1rem', color: '#d4af37' }}>
          <strong>¡Estamos emocionados de trabajar contigo y ayudarte a potenciar tu negocio con Alphalux!</strong>
        </p>
      </div>

      <div className="confirmation-actions" style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
        <button className="btn-primary" onClick={onBackToWelcome}>
          ← Volver al Inicio
        </button>
        <a
          href={`https://wa.me/?text=Hola Alphalux, acabo de completar mi onboarding.`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary"
        >
          💬 Contactar por WhatsApp
        </a>
      </div>
    </div>
  )
}
