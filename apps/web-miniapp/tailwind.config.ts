import type { Config } from 'tailwindcss';

export default {
  content: [
    './src/**/*.{ts,tsx}',
    './node_modules/@ui-construction-library/core/dist/**/*.{js,mjs}',
  ],
  theme: {
    extend: {
      colors: {
        // Telegram theme tokens mapped to CSS vars set by the Mini App SDK
        tg: {
          bg: 'var(--tg-theme-bg-color)',
          text: 'var(--tg-theme-text-color)',
          hint: 'var(--tg-theme-hint-color)',
          link: 'var(--tg-theme-link-color)',
          button: 'var(--tg-theme-button-color)',
          'button-text': 'var(--tg-theme-button-text-color)',
          secondary: 'var(--tg-theme-secondary-bg-color)',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
