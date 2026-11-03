// Small inline SVG icons for the top bar (Spotle-style: stats, help, settings).
type IconName = 'help' | 'stats' | 'settings' | 'search' | 'history'

export function Icon({ name }: { name: IconName }) {
  const common = { width: 22, height: 22, viewBox: '0 0 24 24', 'aria-hidden': true as const }
  switch (name) {
    case 'stats':
      return (
        <svg {...common}>
          <path d="M5 20V13h3v7zm5.5 0V8h3v12zM16 20V4h3v16z" fill="currentColor" />
        </svg>
      )
    case 'help':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" fill="currentColor" />
          <path
            d="M9.3 9.2a2.8 2.8 0 0 1 5.4 1c0 1.9-2.7 2.3-2.7 4"
            fill="none"
            stroke="var(--bg)"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <circle cx="12" cy="17.6" r="1.3" fill="var(--bg)" />
        </svg>
      )
    case 'settings':
      return (
        <svg {...common}>
          <path
            fill="currentColor"
            d="M19.4 13a7.5 7.5 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.4 7.4 0 0 0-1.7-1L15 3.3h-4l-.4 2.6a7.4 7.4 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.5 7.5 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1a7.4 7.4 0 0 0 1.7 1l.4 2.6h4l.4-2.6a7.4 7.4 0 0 0 1.7-1l2.5 1 2-3.5zM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z"
          />
        </svg>
      )
    case 'history':
      return (
        <svg {...common}>
          <path
            d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path d="M3.2 3.6v4.6h4.6z" fill="currentColor" />
          <path d="M12 8v4.3l2.8 1.7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'search':
      return (
        <svg {...common}>
          <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="2.4" />
          <path d="M15.5 15.5L21 21" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
        </svg>
      )
  }
}
