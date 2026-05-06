export default function ProgressIndicator({ progress = 0, variant = 'linear', showLabel = true }) {
  const displayProgress = Math.min(Math.max(progress, 0), 100)

  if (variant === 'circle') {
    const circumference = 2 * Math.PI * 45
    const offset = circumference - (displayProgress / 100) * circumference

    return (
      <div className="progress-indicator-circle">
        <svg width="100" height="100" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" className="progress-circle-bg" />
          <circle
            cx="50"
            cy="50"
            r="45"
            className="progress-circle-fill"
            style={{
              strokeDashoffset: offset,
              strokeDasharray: circumference
            }}
          />
        </svg>
        {showLabel && <span className="progress-label">{displayProgress}%</span>}
      </div>
    )
  }

  return (
    <div className="progress-indicator-linear">
      <div className="progress-bar-linear">
        <div
          className="progress-bar-fill"
          style={{ width: `${displayProgress}%` }}
        >
          {showLabel && <span className="progress-label">{displayProgress}%</span>}
        </div>
      </div>
    </div>
  )
}
