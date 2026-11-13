/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'IBM Plex Sans', 'Vazirmatn', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        vazir: ['Vazirmatn', '-apple-system', 'sans-serif'],
        mono: ['"IBM Plex Mono"', '"JetBrains Mono"', 'monospace'],
      },
      colors: {
        // Industrial engineering design system (PR-2a-6 REPAIR / Ambiguity G)
        // Decorative gradients, ornamental icons and long tooltips removed;
        // restricted 6-color industrial palette.
        slate: {
          850: '#151f32',
          900: '#0f172a',
          950: '#080d1a',
        },
        'theme-strong': 'var(--app-text-strong)',
        industrial: {
          bg: 'rgb(var(--industrial-bg-rgb) / <alpha-value>)',       // Background (replaces blue-tinged #0b0f17)
          surface: 'rgb(var(--industrial-surface-rgb) / <alpha-value>)',  // Surface / cards
          border: 'rgb(var(--industrial-border-rgb) / <alpha-value>)',   // 1px borders, no shadows
          primary: 'rgb(var(--industrial-primary-rgb) / <alpha-value>)',  // Engineering blue
          success: 'rgb(var(--industrial-success-rgb) / <alpha-value>)',  // Signal green
          warning: 'rgb(var(--industrial-warning-rgb) / <alpha-value>)',  // Caution amber
          error: 'rgb(var(--industrial-error-rgb) / <alpha-value>)',    // Alert red
          accent: 'rgb(var(--industrial-accent-rgb) / <alpha-value>)',   // Data accent (monospace numbers/cells)
        },
      },
      boxShadow: {
        none: 'none',
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.25)',
        DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.35)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.3)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -4px rgba(0, 0, 0, 0.3)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.4)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
      },
      borderRadius: {
        // No pill shapes: mild rectangular radius only.
        none: '0',
        sm: '0.25rem',
        DEFAULT: '0.375rem',
        md: '0.5rem',
        lg: '0.5rem',
        xl: '0.5rem',
        '2xl': '0.5rem',
        full: '0.375rem',
      },
      animation: {
        // Only state-change motion (< 150ms); no decorative animation.
        'spin-slow': 'spin 3s linear infinite',
        pulse: 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      transitionDuration: {
        '150': '150ms',
      },
    },
  },
  plugins: [],
}
