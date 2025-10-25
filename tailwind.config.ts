import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Scenra Brand Palette - Cinematic Studio Theme
        scenra: {
          // Core palette
          dark: '#0E0E10',           // Primary background - cinema theater darkness
          'dark-panel': '#121214',   // Card/panel background - slightly lighter overlay
          amber: '#C6762A',          // Primary accent - stage lighting, studio glow
          'amber-hover': '#D8893C',  // Hover state - lightened amber
          light: '#F6F6F8',          // Main text - soft off-white
          blue: '#536CFF',           // AI/active states - creative digital glow
          gray: '#7A7A7C',           // Secondary text - neutral muted tone
          // Opacity overlays for layering
          'overlay-subtle': 'rgba(255, 255, 255, 0.02)',
          'overlay-card': 'rgba(255, 255, 255, 0.04)',
          'border-subtle': 'rgba(255, 255, 255, 0.05)',
        },
        // Sub-brand accent colors
        'scenra-ai': '#536CFF',      // Scenra AI - digital/tech blue
        'scenra-flow': '#C6762A',    // Scenra Flow - amber (workflow/process)
        'scenra-verse': '#8B7C6B',   // Scenra Verse - earthy/world-building
        'scenra-studio': '#C6762A',  // Scenra Studio - primary amber
        // Legacy colors (maintain for gradual migration)
        sage: {
          '50': '#F5F7F5',
          '100': '#E8EBE8',
          '500': '#7C9473',
          '700': '#5A6D52',
        },
        // Agent persona colors (updated to Scenra palette)
        director: '#0E0E10',
        photography: '#C6762A',
        platform: '#536CFF',
        marketer: '#C6762A',
        music: '#8B7C6B',
      },
      borderRadius: {
        lg: '0.75rem',
        md: '0.5rem',
        sm: '0.25rem',
      },
      fontFamily: {
        sans: ['Satoshi', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-in': {
          from: { opacity: '0.8' },
          to: { opacity: '1' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(198, 118, 42, 0.3)' },
          '50%': { boxShadow: '0 0 30px rgba(198, 118, 42, 0.5)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
      },
      boxShadow: {
        'amber-glow': '0 0 20px rgba(198, 118, 42, 0.4)',
        'amber-glow-lg': '0 0 30px rgba(198, 118, 42, 0.5)',
        'blue-glow': '0 0 20px rgba(83, 108, 255, 0.4)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
