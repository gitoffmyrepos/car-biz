import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Modern vibrant orange + glossy black theme
        primary: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316', // Main vibrant orange
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
        orange: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316', // Vibrant orange
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
        glossy: {
          black: '#0a0a0a',
          dark: '#121212',
          darker: '#0d0d0d',
          light: '#1a1a1a',
          border: '#2a2a2a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-glossy': 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0a0a0a 100%)',
        'gradient-glossy-light': 'linear-gradient(135deg, #121212 0%, #1a1a1a 100%)',
        'gradient-orange': 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
        'gradient-orange-glow': 'linear-gradient(135deg, #fb923c 0%, #f97316 50%, #ea580c 100%)',
        'gradient-shine': 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)',
        'glossy-panel': 'linear-gradient(135deg, rgba(26, 26, 26, 0.8) 0%, rgba(18, 18, 18, 0.9) 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-in-out',
        'slide-up': 'slideUp 0.6s ease-out',
        'slide-down': 'slideDown 0.6s ease-out',
        'scale-in': 'scaleIn 0.4s ease-out',
        'shimmer': 'shimmer 2s infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        glow: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(249, 115, 22, 0.5)' },
          '50%': { boxShadow: '0 0 40px rgba(249, 115, 22, 0.8)' },
        },
      },
      boxShadow: {
        'glossy': '0 8px 32px rgba(0, 0, 0, 0.4)',
        'glossy-lg': '0 20px 60px rgba(0, 0, 0, 0.6)',
        'orange-glow': '0 10px 40px rgba(249, 115, 22, 0.4)',
        'orange-glow-lg': '0 20px 60px rgba(249, 115, 22, 0.5)',
        'inner-glossy': 'inset 0 2px 4px rgba(0, 0, 0, 0.3)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};

export default config;
