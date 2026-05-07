// Módulos del Onboarding
export const MODULES = [
  {
    id: 'welcome',
    name: 'Bienvenida',
    description: 'Conoce Alphalux',
    order: 0
  },
  {
    id: 'info_basica',
    name: 'Información Básica',
    description: 'Datos de tu empresa',
    order: 1,
    fields: [
      'nombre_comercial',
      'razon_social',
      'sector',
      'direccion',
      'ciudad',
      'pais',
      'email',
      'telefono',
      'whatsapp',
      'horarios',
      'web',
      'instagram',
      'facebook',
      'otros_links'
    ],
    requiredFields: [
      'nombre_comercial',
      'razon_social',
      'sector',
      'email',
      'telefono',
      'ciudad',
      'pais'
    ]
  },
  {
    id: 'servicio_principal',
    name: 'Servicio Principal',
    description: 'Define tu servicio estrella',
    order: 2,
    fields: [
      'nombre_servicio',
      'por_que_prioritario',
      'descripcion_detallada',
      'que_incluye',
      'que_no_incluye',
      'para_quien',
      'para_quien_no',
      'precio_rango',
      'paquetes',
      'financiacion',
      'duracion',
      'diferenciales',
      'objeciones_frecuentes',
      'casos_exito',
      'faqs'
    ],
    requiredFields: [
      'nombre_servicio',
      'descripcion_detallada',
      'para_quien',
      'precio_rango',
      'diferenciales'
    ]
  },
  {
    id: 'cliente_ideal',
    name: 'Cliente Ideal',
    description: 'Tu avatar de cliente perfecto',
    order: 3,
    fields: [
      'cliente_ideal',
      'problemas_principales',
      'barreras',
      'deseos',
      'necesita_escuchar',
      'senales_buen_lead',
      'senales_mal_lead'
    ],
    requiredFields: [
      'cliente_ideal',
      'problemas_principales',
      'deseos',
      'senales_buen_lead'
    ]
  },
  {
    id: 'marca',
    name: 'Marca & Identidad',
    description: 'Materiales visuales y marca',
    order: 4,
    fields: [
      'paleta_colores',
      'tipografias',
      'estilo_visual',
      'referencias',
      'preferencias_comunicacion',
      'no_hacer_con_marca',
      'archivos'
    ],
    requiredFields: [
      'paleta_colores',
      'estilo_visual'
    ]
  },
  {
    id: 'meta',
    name: 'Meta / Facebook Ads',
    description: 'Tu cuenta publicitaria',
    order: 5,
    fields: [
      'tiene_activos',
      'portfolio_id',
      'instagram_username',
      'business_manager_id',
      'cuenta_publicitaria_id',
      'pixel_id',
      'email_acceso',
      'confirmacion_compartido',
      'instagram_password_available'
    ],
    requiredFields: [
      'tiene_activos'
    ]
  },
  {
    id: 'google',
    name: '🌐 Entorno Google',
    description: 'Configuración Google Ads, Maps y Business Profile',
    order: 6,
    fields: [
      'entorno_google_status',
      'google_maps_link',
      'entorno_google_help',
      'entorno_google_confirmation'
    ],
    requiredFields: [
      'entorno_google_status',
      'entorno_google_confirmation'
    ],
    conditionalFields: {
      entorno_google_status: {
        si: {
          description: 'User has Google configured',
          optionalFields: ['google_maps_link']
        },
        no: {
          description: 'User needs help with setup',
          helpFlag: true,
          optionalFields: []
        },
        no_seguro: {
          description: 'User is unsure',
          helpFlag: null,
          optionalFields: ['google_maps_link']
        }
      }
    }
  },
  {
    id: 'slack',
    name: 'Slack / Comunicación',
    description: 'Configuración operativa',
    order: 7,
    fields: [
      'tutorial_visto',
      'email_principal_empresa',
      'emails_equipo',
      'slack_status',
      'slack_needs_help'
    ],
    requiredFields: [
      'tutorial_visto',
      'email_principal_empresa',
      'emails_equipo',
      'slack_status'
    ]
  },
  {
    id: 'ia',
    name: 'IA / Base de Conocimiento',
    description: 'Implementación de IA',
    order: 8,
    fields: [
      'implementar_ia',
      'nombre_asistente',
      'objetivo_principal',
      'tono',
      'que_responder',
      'que_no_responder',
      'cuando_derivar',
      'datos_recoger',
      'base_conocimiento',
      'base_conocimiento_texto',
      'base_conocimiento_prompt',
      'base_conocimiento_archivo_nombre',
      'base_conocimiento_archivo_url'
    ],
    requiredFields: [
      'implementar_ia'
    ],
    conditionalFields: {
      implementar_ia: {
        value: true,
        fields: ['nombre_asistente', 'objetivo_principal', 'tono', 'que_responder', 'base_conocimiento']
      }
    }
  },
  {
    id: 'inspiracion',
    name: 'Inspiración & Referencias',
    description: 'Webs, marcas y ejemplos',
    order: 9,
    fields: [
      'webs_referencia',
      'anuncios_gustan',
      'competencia_analizar',
      'marcas_gustan',
      'marcas_no_parecer',
      'elementos_que_gustan',
      'comentarios_adicionales'
    ],
    requiredFields: []
  },
  {
    id: 'agendamiento',
    name: 'Agendar meeting de embarque',
    description: 'Reserva tu sesión de estrategia',
    order: 10,
    fields: [
      'calendario_link'
    ],
    requiredFields: []
  },
  {
    id: 'confirmacion',
    name: 'Confirmación',
    description: 'Tu onboarding completado',
    order: 11
  }
]

// Estados del cliente
export const CLIENT_STATUS = {
  NOT_STARTED: 'no_iniciado',
  IN_PROGRESS: 'en_proceso',
  COMPLETED: 'completado'
}

// Estados del admin
export const ADMIN_STATUS = {
  PENDING: 'pendiente',
  REVIEWING: 'en_revision',
  FINISHED: 'finalizado'
}

// Tipos de base de conocimiento
export const KNOWLEDGE_BASE_TYPES = {
  NONE: 'none',
  TEXT: 'text',
  FILE: 'file',
  WEB: 'web'
}

// WhatsApp types
export const WHATSAPP_TYPES = {
  NORMAL: 'normal',
  BUSINESS: 'business',
  API: 'api'
}

// Token expiration (en días)
export const TOKEN_EXPIRATION_DAYS = 30

// Validaciones
export const VALIDATION_RULES = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_MIN_LENGTH: 10,
  PASSWORD_MIN_LENGTH: 6,
  COMPANY_NAME_MIN_LENGTH: 2,
  URL_REGEX: /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/
}

export default {
  MODULES,
  CLIENT_STATUS,
  ADMIN_STATUS,
  KNOWLEDGE_BASE_TYPES,
  WHATSAPP_TYPES,
  TOKEN_EXPIRATION_DAYS,
  VALIDATION_RULES
}
