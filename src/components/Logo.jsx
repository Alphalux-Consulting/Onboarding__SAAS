export default function Logo({ className = '', variant = 'full' }) {
  if (variant === 'mark') {
    return (
      <svg
        className={`alphalux-logo ${className}`}
        viewBox="0 0 48 48"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid meet"
      >
        <polygon points="24,2 46,42 2,42" fill="none" stroke="#d4af37" strokeWidth="1.8" />
        <line x1="24" y1="2"  x2="12" y2="22" stroke="#d4af37" strokeWidth="0.9" opacity="0.45" />
        <line x1="24" y1="2"  x2="36" y2="22" stroke="#d4af37" strokeWidth="0.9" opacity="0.45" />
        <line x1="12" y1="22" x2="36" y2="22" stroke="#d4af37" strokeWidth="0.9" opacity="0.45" />
        <line x1="12" y1="22" x2="24" y2="42" stroke="#d4af37" strokeWidth="0.9" opacity="0.45" />
        <line x1="36" y1="22" x2="24" y2="42" stroke="#d4af37" strokeWidth="0.9" opacity="0.45" />
        <line x1="24" y1="2"  x2="24" y2="42" stroke="#d4af37" strokeWidth="0.9" opacity="0.25" />
      </svg>
    )
  }

  return (
    <svg
      className={`alphalux-logo ${className}`}
      viewBox="0 0 220 56"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Geometric triangle mark */}
      <g transform="translate(2, 4)">
        <polygon points="24,0 47,40 1,40" fill="none" stroke="#d4af37" strokeWidth="1.6" />
        <line x1="24" y1="0"  x2="12" y2="20" stroke="#d4af37" strokeWidth="0.8" opacity="0.45" />
        <line x1="24" y1="0"  x2="36" y2="20" stroke="#d4af37" strokeWidth="0.8" opacity="0.45" />
        <line x1="12" y1="20" x2="36" y2="20" stroke="#d4af37" strokeWidth="0.8" opacity="0.45" />
        <line x1="12" y1="20" x2="24" y2="40" stroke="#d4af37" strokeWidth="0.8" opacity="0.45" />
        <line x1="36" y1="20" x2="24" y2="40" stroke="#d4af37" strokeWidth="0.8" opacity="0.45" />
        <line x1="24" y1="0"  x2="24" y2="40" stroke="#d4af37" strokeWidth="0.8" opacity="0.2"  />
      </g>

      {/* Divider */}
      <line x1="62" y1="10" x2="62" y2="46" stroke="rgba(212,175,55,0.2)" strokeWidth="1" />

      {/* Brand name */}
      <text
        x="74"
        y="30"
        fontFamily="Montserrat, sans-serif"
        fontSize="17"
        fontWeight="700"
        fill="#f5f5f5"
        letterSpacing="4"
      >
        ALPHALUX
      </text>

      {/* Tagline */}
      <text
        x="75"
        y="44"
        fontFamily="Montserrat, sans-serif"
        fontSize="7.5"
        fontWeight="400"
        fill="#555555"
        letterSpacing="3.5"
      >
        PRESENCIA DIGITAL
      </text>
    </svg>
  )
}
