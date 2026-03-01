import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
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
        'text-primary': '#2D1832',
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
        'display-lg': ['32px', { lineHeight: '1.2', fontWeight: '600' }],
        'display-md': ['28px', { lineHeight: '1.2', fontWeight: '600' }],
        'display-sm': ['24px', { lineHeight: '1.2', fontWeight: '600' }],
        'headline-md': ['20px', { lineHeight: '1.3', fontWeight: '600' }],
        'title-lg': ['18px', { lineHeight: '1.3', fontWeight: '600' }],
        'title-md': ['16px', { lineHeight: '1.4', fontWeight: '500' }],
        'body-lg': ['16px', { lineHeight: '1.5', fontWeight: '400' }],
        'body-md': ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        'label-lg': ['14px', { lineHeight: '1.4', fontWeight: '500' }],
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
        progress: {
          '0%': { width: '0%' },
          '100%': { width: '100%' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.5s ease forwards',
        fadeInUp: 'fadeInUp 0.5s ease forwards',
        slideUp: 'slideUp 0.3s ease-out',
        translationPopIn: 'translationPopIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        spin: 'spin 1s linear infinite',
        writing: 'writing 1.5s ease-in-out infinite',
        progress: 'progress 20s linear forwards',
      },
    },
  },
  plugins: [],
};

export default config;
