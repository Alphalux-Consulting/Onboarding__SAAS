/**
 * Mock Client Data for Testing
 * Complete dataset for all onboarding modules
 * Used with testing mode to auto-fill forms
 */

export const MOCK_CLIENT_DATA = {
  // Información Básica
  info_basica: {
    nombre_comercial: 'TechStart Solutions',
    razon_social: 'TechStart Solutions S.A.C.',
    sector: 'Tecnología',
    email: 'contact@techstart.test',
    telefono: '+51 987 654 321',
    ciudad: 'Lima',
    pais: 'Perú',
    descripcion_empresa:
      'Empresa especializada en soluciones tecnológicas para pequeños y medianos negocios'
  },

  // Servicio Principal
  servicio_principal: {
    nombre_servicio: 'Consultoría Digital y Transformación TI',
    por_que_prioritario:
      'Es nuestro servicio flagship que genera el 60% de ingresos',
    descripcion_detallada:
      'Brindamos consultoría estratégica en transformación digital, implementación de sistemas ERP, optimización de procesos y capacitación en tecnología.',
    que_incluye:
      'Análisis inicial, diseño de solución, implementación, capacitación, soporte post-implementación por 3 meses',
    que_no_incluye:
      'Desarrollo de software custom, hosting infraestructura, soporte técnico después del período de soporte incluido',
    para_quien:
      'Empresas medianas (50-500 empleados) que buscan modernizar su infraestructura tecnológica',
    para_quien_no:
      'Startups muy pequeñas, empresas grandes con presupuestos ya asignados, negocios sin intención de digitalizar',
    precio_rango: '$15000-50000',
    diferenciales:
      'Equipo certificado, enfoque personalizado, metodología agile, garantía de implementación'
  },

  // Cliente Ideal
  cliente_ideal: {
    edad: '35-55',
    problemas_principales: [
      'Procesos manuales ineficientes',
      'Falta de visibilidad en datos',
      'Sistemas legacy obsoletos',
      'Costos operacionales altos'
    ],
    deseos: [
      'Automatización total',
      'Toma de decisiones basada en datos',
      'Eficiencia operacional',
      'Crecimiento escalable'
    ],
    senales_buen_lead:
      'Empresa con más de 2 años en mercado, presupuesto definido, decisor técnico o CEO interesado en transformación',
    presupuesto_aproximado: '$20000',
    timeline_implementacion: '3-6 meses'
  },

  // Marca
  marca: {
    paleta_colores: ['#0066CC', '#FF6B35', '#FFFFFF', '#333333'],
    estilo_visual: 'Profesional y moderno',
    nombre_marca: 'TechStart',
    tagline: 'Transformamos negocios con tecnología'
  },

  // Meta
  meta: {
    tiene_activos: true,
    activos_digitales: [
      'Sitio web corporativo',
      'Perfil LinkedIn',
      'Canal YouTube'
    ],
    web: 'https://techstart.test',
    presencia_social: 'Activa en LinkedIn, YouTube y blog',
    meta_anual:
      'Aumentar leads calificados en 300%, cerrar 25 clientes nuevos, establecer presencia de thought leadership'
  },

  // Google
  google: {
    entorno_google_status: 'si',
    google_maps_link: 'https://maps.google.com/?q=techstart',
    entorno_google_help: false,
    entorno_google_confirmation: true
  },

  // Slack
  slack: {
    tutorial_visto: true,
    email_principal_empresa: 'admin@techstart.test',
    emails_equipo: 'carlos@techstart.test\nmariah@techstart.test\njuan@techstart.test',
    slack_status: 'completado',
    slack_needs_help: false
  },

  // IA
  ia: {
    implementar_ia: true,
    nombre_asistente: 'TechBot',
    objetivo_principal: 'Responder preguntas frecuentes de clientes, calificar leads automáticamente y agendar demos',
    tono: 'profesional',
    que_responder: 'Preguntas sobre servicios de transformación digital, precios, timeline de implementación, casos de éxito',
    que_no_responder: 'Temas técnicos avanzados, información interna confidencial, consultoría legal o financiera',
    cuando_derivar: 'Solicitudes de propuesta personalizada, problemas complejos, objeciones serias del cliente',
    datos_recoger: 'Nombre, email, empresa, tamaño de la empresa, presupuesto aproximado, timeline, principales desafíos',
    base_conocimiento: 'texto',
    base_conocimiento_texto: 'TechStart Solutions ofrece servicios de transformación digital. Especializados en: 1) Consultoría estratégica, 2) Implementación de sistemas ERP, 3) Optimización de procesos. Precios: $15000-50000. Timeline: 3-6 meses. Equipo certificado, metodología agile, garantía de implementación.'
  },

  // Inspiración
  inspiracion: {
    webs_referencia: ['https://hubspot.com', 'https://salesforce.com'],
    elementos_que_gustan:
      'Diseño limpio, navegación intuitiva, trust badges, casos de éxito destacados',
    competencia_analizar: [
      'Deloitte',
      'Accenture',
      'IBM'
    ]
  },

  // Agendamiento
  agendamiento: {
    meeting_agendado: true,
    calendario_link: 'https://calendly.com/techstart/demo',
    plataforma_agendamiento: 'Calendly',
    duracion_sesion: '60 minutos',
    frecuencia_sesiones: 'Quincenal',
    proximo_meeting: '2024-12-15T15:00:00'
  },

  // Timestamps
  createdAt: new Date(),
  updatedAt: new Date(),
  lastEditedAt: new Date()
}

/**
 * Structured version for saving by module
 * Each key corresponds to a onboarding step
 */
export const MOCK_CLIENT_BY_MODULE = {
  0: {}, // Welcome step (no data needed)
  1: MOCK_CLIENT_DATA.info_basica,
  2: MOCK_CLIENT_DATA.servicio_principal,
  3: MOCK_CLIENT_DATA.cliente_ideal,
  4: MOCK_CLIENT_DATA.marca,
  5: MOCK_CLIENT_DATA.meta,
  6: MOCK_CLIENT_DATA.google,
  7: MOCK_CLIENT_DATA.slack,
  8: MOCK_CLIENT_DATA.ia,
  9: MOCK_CLIENT_DATA.inspiracion,
  10: MOCK_CLIENT_DATA.agendamiento,
  11: {} // Confirmation step (no data needed)
}

/**
 * Quick reference: All modules that have mock data
 */
export const MODULES_WITH_DATA = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

export default MOCK_CLIENT_DATA
