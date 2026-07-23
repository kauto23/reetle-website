import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Legacy brand tokens. These keep existing utility classes working
        // (text-primary, bg-surface, border-border, etc.) during the
        // shadcn-style design-system migration.
        primary: {
          DEFAULT: '#4A2462',
          dark: '#2D1832',
          light: '#8C5FB3',
        },
        accent: {
          DEFAULT: '#FF6B6B',
          light: '#FFE2E2',
        },
        surface: '#FFFFFF',
        background: '#F8F7FA',
        border: '#E5E3E8',
        'text-primary': '#4A2462',
        'text-secondary': '#666276',
        correct: {
          DEFAULT: '#34D399',
          bg: '#ECF7ED',
          text: '#065F46',
        },
        incorrect: {
          DEFAULT: '#F87171',
          bg: '#FEE2E2',
          text: '#991B1B',
        },

        // Shadcn-style semantic tokens backed by CSS variables in
        // src/app/globals.css. New primitives in src/components/ui consume
        // these names so theming changes flow through one source of truth.
        ui: {
          background: 'hsl(var(--background))',
          foreground: 'hsl(var(--foreground))',
          card: {
            DEFAULT: 'hsl(var(--card))',
            foreground: 'hsl(var(--card-foreground))',
          },
          popover: {
            DEFAULT: 'hsl(var(--popover))',
            foreground: 'hsl(var(--popover-foreground))',
          },
          primary: {
            DEFAULT: 'hsl(var(--primary))',
            foreground: 'hsl(var(--primary-foreground))',
          },
          secondary: {
            DEFAULT: 'hsl(var(--secondary))',
            foreground: 'hsl(var(--secondary-foreground))',
          },
          muted: {
            DEFAULT: 'hsl(var(--muted))',
            foreground: 'hsl(var(--muted-foreground))',
          },
          accent: {
            DEFAULT: 'hsl(var(--accent))',
            foreground: 'hsl(var(--accent-foreground))',
          },
          // Coral (#FF6B6B) — distinct from ui.accent soft tint
          coral: {
            DEFAULT: 'hsl(var(--accent-coral))',
            foreground: 'hsl(var(--accent-coral-foreground))',
          },
          destructive: {
            DEFAULT: 'hsl(var(--destructive))',
            foreground: 'hsl(var(--destructive-foreground))',
          },
          success: {
            DEFAULT: 'hsl(var(--success))',
            foreground: 'hsl(var(--success-foreground))',
          },
          border: 'hsl(var(--border))',
          input: 'hsl(var(--input))',
          ring: 'hsl(var(--ring))',
        },
      },
      fontFamily: {
        outfit: ['var(--font-outfit)', 'sans-serif'],
      },
      borderRadius: {
        sm: '6px',
        DEFAULT: '8px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
      },
      spacing: {
        'xs': '4px',
        'sm': '8px',
        'md': '16px',
        'lg': '24px',
        'xl': '32px',
        '2xl': '48px',
      },
      fontSize: {
        'display-lg': ['32px', { lineHeight: '1.2', fontWeight: '700' }],
        'display-md': ['28px', { lineHeight: '1.2', fontWeight: '700' }],
        'display-sm': ['24px', { lineHeight: '1.2', fontWeight: '600' }],
        'headline-lg': ['26px', { lineHeight: '1.3', fontWeight: '700' }],
        'headline-md': ['20px', { lineHeight: '1.3', fontWeight: '600' }],
        'headline-sm': ['22px', { lineHeight: '1.3', fontWeight: '600' }],
        'title-lg': ['18px', { lineHeight: '1.3', fontWeight: '600' }],
        'title-md': ['16px', { lineHeight: '1.4', fontWeight: '500' }],
        'title-sm': ['14px', { lineHeight: '1.4', fontWeight: '600' }],
        'body-lg': ['16px', { lineHeight: '1.5', fontWeight: '400' }],
        'body-md': ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        /** Prefer with text-ui-muted-foreground for secondary copy */
        'body-sm': ['13px', { lineHeight: '1.5', fontWeight: '400' }],
        'label-lg': ['14px', { lineHeight: '1.4', fontWeight: '500' }],
        'label-md': ['12px', { lineHeight: '1.4', fontWeight: '500' }],
        'label-sm': [
          '11px',
          { lineHeight: '1.4', fontWeight: '600', letterSpacing: '0.08em' },
        ],
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        translationPopIn: {
          from: { opacity: '0', transform: 'translateY(16px) scale(0.97)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        spin: {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        writing: {
          '0%, 100%': { transform: 'translateX(0) rotate(0deg)' },
          '20%': { transform: 'translateX(-2px) rotate(-3deg)' },
          '40%': { transform: 'translateX(2px) rotate(3deg)' },
          '60%': { transform: 'translateX(-1px) rotate(-1deg)' },
          '80%': { transform: 'translateX(1px) rotate(1deg)' },
        },
        bounceDot: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-50%)' },
        },
        progress: {
          '0%': { width: '0%' },
          '100%': { width: '100%' },
        },
        audioWave: {
          '0%, 100%': { transform: 'scaleY(0.45)' },
          '50%': { transform: 'scaleY(1)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'collapsible-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-collapsible-content-height)' },
        },
        'collapsible-up': {
          from: { height: 'var(--radix-collapsible-content-height)' },
          to: { height: '0' },
        },
        /** Pulsing outline colour; outlines never affect layout so the playing card stays pixel-identical to siblings. */
        nowPlayingGlow: {
          '0%, 100%': { outlineColor: 'hsl(var(--primary) / 0.85)' },
          '50%': { outlineColor: 'hsl(var(--primary) / 0.25)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.5s ease forwards',
        fadeInUp: 'fadeInUp 0.5s ease forwards',
        slideUp: 'slideUp 0.3s ease-out',
        translationPopIn: 'translationPopIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        spin: 'spin 1s linear infinite',
        writing: 'writing 1.5s ease-in-out infinite',
        bounceDot: 'bounceDot 0.6s ease-in-out infinite',
        progress: 'progress 20s linear forwards',
        audioWave: 'audioWave 0.9s ease-in-out infinite',
        marquee: 'marquee var(--marquee-duration, 12s) linear infinite',
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'collapsible-down': 'collapsible-down 0.2s ease-out',
        'collapsible-up': 'collapsible-up 0.2s ease-out',
        nowPlayingGlow: 'nowPlayingGlow 2.5s ease-in-out infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
