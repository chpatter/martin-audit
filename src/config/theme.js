// Martin Audit System — Theme Configuration
// Light and dark modes using Martin Supply brand palette.
// Martin red: #c00000 / #ED1C24
// Martin dark gray: #3b3e43 / #2d2d2d

const shared = {
  fonts: {
    body: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', monospace",
    display: "'Bebas Neue', 'Oswald', sans-serif",
  },
  radii: { sm: 4, md: 6, lg: 8, xl: 12 },
};

const darkTheme = {
  ...shared,
  id: 'dark',
  colors: {
    bg: '#1a1a1a',
    bgCard: '#222222',
    bgCardHover: '#2a2a2a',
    bgSidebar: '#141414',
    bgHeader: '#1e1e1e',
    bgInput: '#1a1a1a',

    border: '#333333',
    borderActive: '#c00000',

    text: '#e2e8f0',
    textMuted: '#888888',
    textBright: '#f8fafc',

    accent: '#c00000',
    accentDim: '#8b0000',
    accentGlow: 'rgba(192, 0, 0, 0.12)',

    success: '#22c55e',
    successBg: 'rgba(34, 197, 94, 0.12)',
    successBorder: 'rgba(34, 197, 94, 0.3)',

    danger: '#ef4444',
    dangerBg: 'rgba(239, 68, 68, 0.12)',
    dangerBorder: 'rgba(239, 68, 68, 0.3)',

    warning: '#f59e0b',
    warningBg: 'rgba(245, 158, 11, 0.12)',
    warningBorder: 'rgba(245, 158, 11, 0.3)',

    info: '#60a5fa',
    infoBg: 'rgba(96, 165, 250, 0.12)',
    infoBorder: 'rgba(96, 165, 250, 0.3)',
  },
  shadows: {
    panel: '0 4px 24px rgba(0, 0, 0, 0.4)',
    glow: '0 0 30px rgba(192, 0, 0, 0.15)',
    drawer: '-20px 0 60px rgba(0, 0, 0, 0.5)',
  },
};

const lightTheme = {
  ...shared,
  id: 'light',
  colors: {
    bg: '#f3f4f6',
    bgCard: '#ffffff',
    bgCardHover: '#f9fafb',
    bgSidebar: '#2d2d2d',
    bgHeader: '#ffffff',
    bgInput: '#f3f4f6',

    border: '#e0e0e0',
    borderActive: '#c00000',

    text: '#1f2937',
    textMuted: '#6b7280',
    textBright: '#111827',

    accent: '#c00000',
    accentDim: '#8b0000',
    accentGlow: 'rgba(192, 0, 0, 0.06)',

    success: '#16a34a',
    successBg: 'rgba(22, 163, 74, 0.08)',
    successBorder: 'rgba(22, 163, 74, 0.2)',

    danger: '#dc2626',
    dangerBg: 'rgba(220, 38, 38, 0.08)',
    dangerBorder: 'rgba(220, 38, 38, 0.2)',

    warning: '#d97706',
    warningBg: 'rgba(217, 119, 6, 0.08)',
    warningBorder: 'rgba(217, 119, 6, 0.2)',

    info: '#2563eb',
    infoBg: 'rgba(37, 99, 235, 0.08)',
    infoBorder: 'rgba(37, 99, 235, 0.2)',
  },
  shadows: {
    panel: '0 4px 24px rgba(0, 0, 0, 0.08)',
    glow: '0 0 30px rgba(192, 0, 0, 0.08)',
    drawer: '-20px 0 60px rgba(0, 0, 0, 0.1)',
  },
};

export { darkTheme, lightTheme };

// Default export for backward compatibility — will be overridden by ThemeProvider
export default darkTheme;
