import { useEffect, useState } from 'react'
import '../styles/completion-celebration.css'

export default function CompletionCelebration({
  progress = 0,
  currentStep = 0,
  onDismiss
}) {
  const [isVisible, setIsVisible] = useState(true)

  // Determine message based on progress
  const getMessage = () => {
    switch (true) {
      case currentStep === 1:
        return { title: '¡Excelente inicio!', subtitle: 'Ya tienes tu perfil creado' }
      case currentStep === 2:
        return { title: 'Tu servicio está definido', subtitle: 'Base lista para tu estrategia' }
      case currentStep === 3:
        return { title: 'Cliente ideal identificado ✓', subtitle: 'Todo cobra sentido ahora' }
      case currentStep === 4:
        return { title: 'Tu identidad visual lista', subtitle: 'El lenguaje de tu marca establecido' }
      case currentStep === 5:
        return { title: 'Meta Ads configurado', subtitle: 'Tu presencia en redes asegurada' }
      case currentStep === 6:
        return { title: 'Google está optimizado', subtitle: 'Visibilidad local activada' }
      case currentStep === 7:
        return { title: 'Comunicación configurada', subtitle: 'Slack integrado y listo' }
      case currentStep === 8:
        return { title: 'IA asistente activado', subtitle: 'Automatización en marcha' }
      case currentStep === 9:
        return { title: 'Referencias alineadas', subtitle: 'Tu benchmark establecido' }
      case currentStep === 10:
        return { title: '¡Configuración completa!', subtitle: 'Listo para el Kickoff' }
      default:
        return { title: '¡Módulo completado!', subtitle: 'Excelente progreso' }
    }
  }

  const { title, subtitle } = getMessage()

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      // Wait for fade-out animation to complete before calling onDismiss
      setTimeout(() => {
        onDismiss?.()
      }, 400)
    }, 2500)

    return () => clearTimeout(timer)
  }, [onDismiss])

  if (!isVisible) {
    return null
  }

  return (
    <div className={`completion-celebration ${isVisible ? 'completion-celebration--visible' : ''}`}>
      <div className="completion-overlay" />
      <div className="completion-content">
        <div className="completion-checkmark">
          <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="50" fill="rgba(212, 175, 55, 0.1)" />
            <path
              d="M 30 50 L 45 65 L 70 35"
              stroke="#d4af37"
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength="1"
            />
          </svg>
        </div>
        <h2 className="completion-title">{title}</h2>
        <p className="completion-subtitle">{subtitle}</p>
        <div className="completion-progress-bar">
          <div className="completion-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <p className="completion-percent">{progress}% completado</p>
      </div>
    </div>
  )
}
