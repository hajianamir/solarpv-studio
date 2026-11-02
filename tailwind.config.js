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
        industrial: {
          bg: '#0A0E1A',       // Background (replaces blue-tinged #0b0f17)
          surface: '#121826',  // Surface / cards
          border: '#1F2937',   // 1px borders, no shadows
          primary: '#3B82F6',  // Engineering blue
          success: '#10B981',  // Signal green
          warning: '#F59E0B',  // Caution amber
          error: '#EF4444',    // Alert red
          accent: '#06B6D4',   // Data accent (monospace numbers/cells)
        },
      },
      boxShadow: {
        // Shadows removed entirely from the design system; only 1px borders remain.
        none: 'none',
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
