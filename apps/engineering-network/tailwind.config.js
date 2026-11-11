/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: 'var(--bg-canvas)',
          subtle: 'var(--bg-canvas-subtle)',
        },
        surface: {
          DEFAULT: 'var(--bg-surface)',
          subtle: 'var(--bg-surface-subtle)',
          hover: 'var(--bg-surface-hover)',
          active: 'var(--bg-surface-active)',
        },
        ink: {
          DEFAULT: 'var(--ink-primary)',
          primary: 'var(--ink-primary)',
          muted: 'var(--ink-muted)',
          faint: 'var(--ink-faint)',
          'on-accent': 'var(--ink-on-accent)',
        },
        hairline: 'var(--border-hairline)',
        'border-subtle': 'var(--border-subtle)',
        'border-strong': 'var(--border-strong)',
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          active: 'var(--accent-active)',
          subtle: 'var(--accent-subtle)',
          text: 'var(--accent-text)',
        },
        card: {
          bg: 'var(--card-bg)',
          border: 'var(--card-border)',
          hover: 'var(--card-hover)',
        },
        chip: {
          bg: 'var(--chip-bg)',
          text: 'var(--chip-text)',
          border: 'var(--chip-border)',
        },
        tag: {
          bg: 'var(--tag-bg)',
          text: 'var(--tag-text)',
        },
        input: {
          bg: 'var(--input-bg)',
          border: 'var(--input-border)',
          focus: 'var(--input-focus-border)',
        },
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        wiki: ['Charter', 'Georgia', 'Cambria', '"Times New Roman"', 'serif'],
        quote: ['"Songti SC"', 'SimSun', 'STSong', 'Charter', 'Georgia', 'serif'],
      }
    },
  },
  plugins: [],
}
